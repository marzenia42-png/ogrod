// Kategorie roślin dla flow "Dodaj roślinę" oraz grupowania w aplikacji.
// id stabilne — używane jako klucz w userPlants.categoryId oraz w plantSpecies.categoryId.

export const PLANT_CATEGORIES = [
  { id: 'fruit-trees',           name: 'Drzewa owocowe',              emoji: '🍎' },
  { id: 'fruit-shrubs',          name: 'Krzewy owocowe',              emoji: '🍇' },
  { id: 'garden-trees',          name: 'Drzewa ogród',                emoji: '🌳' },
  { id: 'vegetables',            name: 'Warzywa',                     emoji: '🥕' },
  { id: 'vegetables-greenhouse', name: 'Warzywa szklarnia',           emoji: '🍅' },
  { id: 'ornamental',            name: 'Rośliny ozdobne zewnętrzne',  emoji: '🌹' },
  { id: 'herbs',                 name: 'Zioła',                       emoji: '🌿' },
  { id: 'indoor',                name: 'Rośliny wewnętrzne',          emoji: '🪴' },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  PLANT_CATEGORIES.map((c) => [c.id, c]),
);
