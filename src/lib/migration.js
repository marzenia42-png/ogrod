// Migracja addytywna — Etap 1.
//
// Cel: doposażyć istniejące custom plants w `speciesId` + `categoryId` na podstawie
// nazwy, BEZ usuwania jakichkolwiek danych użytkownika (zdjęć, notatek, wydarzeń,
// własnych pól). Idempotentna — można odpalać wielokrotnie bez efektu ubocznego.
//
// Strategia matchingu:
//   1) exact match (case + diacritics insensitive) nazwy rośliny vs PLANT_SPECIES[].name
//   2) jeśli nie ma — pozostaw bez speciesId (user uzupełni ręcznie albo pominie)
//
// Wywoływane raz przy starcie aplikacji (App.jsx useEffect na mount).

import { PLANT_SPECIES } from '../data/plantSpecies.js';

const CUSTOM_PLANTS_KEY = 'garden-custom-plants';
const MIGRATION_FLAG_KEY = 'garden-migration-v1-done';

function normalize(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics: ó→o, ł→l (handled below), ą→a, etc.
    .replace(/ł/g, 'l')               // ł nie ma diakrytyki w NFD — manualnie
    .trim();
}

// Pre-compute species lookup by normalized name for O(1) match.
function buildSpeciesIndex() {
  const idx = {};
  for (const s of PLANT_SPECIES) {
    idx[normalize(s.name)] = s;
  }
  return idx;
}

/**
 * Wykonaj migrację dla custom plants w localStorage.
 * Zwraca { migrated, matched, total } — diagnostyka dla logów/UI.
 */
export function migrateCustomPlantsV1() {
  let store;
  try {
    store = window.localStorage;
  } catch {
    return { migrated: 0, matched: 0, total: 0, skipped: 'no-storage' };
  }

  // Jeśli już zmigrowane — skip (idempotencja).
  if (store.getItem(MIGRATION_FLAG_KEY) === 'true') {
    return { migrated: 0, matched: 0, total: 0, skipped: 'already-done' };
  }

  let plants;
  try {
    const raw = store.getItem(CUSTOM_PLANTS_KEY);
    plants = raw ? JSON.parse(raw) : [];
  } catch {
    return { migrated: 0, matched: 0, total: 0, skipped: 'parse-error' };
  }

  if (!Array.isArray(plants) || plants.length === 0) {
    // Pusta lista — mark done żeby nie iterować na każdym mount.
    store.setItem(MIGRATION_FLAG_KEY, 'true');
    return { migrated: 0, matched: 0, total: 0, skipped: 'empty' };
  }

  const speciesIndex = buildSpeciesIndex();
  let matched = 0;
  let touched = 0;

  const updated = plants.map((p) => {
    // Nic nie nadpisuj — tylko dopełnij brakujące pola.
    if (p.speciesId && p.categoryId) return p;
    const species = speciesIndex[normalize(p.name)];
    if (!species) return p; // brak dopasowania — nie ruszamy
    matched += 1;
    touched += 1;
    return {
      ...p,
      speciesId: p.speciesId || species.id,
      categoryId: p.categoryId || species.categoryId,
    };
  });

  if (touched > 0) {
    try {
      store.setItem(CUSTOM_PLANTS_KEY, JSON.stringify(updated));
    } catch {
      // Quota exceeded — nie kasuj starych danych.
      return { migrated: 0, matched, total: plants.length, skipped: 'storage-full' };
    }
  }

  store.setItem(MIGRATION_FLAG_KEY, 'true');
  return { migrated: touched, matched, total: plants.length };
}

// Eksport flag dla testów — pozwala wymusić rerun.
export const _MIGRATION_FLAG_KEY = MIGRATION_FLAG_KEY;
