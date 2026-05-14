// Kategorie roślin — finalna lista v6.2.
// Każda roślina (built-in + custom) ma `categoryId` = id z listy poniżej.
// Pozycja 0 = "all" — wirtualny folder zawierający wszystko (nie filtr w danych).

export const PLANT_CATEGORIES = [
  { id: 'all',           name: 'Wszystkie rośliny',           emoji: '🌱', accent: '#C9A96E' },
  { id: 'fruit-trees',   name: 'Drzewa owocowe',              emoji: '🍎', accent: '#E8A87C' },
  { id: 'fruit-shrubs',  name: 'Krzewy owocowe',              emoji: '🫐', accent: '#7B6CF6' },
  { id: 'garden-trees',  name: 'Drzewa ogrodowe',             emoji: '🌲', accent: '#5B8DB8' },
  { id: 'vegetables',    name: 'Warzywa, zioła i szklarnia',  emoji: '🥕', accent: '#56C596' },
  { id: 'ornamental',    name: 'Rośliny ozdobne i kwiaty',    emoji: '🌸', accent: '#E87CB3' },
  { id: 'indoor',        name: 'Rośliny domowe',              emoji: '🪴', accent: '#C9A96E' },
  { id: 'other',         name: 'Rośliny inne',                emoji: '🌿', accent: '#9B9B9B' },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  PLANT_CATEGORIES.map((c) => [c.id, c]),
);

// Legacy → new mapping. herbs/vegetables-greenhouse → vegetables. Unknown → other.
export const CATEGORY_REMAP = {
  'herbs': 'vegetables',
  'vegetables-greenhouse': 'vegetables',
};

// Real (non-virtual) categories — for grouping/migration.
export const REAL_CATEGORIES = PLANT_CATEGORIES.filter((c) => c.id !== 'all');
export const REAL_CATEGORY_IDS = new Set(REAL_CATEGORIES.map((c) => c.id));

// Map any category id to a valid one — handles legacy keys + unknowns.
export function normalizeCategoryId(id) {
  if (!id) return 'other';
  if (CATEGORY_REMAP[id]) return CATEGORY_REMAP[id];
  if (REAL_CATEGORY_IDS.has(id)) return id;
  return 'other';
}
