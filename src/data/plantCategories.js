// Kategorie roślin — v6.5 (8 kategorii realnych + 'all' wirtualny na końcu).
// Zdjęcia tła importowane przez Vite (statyczne, hashowane URL).
// 'all' i 'other' nie mają zdjęć — używają gradientu jako fallback.

import fruitTreesBg from '../assets/categories/fruit-trees.webp';
import fruitShrubsBg from '../assets/categories/fruit-shrubs.webp';
import gardenTreesBg from '../assets/categories/garden-trees.webp';
import conifersBg from '../assets/categories/conifers.webp';
import vegetablesBg from '../assets/categories/vegetables.webp';
import ornamentalBg from '../assets/categories/ornamental.webp';
import indoorBg from '../assets/categories/indoor.webp';

export const PLANT_CATEGORIES = [
  { id: 'fruit-trees',   name: 'Drzewa owocowe',      emoji: '🍎', accent: '#E8A87C', image: fruitTreesBg },
  { id: 'fruit-shrubs',  name: 'Krzewy owocowe',      emoji: '🫐', accent: '#7B6CF6', image: fruitShrubsBg },
  { id: 'garden-trees',  name: 'Drzewa ogrodowe',     emoji: '🌳', accent: '#5B8DB8', image: gardenTreesBg },
  { id: 'conifers',      name: 'Iglaki',              emoji: '🌲', accent: '#4A7C59', image: conifersBg },
  { id: 'vegetables',    name: 'Warzywa i zioła',     emoji: '🥕', accent: '#56C596', image: vegetablesBg },
  { id: 'ornamental',    name: 'Rośliny ozdobne i kwiaty', emoji: '🌸', accent: '#E87CB3', image: ornamentalBg },
  { id: 'indoor',        name: 'Rośliny domowe',      emoji: '🪴', accent: '#C9A96E', image: indoorBg },
  { id: 'other',         name: 'Rośliny inne',        emoji: '🌿', accent: '#9B9B9B', image: null },
  { id: 'all',           name: 'Wszystkie rośliny',   emoji: '🌱', accent: '#C9A96E', image: null },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  PLANT_CATEGORIES.map((c) => [c.id, c]),
);

// herbs/vegetables-greenhouse zostają zmapowane na 'vegetables'.
// 'iglaki' (legacy key) → 'conifers' (nowa kategoria).
export const CATEGORY_REMAP = {
  'herbs': 'vegetables',
  'vegetables-greenhouse': 'vegetables',
};

export const REAL_CATEGORIES = PLANT_CATEGORIES.filter((c) => c.id !== 'all');
export const REAL_CATEGORY_IDS = new Set(REAL_CATEGORIES.map((c) => c.id));

export function normalizeCategoryId(id) {
  if (!id) return 'other';
  if (CATEGORY_REMAP[id]) return CATEGORY_REMAP[id];
  if (REAL_CATEGORY_IDS.has(id)) return id;
  return 'other';
}
