/**
 * main.js — application entry point
 * Wires together data loading, filtering, map, list, and modal.
 */
import { loadEvents } from './data-loader.js';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, filterEvents, sortByDate } from './filters.js';
import { initMap, renderMarkers, invalidateMapSize } from './map.js';

let allEvents = [];
let selectedCategories = CATEGORIES.map((c) => c.key);
let period = 'upcoming';
let currentView = 'map';

// ===== DOM refs =====
const categoryChipsEl = document.getElementById('category-chips');
const periodToggleEl = document.getElementById('period-toggle');
const resultCountEl = document.getElementById('result-count');
const footerCountEl = document.getElementById('footer-count');
const mapContainerEl = document.getElementById('map-container');
const listContainerEl = document.getElementById('list-container');
const mapLoadingEl = document.getElementById('map-loading');
const viewToggleEl = document.getElementById('view-toggle');
const modalOverlay = document.getElementById('modal-overlay');
const modalCard = document.getElementById('modal-card');

// ===== Init =====
async function init() {
  buildCategoryChips();
  buildPeriodToggle();
  buildViewToggle();
  setupModal();

  initMap();

  allEvents = await loadEvents();

  if (mapLoadingEl) {
    mapLoadingEl.classList.add('hidden');
  }

  applyFilters();
}

// ===== Category chips =====
function buildCategoryChips() {
  categoryChipsEl.innerHTML = '';
  for (const cat of CATEGORIES) {
    const chip = document.createElement('button');
    chip.className = 'category-chip active';
    chip.dataset.category = cat.key;
    chip.innerHTML = `<span class="chip-dot" style="background:${cat.color}"></span>${cat.label}`;
    chip.style.background = cat.color;
    chip.addEventListener('click', () => {
      if (selectedCategories.includes(cat.key)) {
        selectedCategories = selectedCategories.filter((c) => c !== cat.key);
        chip.classList.remove('active');
        chip.style.background = '';
        chip.style.color = '';
      } else {
        selectedCategories.push(cat.key);
        chip.classList.add('active');
        chip.style.background = cat.color;
        chip.style.color = '#fff';
      }
      applyFilters();
    });
    categoryChipsEl.appendChild(chip);
  }
}

// ===== Period toggle =====
function buildPeriodToggle() {
  const buttons = periodToggleEl.querySelectorAll('.period-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      period = btn.dataset.period;
      applyFilters();
    });
  });
}

// ===== View toggle =====
function buildViewToggle() {
  const buttons = viewToggleEl.querySelectorAll('.toggle-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      switchView();
    });
  });
}

function switchView() {
  if (currentView === 'map') {
    mapContainerEl.classList.remove('hidden');
    listContainerEl.classList.add('hidden');
    setTimeout(() => invalidateMapSize(), 100);
  } else {
    mapContainerEl.classList.add('hidden');
    listContainerEl.classList.remove('hidden');
    renderList();
  }
}

// ===== Apply filters =====
function applyFilters() {
  const filtered = filterEvents(allEvents, selectedCategories, period);
  const count = filtered.length;

  resultCountEl.textContent = `${count} événement${count > 1 ? 's' : ''}`;
  footerCountEl.textContent = count;

  if (currentView === 'map') {
    renderMarkers(filtered, openModal);
  } else {
    renderList();
  }
}

// ===== List view =====
function renderList() {
  const filtered = filterEvents(allEvents, selectedCategories, period);
  const sorted = sortByDate(filtered);

  listContainerEl.innerHTML = '';

  if (sorted.length === 0) {
    listContainerEl.innerHTML = `
      <div class="list-empty">
        <p>Aucun événement ne correspond à vos filtres.</p>
        <p>Essayez d'élargir vos critères de recherche.</p>
      </div>
    `;
    return;
  }

  for (const ev of sorted) {
    const card = document.createElement('button');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-card-strip" style="background:${CATEGORY_COLORS[ev.category]}"></div>
      <div class="event-card-body">
        <div class="event-card-header">
          <span class="event-card-badge" style="background:${CATEGORY_COLORS[ev.category]}">${CATEGORY_LABELS[ev.category]}</span>
          <span class="event-card-city">${ev.city}</span>
        </div>
        <h3 class="event-card-title">${ev.title}</h3>
        <p class="event-card-date">${formatDateLong(ev.date_start)}</p>
        <p class="event-card-desc">${ev.description}</p>
        ${ev.link ? '<span class="event-card-link">Plus d\'infos &rarr;</span>' : ''}
      </div>
    `;
    card.addEventListener('click', () => openModal(ev));
    listContainerEl.appendChild(card);
  }
}

// ===== Modal =====
function setupModal() {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(ev) {
  const dateEnd = ev.date_end
    ? `<p class="modal-date-end">Fin : ${formatDateLong(ev.date_end)}</p>`
    : '';
  const link = ev.link
    ? `<a href="${ev.link}" target="_blank" rel="noopener noreferrer" class="modal-link">Plus d'informations &rarr;</a>`
    : '';

  modalCard.innerHTML = `
    <div class="modal-strip" style="background:${CATEGORY_COLORS[ev.category]}"></div>
    <div class="modal-body">
      <div class="modal-header-row">
        <span class="modal-badge" style="background:${CATEGORY_COLORS[ev.category]}">${CATEGORY_LABELS[ev.category]}</span>
        <button class="modal-close" aria-label="Fermer">&times;</button>
      </div>
      <h2 class="modal-title">${ev.title}</h2>
      <div class="modal-meta">
        <p class="modal-date">${formatDateLong(ev.date_start)}</p>
        ${dateEnd}
        <p>${ev.city}</p>
      </div>
      <p class="modal-description">${ev.description}</p>
      ${link}
    </div>
  `;

  modalCard.querySelector('.modal-close').addEventListener('click', closeModal);
  modalOverlay.classList.remove('hidden');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalCard.innerHTML = '';
}

// ===== Helpers =====
function formatDateLong(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ===== Boot =====
init();
