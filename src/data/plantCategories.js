// Kategorie roślin dla flow "Dodaj roślinę" oraz grupowania w aplikacji.
// id stabilne — używane jako klucz w userPlants.categoryId oraz w plantSpecies.categoryId.
// accent — kolor akcentu SVG/karty (v6 redesign).

export const PLANT_CATEGORIES = [
  { id: 'fruit-trees',           name: 'Drzewa owocowe',              emoji: '🍎', accent: '#E8A87C' },
  { id: 'fruit-shrubs',          name: 'Krzewy owocowe',              emoji: '🫐', accent: '#7B6CF6' },
  { id: 'vegetables',            name: 'Warzywa',                     emoji: '🥕', accent: '#56C596' },
  { id: 'vegetables-greenhouse', name: 'Warzywa szklarnia',           emoji: '🍅', accent: '#E54B4B' },
  { id: 'ornamental',            name: 'Rośliny ozdobne',             emoji: '🌹', accent: '#E87CB3' },
  { id: 'herbs',                 name: 'Zioła',                       emoji: '🌿', accent: '#78C47E' },
  { id: 'garden-trees',          name: 'Drzewa ogrodowe',             emoji: '🌲', accent: '#5B8DB8' },
  { id: 'indoor',                name: 'Rośliny domowe',              emoji: '🪴', accent: '#C9A96E' },
  { id: 'other',                 name: 'Inne',                        emoji: '➕', accent: '#9B9B9B' },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  PLANT_CATEGORIES.map((c) => [c.id, c]),
);
