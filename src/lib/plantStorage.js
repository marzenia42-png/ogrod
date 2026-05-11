// Per-plant data: photos + notes. Plant IDs can be:
//   - Built-in plant key (e.g. 'brzoskwinia')
//   - Custom plant id (uid)
//   - Variety id (uid)
// All share the same data shape — one record per plantId.

const PHOTO_PREFIX = 'garden-plant-photos-';
const NOTE_PREFIX = 'garden-plant-notes-';
const VARIETIES_KEY = 'garden-varieties';
const CUSTOM_RECIPES_KEY = 'garden-custom-recipes';

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
    target: (recipe.target || '').trim(),
    frequency: (recipe.frequency || '').trim(),
    steps: recipe.steps.map((s) => String(s).trim()).filter(Boolean),
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
