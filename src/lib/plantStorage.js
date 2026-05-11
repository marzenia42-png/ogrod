// Per-plant data: photos + notes. Plant IDs can be:
//   - Built-in plant key (e.g. 'brzoskwinia')
//   - Custom plant id (uid)
//   - Variety id (uid)
// All share the same data shape — one record per plantId.
//
// ── Schemat userPlants (garden-custom-plants) — Etap 1+ ──
// Każda roślina to obiekt:
//   {
//     id:         string,            // uid
//     name:       string,             // wyświetlana nazwa (z gatunku lub własna)
//     variety?:   string,             // opcjonalna odmiana (np. "Cherry", "New Dawn")
//     speciesId?: string | null,      // id z plantSpecies.js, lub null gdy "Inne"
//     categoryId?: string,            // id z plantCategories.js (fruit-trees, vegetables, ...)
//     location?:  string,             // opcjonalna lokalizacja ("Sad", "Balkon", "Działka")
//     months:     number[],           // miesiące aktywne (1-12)
//     type:       string,             // kategoria akcji: chemia/naturalny/nawozenie/ciecie/ochrona
//     text:       string,             // opis akcji (lub nazwa rośliny w trybie quick-add)
//   }
// Stare pola (name, variety, months, type, text) zostają dla wstecznej
// kompatybilności. Nowe pola (speciesId, categoryId, location) są opcjonalne —
// gdy obecne, kalendarz może rysować z plantSpecies.calendarTasks zamiast text.

const PHOTO_PREFIX = 'garden-plant-photos-';
const NOTE_PREFIX = 'garden-plant-notes-';
const EVENT_PREFIX = 'garden-plant-events-';
const VARIETIES_KEY = 'garden-varieties';
const CUSTOM_RECIPES_KEY = 'garden-custom-recipes';

export const PHOTO_LIMIT = 3;
export const EVENT_TYPES = [
  { key: 'podlano',      label: 'Podlano',      icon: '💧' },
  { key: 'nawiezono',    label: 'Nawieziono',   icon: '🪴' },
  { key: 'oprysknieto',  label: 'Oprysknięto',  icon: '🧴' },
  { key: 'przyciecie',   label: 'Cięcie',       icon: '✂️' },
  { key: 'sadzenie',     label: 'Sadzenie',     icon: '🌱' },
  { key: 'zbior',        label: 'Zbiór',        icon: '🌾' },
  { key: 'inne',         label: 'Inne',         icon: '📝' },
];

function safeParse(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function ls() {
  try { return window.localStorage; } catch { return null; }
}

function readArray(key) {
  const store = ls();
  if (!store) return [];
  return safeParse(store.getItem(key), []);
}

function writeArray(key, value) {
  const store = ls();
  if (!store) return false;
  try { store.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

// Photos — array of { id, dataUrl, date }
export function loadPhotos(plantId) {
  return readArray(PHOTO_PREFIX + plantId);
}

export function addPhoto(plantId, dataUrl) {
  const photos = loadPhotos(plantId);
  if (photos.length >= PHOTO_LIMIT) {
    throw new Error(`Maksymalnie ${PHOTO_LIMIT} zdjęć na roślinę. Usuń jedno żeby dodać nowe.`);
  }
  const photo = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dataUrl,
    date: new Date().toISOString().slice(0, 10),
  };
  const next = [photo, ...photos];
  return writeArray(PHOTO_PREFIX + plantId, next) ? next : photos;
}

export function deletePhoto(plantId, photoId) {
  const next = loadPhotos(plantId).filter((p) => p.id !== photoId);
  writeArray(PHOTO_PREFIX + plantId, next);
  return next;
}

// Notes — array of { id, date, text }
export function loadPlantNotes(plantId) {
  return readArray(NOTE_PREFIX + plantId);
}

export function addPlantNote(plantId, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return loadPlantNotes(plantId);
  const note = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString().slice(0, 10),
    text: trimmed,
  };
  const next = [note, ...loadPlantNotes(plantId)];
  return writeArray(NOTE_PREFIX + plantId, next) ? next : [];
}

export function deletePlantNote(plantId, noteId) {
  const next = loadPlantNotes(plantId).filter((n) => n.id !== noteId);
  writeArray(NOTE_PREFIX + plantId, next);
  return next;
}

// Events — per-plant log of garden actions { id, type, date, note }
export function loadEvents(plantId) {
  return readArray(EVENT_PREFIX + plantId);
}

export function addEvent(plantId, type, note = '') {
  const knownTypes = new Set(EVENT_TYPES.map((t) => t.key));
  const safeType = knownTypes.has(type) ? type : 'inne';
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: safeType,
    date: new Date().toISOString().slice(0, 10),
    note: (note || '').trim(),
  };
  const next = [event, ...loadEvents(plantId)];
  return writeArray(EVENT_PREFIX + plantId, next) ? next : [];
}

export function deleteEvent(plantId, eventId) {
  const next = loadEvents(plantId).filter((e) => e.id !== eventId);
  writeArray(EVENT_PREFIX + plantId, next);
  return next;
}

// Varieties — flat array of { id, parent, name, addedAt }
export function loadVarieties() {
  return readArray(VARIETIES_KEY);
}

export function loadVarietiesFor(parentId) {
  return loadVarieties().filter((v) => v.parent === parentId);
}

export function addVariety(parentId, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return loadVarieties();
  const variety = {
    id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    parent: parentId,
    name: trimmed,
    addedAt: new Date().toISOString().slice(0, 10),
  };
  const next = [...loadVarieties(), variety];
  writeArray(VARIETIES_KEY, next);
  return next;
}

export function deleteVariety(varietyId) {
  const next = loadVarieties().filter((v) => v.id !== varietyId);
  writeArray(VARIETIES_KEY, next);
  // Drop the variety's own photos and notes too.
  const store = ls();
  if (store) {
    try {
      store.removeItem(PHOTO_PREFIX + varietyId);
      store.removeItem(NOTE_PREFIX + varietyId);
    } catch { /* ignore */ }
  }
  return next;
}

// Custom recipes
export function loadCustomRecipes() {
  return readArray(CUSTOM_RECIPES_KEY);
}

export function addCustomRecipe(recipe) {
  if (!recipe || !recipe.name || !Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    return loadCustomRecipes();
  }
  const entry = {
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: recipe.name.trim(),
    type: recipe.type || 'inny',
    target: (recipe.target || '').trim(),
    appliesTo: (recipe.appliesTo || '').trim(),
    frequency: (recipe.frequency || '').trim(),
    steps: recipe.steps.map((s) => String(s).trim()).filter(Boolean),
    photoData: recipe.photoData || null,
    custom: true,
  };
  const next = [...loadCustomRecipes(), entry];
  writeArray(CUSTOM_RECIPES_KEY, next);
  return next;
}

export function deleteCustomRecipe(recipeId) {
  const next = loadCustomRecipes().filter((r) => r.id !== recipeId);
  writeArray(CUSTOM_RECIPES_KEY, next);
  return next;
}

// Image compression (canvas-based) for photo upload + bg upload reuse.
export async function compressImage(file, maxDim = 1280, quality = 0.72) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    throw new Error('Nie obraz');
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
