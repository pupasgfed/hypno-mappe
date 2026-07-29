/**
 * map.js — Leaflet map initialization, marker clustering, popups
 */
import { CATEGORY_COLORS, CATEGORY_LABELS } from './filters.js';

let map = null;
let clusterGroup = null;

export function initMap() {
  map = L.map('map', {
    center: [46.6034, 1.8883],
    zoom: 6,
    scrollWheelZoom: true,
  zoomControl: true,
  minZoom: 4,
    maxZoom: 18,
  maxBounds: [
    [40, -6],
      [52, 12],
    ],
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  clusterGroup = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
  });
  clusterGroup.addTo(map);

  setTimeout(() => map.invalidateSize(), 200);

  return map;
}

function createCategoryIcon(category) {
  const color = CATEGORY_COLORS[category];
  return L.divIcon({
    html: `<span style="
      background-color: ${color};
      width: 22px;
      height: 22px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: block;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></span>`,
    className: 'hypno-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildPopupHtml(ev) {
  const linkHtml = ev.link
    ? `<a href="${escapeHtml(ev.link)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:600;text-decoration:none;">Plus d'infos &rarr;</a>`
    : '';
  return `
    <div style="min-width:220px;max-width:260px;">
      <div style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;color:#fff;background:${CATEGORY_COLORS[ev.category]};margin-bottom:6px;">
        ${CATEGORY_LABELS[ev.category]}
      </div>
      <div style="font-weight:700;font-size:15px;line-height:1.3;margin-bottom:4px;color:#111827;">
        ${escapeHtml(ev.title)}
      </div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">
        ${formatDate(ev.date_start)}
      </div>
      <div style="font-size:12px;color:#374151;margin-bottom:4px;">
        ${escapeHtml(ev.city)}
      </div>
      <div style="font-size:13px;color:#4b5563;line-height:1.4;margin-bottom:8px;">
        ${escapeHtml(ev.description)}
      </div>
      ${linkHtml}
    </div>
  `;
}

export function renderMarkers(events, onSelectCallback) {
  if (!clusterGroup) return;

  clusterGroup.clearLayers();

  const markers = [];
  for (const ev of events) {
    const marker = L.marker([ev.lat, ev.lng], {
      icon: createCategoryIcon(ev.category),
    });
    marker.bindPopup(buildPopupHtml(ev));
    if (onSelectCallback) {
      marker.on('click', () => onSelectCallback(ev));
    }
    markers.push(marker);
  }
  clusterGroup.addLayers(markers);
}

export function invalidateMapSize() {
  if (map) {
    map.invalidateSize();
  }
}
