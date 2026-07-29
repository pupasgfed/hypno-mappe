/**
 * data-loader.js — fetch and parse the compiled events.geojson
 * Filters out draft events. Returns an array of event objects.
 */

export async function loadEvents() {
  try {
    const res = await fetch('/data/events.geojson');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const geojson = await res.json();

    if (!geojson.features || !Array.isArray(geojson.features)) {
      throw new Error('Invalid GeoJSON: missing features array');
    }

    return geojson.features
      .filter((f) => f.properties && f.properties.status !== 'draft')
      .map((f) => ({
        id: f.properties.id,
        title: f.properties.title,
        category: f.properties.category,
        date_start: f.properties.date_start,
        date_end: f.properties.date_end,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        city: f.properties.city,
        description: f.properties.description,
        link: f.properties.link,
        status: f.properties.status,
      }));
  } catch (err) {
    console.error('Failed to load events:', err);
    return [];
  }
}
