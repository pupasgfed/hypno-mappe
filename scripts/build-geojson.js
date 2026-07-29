#!/usr/bin/env node

/**
 * build-geojson.js
 *
 * Reads all /data/events/*.json source files, validates each against
 * /data/schema.json, transforms each into a GeoJSON Feature
 * (geometry.coordinates = [lng, lat], remaining fields under properties),
 * and assembles a FeatureCollection written to /data/events.geojson.
 *
 * Usage:
 *   node scripts/build-geojson.js
 *
 * Exits with code 1 if any source file fails validation.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const EVENTS_DIR = join(root, 'data', 'events');
const SCHEMA_PATH = join(root, 'data', 'schema.json');
const OUTPUT_PATH = join(root, 'data', 'events.geojson');

// ===== Simple schema validator (no external deps) =====

function validateEvent(event, schema) {
  const errors = [];

  // Check required fields
  for (const field of schema.required) {
    if (!(field in event) || event[field] === undefined) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // Type checks for present fields
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (!(key in event)) continue;
    const value = event[key];

    if (value === null) {
      if (propSchema.type && !propSchema.type.includes('null')) {
        errors.push(`Field "${key}" cannot be null`);
      }
      continue;
    }

    const expectedTypes = Array.isArray(propSchema.type)
      ? propSchema.type
      : [propSchema.type];

    const actualType = typeof value;
    const typeOk = expectedTypes.some((t) => {
      if (t === 'string') return actualType === 'string';
      if (t === 'number') return actualType === 'number' && !isNaN(value);
      if (t === 'null') return value === null;
      return false;
    });

    if (!typeOk) {
      errors.push(`Field "${key}" must be ${expectedTypes.join(' or ')}, got ${actualType}`);
      continue;
    }

    // Enum check
    if (propSchema.enum && !propSchema.enum.includes(value)) {
      errors.push(`Field "${key}" must be one of: ${propSchema.enum.join(', ')}`);
    }

    // String constraints
    if (actualType === 'string') {
      if (propSchema.minLength !== undefined && value.length < propSchema.minLength) {
        errors.push(`Field "${key}" must be at least ${propSchema.minLength} characters`);
      }
      if (propSchema.maxLength !== undefined && value.length > propSchema.maxLength) {
        errors.push(`Field "${key}" must be at most ${propSchema.maxLength} characters`);
      }
    }

    // Number constraints
    if (actualType === 'number') {
      if (propSchema.minimum !== undefined && value < propSchema.minimum) {
        errors.push(`Field "${key}" must be >= ${propSchema.minimum}`);
      }
      if (propSchema.maximum !== undefined && value > propSchema.maximum) {
        errors.push(`Field "${key}" must be <= ${propSchema.maximum}`);
      }
    }
  }

  // Check for unexpected fields
  const allowedFields = Object.keys(schema.properties);
  for (const key of Object.keys(event)) {
    if (!allowedFields.includes(key)) {
      errors.push(`Unexpected field: "${key}"`);
    }
  }

  // Custom validation: date_end must be after date_start when both exist
  if (event.date_start && event.date_end) {
    const start = new Date(event.date_start);
    const end = new Date(event.date_end);
    if (start >= end) {
      errors.push('date_end must be strictly after date_start');
    }
  }

  // Custom validation: date_start must be a valid ISO 8601 date
  if (event.date_start) {
    const d = new Date(event.date_start);
    if (isNaN(d.getTime())) {
      errors.push('date_start is not a valid ISO 8601 date');
    }
  }
  if (event.date_end) {
    const d = new Date(event.date_end);
    if (isNaN(d.getTime())) {
      errors.push('date_end is not a valid ISO 8601 date');
    }
  }

  return errors;
}

// ===== Main =====

function main() {
  // Load schema
  if (!existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));

  // List event files
  if (!existsSync(EVENTS_DIR)) {
    console.error(`Events directory not found: ${EVENTS_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(EVENTS_DIR)
    .filter((f) => extname(f) === '.json')
    .sort();

  if (files.length === 0) {
    console.warn('Warning: no event files found in /data/events/');
  }

  const features = [];
  const seenIds = new Set();
  let hasErrors = false;

  for (const file of files) {
    const filePath = join(EVENTS_DIR, file);
    const raw = readFileSync(filePath, 'utf-8');

    let event;
    try {
      event = JSON.parse(raw);
    } catch (e) {
      console.error(`✗ ${file}: Invalid JSON — ${e.message}`);
      hasErrors = true;
      continue;
    }

    const errors = validateEvent(event, schema);

    // Check for duplicate IDs
    if (event.id) {
      if (seenIds.has(event.id)) {
        errors.push(`Duplicate id: "${event.id}"`);
      } else {
        seenIds.add(event.id);
      }
    }

    if (errors.length > 0) {
      console.error(`✗ ${file}:`);
      for (const err of errors) {
        console.error(`  - ${err}`);
      }
      hasErrors = true;
      continue;
    }

    // Transform to GeoJSON Feature
    const { lat, lng, ...properties } = event;
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      properties: { ...properties },
    };
    features.push(feature);
    console.log(`✓ ${file}`);
  }

  if (hasErrors) {
    console.error('\nBuild failed: validation errors found.');
    process.exit(1);
  }

  const geojson = {
    type: 'FeatureCollection',
    features: features,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(geojson, null, 2) + '\n', 'utf-8');
  console.log(`\nBuilt ${features.length} features → ${OUTPUT_PATH.replace(root, '')}`);
}

main();
