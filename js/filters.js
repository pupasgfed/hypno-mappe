/**
 * filters.js — category and period filtering logic
 */

export const CATEGORIES = [
  { key: 'atelier', label: 'Atelier', color: '#2563eb' },
  { key: 'sortie', label: 'Sortie', color: '#059669' },
  { key: 'spectacle', label: 'Spectacle', color: '#d97706' },
  { key: 'autre', label: 'Autre', color: '#6b7280' },
];

export const CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.color])
);

export const CATEGORY_LABELS = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);

/**
 * @param {Array} events — all published events
 * @param {string[]} selectedCategories — active category keys
 * @param {string} period — 'upcoming' | 'week' | 'month'
 * @returns {Array} filtered events
 */
export function filterEvents(events, selectedCategories, period) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return events.filter((ev) => {
    if (!selectedCategories.includes(ev.category)) return false;

    const eventDate = new Date(ev.date_start);

    if (period === 'upcoming') {
      return eventDate >= now;
    }
    if (period === 'week') {
      return eventDate >= startOfWeek && eventDate < endOfWeek;
    }
    if (period === 'month') {
      return eventDate >= startOfMonth && eventDate < endOfMonth;
    }
    return true;
  });
}

/**
 * @param {Array} events
 * @returns {Array} events sorted by date_start ascending
 */
export function sortByDate(events) {
  return [...events].sort(
    (a, b) => new Date(a.date_start) - new Date(b.date_start)
  );
}
