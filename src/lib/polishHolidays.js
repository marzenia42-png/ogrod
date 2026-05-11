// Polskie święta państwowe — stałe daty + ruchome powiązane z Wielkanocą.
// Algorytm Meeus/Jones/Butcher dla Wielkanocy Gregoriańskiej (Kościół rzymskokatolicki, PL).

function pad(n) { return n < 10 ? `0${n}` : String(n); }

function fmt(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Cache per year — algorytm jest deterministyczny, nie ma sensu liczyć ponownie.
const cache = new Map();

export function getHolidays(year) {
  if (cache.has(year)) return cache.get(year);

  const easter = easterSunday(year);
  const easterMonday = addDays(easter, 1);
  const pentecost = addDays(easter, 49);    // Zielone Świątki — 7 niedziel po Wielkanocy
  const corpusChristi = addDays(easter, 60); // Boże Ciało — czwartek po Trójcy Świętej

  const holidays = {
    [`${year}-01-01`]:    'Nowy Rok',
    [`${year}-01-06`]:    'Trzech Króli',
    [fmt(easter)]:        'Wielkanoc',
    [fmt(easterMonday)]:  'Poniedziałek Wielkanocny',
    [`${year}-05-01`]:    'Święto Pracy',
    [`${year}-05-03`]:    'Konstytucja 3 Maja',
    [fmt(pentecost)]:     'Zielone Świątki',
    [fmt(corpusChristi)]: 'Boże Ciało',
    [`${year}-08-15`]:    'Wniebowzięcie NMP',
    [`${year}-11-01`]:    'Wszystkich Świętych',
    [`${year}-11-11`]:    'Święto Niepodległości',
    [`${year}-12-25`]:    'Boże Narodzenie',
    [`${year}-12-26`]:    'Drugi dzień Bożego Narodzenia',
  };

  cache.set(year, holidays);
  return holidays;
}

// Wygodny helper — zwraca nazwę święta dla konkretnej daty, lub null.
export function holidayName(year, month, day, holidays) {
  const map = holidays || getHolidays(year);
  return map[`${year}-${pad(month)}-${pad(day)}`] || null;
}
