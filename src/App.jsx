import { useState, useEffect, useMemo } from 'react';
import Flora from './Flora.jsx';

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const MONTHS_SHORT = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

const TYPE_LABELS = {
  opryski: 'Opryski',
  cięcie: 'Cięcie',
  nawożenie: 'Nawożenie',
  sadzenie: 'Sadzenie',
  profilaktyka: 'Profilaktyka',
};

const TYPE_ORDER = ['opryski', 'cięcie', 'nawożenie', 'sadzenie', 'profilaktyka'];

const DEFAULT_PLANTS = [
  { key: 'brzoskwinia', name: 'Brzoskwinia' },
  { key: 'sliwa', name: 'Śliwa' },
  { key: 'jablon', name: 'Jabłoń' },
  { key: 'grusza', name: 'Grusza' },
  { key: 'porzeczka', name: 'Porzeczka' },
  { key: 'agrest', name: 'Agrest' },
  { key: 'borowka', name: 'Borówka amerykańska' },
  { key: 'truskawka', name: 'Truskawka' },
  { key: 'roza', name: 'Róża' },
  { key: 'hortensja', name: 'Hortensja' },
  { key: 'rododendron', name: 'Rododendron' },
  { key: 'magnolia', name: 'Magnolia' },
  { key: 'lawenda', name: 'Lawenda' },
  { key: 'iglaki', name: 'Iglaki' },
];

const DEFAULT_ACTIONS = [
  // Brzoskwinia
  { plant: 'brzoskwinia', month: 2, type: 'opryski', text: 'Oprysk preparatem miedziowym przed pąkowaniem (kędzierzawość liści)' },
  { plant: 'brzoskwinia', month: 2, type: 'cięcie', text: 'Cięcie formujące przed ruszeniem soków' },
  { plant: 'brzoskwinia', month: 3, type: 'opryski', text: 'Drugi oprysk miedziowy gdy pąki zaczynają nabrzmiewać' },
  { plant: 'brzoskwinia', month: 4, type: 'opryski', text: 'Po opadnięciu płatków: oprysk na mszyce i moniliozę' },
  { plant: 'brzoskwinia', month: 4, type: 'nawożenie', text: 'Nawożenie azotowe (saletra amonowa lub kompost)' },
  { plant: 'brzoskwinia', month: 6, type: 'profilaktyka', text: 'Przerzedzanie owoców (zostaw co 10–15 cm)' },
  { plant: 'brzoskwinia', month: 11, type: 'opryski', text: 'Oprysk miedziowy po opadnięciu liści' },
  { plant: 'brzoskwinia', month: 11, type: 'profilaktyka', text: 'Ściółkowanie korą wokół pnia' },

  // Śliwa
  { plant: 'sliwa', month: 2, type: 'cięcie', text: 'Cięcie sanitarne — usunięcie chorych i krzyżujących się gałęzi' },
  { plant: 'sliwa', month: 3, type: 'opryski', text: 'Oprysk miedziowy (rak bakteryjny, kędzierzawość)' },
  { plant: 'sliwa', month: 4, type: 'nawożenie', text: 'Nawożenie wczesnowiosenne (NPK)' },
  { plant: 'sliwa', month: 5, type: 'opryski', text: 'Oprysk przeciw owocówce śliwkóweczce po kwitnieniu' },
  { plant: 'sliwa', month: 6, type: 'opryski', text: 'Drugi oprysk insektycydowy (owocówka)' },
  { plant: 'sliwa', month: 10, type: 'opryski', text: 'Oprysk miedziowy po opadnięciu liści' },

  // Jabłoń
  { plant: 'jablon', month: 2, type: 'cięcie', text: 'Cięcie zimowe — prześwietlanie korony' },
  { plant: 'jablon', month: 3, type: 'opryski', text: 'Oprysk miedziowy zapobiegający parchowi' },
  { plant: 'jablon', month: 4, type: 'opryski', text: 'Faza różowego pąka — oprysk na mszyce i parch jabłoni' },
  { plant: 'jablon', month: 4, type: 'nawożenie', text: 'Nawożenie wieloskładnikowe (NPK + magnez)' },
  { plant: 'jablon', month: 5, type: 'opryski', text: 'Oprysk po opadnięciu płatków na owocówkę jabłkóweczkę' },
  { plant: 'jablon', month: 6, type: 'opryski', text: 'Profilaktyka parcha (fungicyd kontaktowy)' },
  { plant: 'jablon', month: 11, type: 'nawożenie', text: 'Oprysk mocznikiem 5% na opadłe liście (parch)' },
  { plant: 'jablon', month: 11, type: 'profilaktyka', text: 'Ściółkowanie i ochrona pni przed zającami' },

  // Grusza
  { plant: 'grusza', month: 2, type: 'cięcie', text: 'Cięcie formujące i prześwietlające' },
  { plant: 'grusza', month: 3, type: 'opryski', text: 'Oprysk miedziowy (rak, parch)' },
  { plant: 'grusza', month: 4, type: 'opryski', text: 'Oprysk na miodówkę gruszową i parch' },
  { plant: 'grusza', month: 5, type: 'nawożenie', text: 'Nawożenie wieloskładnikowe' },
  { plant: 'grusza', month: 11, type: 'profilaktyka', text: 'Ściółkowanie, sprzątanie opadłych liści (źródło parcha)' },

  // Porzeczka
  { plant: 'porzeczka', month: 2, type: 'cięcie', text: 'Cięcie odmładzające — wycięcie pędów starszych niż 4 lata' },
  { plant: 'porzeczka', month: 3, type: 'opryski', text: 'Oprysk siarczanem żelaza przeciw wielkopąkowcowi porzeczkowemu' },
  { plant: 'porzeczka', month: 4, type: 'nawożenie', text: 'Nawożenie wczesnowiosenne (NPK + obornik granulowany)' },
  { plant: 'porzeczka', month: 5, type: 'opryski', text: 'Oprysk fungicydem po kwitnieniu (mączniak, antraknoza)' },
  { plant: 'porzeczka', month: 9, type: 'cięcie', text: 'Cięcie sanitarne po owocowaniu' },

  // Agrest
  { plant: 'agrest', month: 2, type: 'cięcie', text: 'Cięcie odmładzające i prześwietlające' },
  { plant: 'agrest', month: 3, type: 'opryski', text: 'Oprysk siarkowy przeciw amerykańskiemu mącznikowi agrestu' },
  { plant: 'agrest', month: 5, type: 'opryski', text: 'Po kwitnieniu — oprysk fungicydem (mączniak)' },
  { plant: 'agrest', month: 5, type: 'nawożenie', text: 'Nawożenie potasowo-fosforowe' },

  // Borówka amerykańska
  { plant: 'borowka', month: 3, type: 'nawożenie', text: 'Nawożenie kwaśne (siarczan amonu) + zakwaszanie podłoża' },
  { plant: 'borowka', month: 4, type: 'cięcie', text: 'Cięcie sanitarne — usunięcie cienkich i starych pędów' },
  { plant: 'borowka', month: 4, type: 'profilaktyka', text: 'Ściółkowanie korą sosnową lub trocinami (pH < 5.5)' },
  { plant: 'borowka', month: 5, type: 'opryski', text: 'Profilaktyczny oprysk przeciw szarej pleśni' },
  { plant: 'borowka', month: 9, type: 'nawożenie', text: 'Drugie nawożenie kwaśne pod koniec sezonu' },

  // Truskawka
  { plant: 'truskawka', month: 3, type: 'cięcie', text: 'Usunięcie starych, suchych liści' },
  { plant: 'truskawka', month: 3, type: 'nawożenie', text: 'Wczesnowiosenne nawożenie NPK' },
  { plant: 'truskawka', month: 4, type: 'profilaktyka', text: 'Ściółkowanie słomą pod owoce' },
  { plant: 'truskawka', month: 5, type: 'opryski', text: 'Oprysk przeciw szarej pleśni i kwieciakowi' },
  { plant: 'truskawka', month: 7, type: 'cięcie', text: 'Po owocowaniu — przycięcie liści i rozłogów' },
  { plant: 'truskawka', month: 8, type: 'sadzenie', text: 'Optymalny termin sadzenia nowych rozsad' },
  { plant: 'truskawka', month: 9, type: 'nawożenie', text: 'Nawożenie potasowe (lepsze przezimowanie)' },

  // Róża
  { plant: 'roza', month: 3, type: 'cięcie', text: 'Cięcie wiosenne — herbatnie do 3–5 oczek, parkowe lekko' },
  { plant: 'roza', month: 3, type: 'sadzenie', text: 'Sadzenie róż z gołym korzeniem' },
  { plant: 'roza', month: 4, type: 'opryski', text: 'Oprysk profilaktyczny (mączniak, czarna plamistość)' },
  { plant: 'roza', month: 4, type: 'nawożenie', text: 'Nawożenie wieloskładnikowe dla róż' },
  { plant: 'roza', month: 5, type: 'opryski', text: 'Oprysk na mszyce i przędziorki' },
  { plant: 'roza', month: 6, type: 'opryski', text: 'Cykliczny oprysk przeciw chorobom grzybowym (co 10–14 dni)' },
  { plant: 'roza', month: 7, type: 'nawożenie', text: 'Letnie dokarmianie (granulowane) pod drugi rzut kwiatów' },
  { plant: 'roza', month: 10, type: 'cięcie', text: 'Cięcie sanitarne i skrócenie długich pędów' },
  { plant: 'roza', month: 10, type: 'sadzenie', text: 'Jesienne sadzenie róż doniczkowanych' },
  { plant: 'roza', month: 11, type: 'profilaktyka', text: 'Kopczykowanie podstaw przed mrozami' },

  // Hortensja
  { plant: 'hortensja', month: 3, type: 'cięcie', text: 'Bukietowe — mocne cięcie. Ogrodowe — tylko przekwitnięte kwiatostany' },
  { plant: 'hortensja', month: 4, type: 'nawożenie', text: 'Nawożenie zakwaszające (dla niebieskich — siarczan glinu)' },
  { plant: 'hortensja', month: 4, type: 'sadzenie', text: 'Wiosenne sadzenie z doniczki w półcień' },
  { plant: 'hortensja', month: 5, type: 'profilaktyka', text: 'Ściółkowanie korą — utrzymanie wilgoci' },
  { plant: 'hortensja', month: 7, type: 'nawożenie', text: 'Letnie dokarmianie pod kwitnienie' },
  { plant: 'hortensja', month: 11, type: 'profilaktyka', text: 'Okrycie podstawy korą i agrowłókniną' },

  // Rododendron
  { plant: 'rododendron', month: 3, type: 'nawożenie', text: 'Nawożenie kwaśne specjalistyczne (Azalka, Substral kwaśny)' },
  { plant: 'rododendron', month: 4, type: 'profilaktyka', text: 'Ściółkowanie korą sosnową (utrzymanie pH)' },
  { plant: 'rododendron', month: 4, type: 'sadzenie', text: 'Wiosenne sadzenie w półcień, w torf kwaśny' },
  { plant: 'rododendron', month: 5, type: 'profilaktyka', text: 'Usunięcie przekwitłych kwiatostanów (wykręcanie)' },
  { plant: 'rododendron', month: 9, type: 'nawożenie', text: 'Ostatnie nawożenie potasowe (lepsze zdrewnienie)' },
  { plant: 'rododendron', month: 11, type: 'profilaktyka', text: 'Osłona z chochołów lub agrowłókniny przed mrozem' },

  // Magnolia
  { plant: 'magnolia', month: 3, type: 'cięcie', text: 'Lekkie cięcie sanitarne (UWAGA: kwitnie na zeszłorocznym drewnie)' },
  { plant: 'magnolia', month: 4, type: 'nawożenie', text: 'Nawożenie azotowo-fosforowe' },
  { plant: 'magnolia', month: 4, type: 'sadzenie', text: 'Wiosenne sadzenie w żyzną, próchniczną glebę' },
  { plant: 'magnolia', month: 5, type: 'profilaktyka', text: 'Ściółkowanie korą wokół bryły korzeniowej' },
  { plant: 'magnolia', month: 11, type: 'profilaktyka', text: 'Okrycie świeżych nasadzeń korą' },

  // Lawenda
  { plant: 'lawenda', month: 4, type: 'cięcie', text: 'Cięcie wiosenne — 2/3 zeszłorocznego przyrostu, nie w stare drewno' },
  { plant: 'lawenda', month: 5, type: 'sadzenie', text: 'Sadzenie w słońcu, na przepuszczalnym podłożu z wapniem' },
  { plant: 'lawenda', month: 7, type: 'profilaktyka', text: 'Zbiór kwiatów na suszenie (pełnia kwitnienia)' },
  { plant: 'lawenda', month: 8, type: 'cięcie', text: 'Cięcie po kwitnieniu — uformowanie kulistej kępy' },
  { plant: 'lawenda', month: 11, type: 'profilaktyka', text: 'Lekkie okrycie gałązkami iglaków przed mrozem' },

  // Iglaki
  { plant: 'iglaki', month: 3, type: 'profilaktyka', text: 'Ściółkowanie korą sosnową, podlewanie po zimie' },
  { plant: 'iglaki', month: 4, type: 'nawożenie', text: 'Wiosenne nawożenie iglakowe (azotowe) — szybki start' },
  { plant: 'iglaki', month: 5, type: 'cięcie', text: 'Korekta kształtu (tuje, cyprysiki — przed nowymi przyrostami)' },
  { plant: 'iglaki', month: 6, type: 'opryski', text: 'Oprysk przeciw przędziorkom i rdzom' },
  { plant: 'iglaki', month: 8, type: 'nawożenie', text: 'Drugie nawożenie (potasowo-fosforowe pod zimę)' },
  { plant: 'iglaki', month: 9, type: 'sadzenie', text: 'Najlepszy termin sadzenia iglaków (cieplejsza gleba, wilgoć)' },
  { plant: 'iglaki', month: 11, type: 'profilaktyka', text: 'Sznurowanie tuj i jałowców kolumnowych przed śniegiem' },
];

const NOTES_KEY = 'garden-notes';
const CUSTOM_PLANTS_KEY = 'garden-custom-plants';
const REMOVED_PLANTS_KEY = 'garden-removed-plants';
const REMINDER_KEY = 'garden-reminders-shown';

function lsLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or blocked — silent no-op; in-memory state still works for this session.
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [notes, setNotes] = useState(() => lsLoad(NOTES_KEY, []));
  const [noteDraft, setNoteDraft] = useState('');
  const [customPlants, setCustomPlants] = useState(() => lsLoad(CUSTOM_PLANTS_KEY, []));
  const [removedPlants, setRemovedPlants] = useState(() => lsLoad(REMOVED_PLANTS_KEY, []));
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newPlantDraft, setNewPlantDraft] = useState({ name: '', month: currentMonth, type: 'opryski', text: '' });
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=49.83&longitude=19.94' +
      '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
      '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum' +
      '&timezone=Europe%2FWarsaw&forecast_days=2';
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setWeather(data))
      .catch((e) => setWeatherError(String(e)));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const removedSet = useMemo(() => new Set(removedPlants), [removedPlants]);

  const monthActions = useMemo(() => {
    const builtin = DEFAULT_ACTIONS
      .filter((a) => a.month === selectedMonth && !removedSet.has(a.plant))
      .map((a) => {
        const plant = DEFAULT_PLANTS.find((p) => p.key === a.plant);
        return { ...a, plantName: plant ? plant.name : a.plant, custom: false };
      });
    const custom = customPlants
      .filter((p) => p.month === selectedMonth)
      .map((p) => ({ plant: p.id, plantName: p.name, type: p.type, text: p.text, custom: true, id: p.id }));
    const all = [...builtin, ...custom];
    const grouped = {};
    for (const type of TYPE_ORDER) grouped[type] = [];
    for (const a of all) (grouped[a.type] || (grouped[a.type] = [])).push(a);
    return grouped;
  }, [selectedMonth, customPlants, removedSet]);

  const frostAlert = weather?.daily?.temperature_2m_min?.[0] != null && weather.daily.temperature_2m_min[0] <= 2;
  const humidityAlert = weather?.current?.relative_humidity_2m != null && weather.current.relative_humidity_2m >= 85;

  const handleAddNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    const note = { id: uid(), date: todayISO(), text };
    const next = [note, ...notes];
    setNotes(next);
    lsSave(NOTES_KEY, next);
    setNoteDraft('');
  };

  const handleDeleteNote = (id) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    lsSave(NOTES_KEY, next);
  };

  const handleAddCustomAction = () => {
    const name = newPlantDraft.name.trim();
    const text = newPlantDraft.text.trim();
    if (!name || !text) return;
    const entry = { id: uid(), name, month: Number(newPlantDraft.month), type: newPlantDraft.type, text };
    const next = [...customPlants, entry];
    setCustomPlants(next);
    lsSave(CUSTOM_PLANTS_KEY, next);
    setNewPlantDraft({ name: '', month: currentMonth, type: 'opryski', text: '' });
    setShowAddPlant(false);
    setToast('Dodano');
  };

  const handleDeleteCustom = (id) => {
    const next = customPlants.filter((p) => p.id !== id);
    setCustomPlants(next);
    lsSave(CUSTOM_PLANTS_KEY, next);
  };

  const handleRemoveBuiltin = (key) => {
    if (removedSet.has(key)) return;
    const next = [...removedPlants, key];
    setRemovedPlants(next);
    lsSave(REMOVED_PLANTS_KEY, next);
  };

  const handleRestoreBuiltin = (key) => {
    const next = removedPlants.filter((k) => k !== key);
    setRemovedPlants(next);
    lsSave(REMOVED_PLANTS_KEY, next);
  };

  const handleRestoreAll = () => {
    setRemovedPlants([]);
    lsSave(REMOVED_PLANTS_KEY, []);
    setToast('Przywrócono wszystkie rośliny');
  };

  const handleEnableNotif = async () => {
    if (typeof Notification === 'undefined') {
      setToast('Przeglądarka nie wspiera powiadomień');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm !== 'granted') return;
    const monthly = DEFAULT_ACTIONS
      .filter((a) => a.month === currentMonth && !removedSet.has(a.plant))
      .slice(0, 3);
    const last = localStorage.getItem(REMINDER_KEY);
    if (last === todayISO()) {
      setToast('Dzisiejsze przypomnienia już wysłane');
      return;
    }
    monthly.forEach((a, i) => {
      setTimeout(() => {
        const plant = DEFAULT_PLANTS.find((p) => p.key === a.plant);
        new Notification(`Ogród — ${TYPE_LABELS[a.type]}`, {
          body: `${plant?.name || a.plant}: ${a.text}`,
          icon: `${import.meta.env.BASE_URL}icon-192.png`,
          tag: `garden-${a.plant}-${a.month}-${i}`,
        });
      }, i * 1500);
    });
    localStorage.setItem(REMINDER_KEY, todayISO());
    setToast(`Włączone — ${monthly.length} przypomnień`);
  };

  const cardBg = 'var(--card-fill)';
  const cardBorder = '0.5px solid var(--card-border)';
  const gold = '#C9A96E';
  const cream = '#F0E8D8';

  return (
    <div className="relative min-h-svh flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="relative flex flex-col flex-1 max-w-lg mx-auto w-full pb-10">
        <header className="px-7 pt-12 pb-2">
          <p className="text-[11px] tracking-[3px] uppercase" style={{ color: 'rgba(201,169,110,0.5)' }}>
            Myślenice · 49.83°N 19.94°E
          </p>
          <h1 className="mt-1 font-serif italic tracking-wide leading-tight" style={{ fontSize: '38px', color: gold }}>
            Ogród Marzeń
          </h1>
          <p className="mt-1 text-[13px] font-serif italic" style={{ color: 'rgba(232,221,208,0.55)' }}>
            Twój kalendarz roślinny — miesiąc po miesiącu.
          </p>
        </header>

        <div className="px-7 pb-6">
          <div className="h-px w-16" style={{ background: 'linear-gradient(to right, rgba(201,169,110,0.6), transparent)' }} />
        </div>

        {/* Pogoda */}
        <section className="px-7 pb-6">
          <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(201,169,110,0.4)' }}>
            Pogoda
          </p>
          <div className="rounded-[16px] p-4" style={{ backgroundColor: cardBg, border: cardBorder }}>
            {!weather && !weatherError && (
              <p className="text-sm font-serif italic" style={{ color: 'rgba(232,221,208,0.45)' }}>Sprawdzam pogodę...</p>
            )}
            {weatherError && (
              <p className="text-sm font-serif italic" style={{ color: 'rgba(232,221,208,0.55)' }}>
                Nie udało się pobrać pogody. Sprawdź połączenie.
              </p>
            )}
            {weather && (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="font-serif tabular-nums" style={{ fontSize: '40px', fontWeight: 300, color: gold, lineHeight: 1 }}>
                    {Math.round(weather.current.temperature_2m)}°
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(232,221,208,0.55)' }}>
                    wilgotność {weather.current.relative_humidity_2m}% · wiatr {Math.round(weather.current.wind_speed_10m)} km/h
                  </span>
                </div>
                <div className="mt-2 text-[12px]" style={{ color: 'rgba(232,221,208,0.5)' }}>
                  Min {Math.round(weather.daily.temperature_2m_min[0])}° / Max {Math.round(weather.daily.temperature_2m_max[0])}°
                  {weather.daily.precipitation_sum[0] > 0 && ` · opady ${weather.daily.precipitation_sum[0]} mm`}
                </div>
                {(frostAlert || humidityAlert) && (
                  <div
                    className="mt-3 px-3 py-2 rounded-lg text-[12px] font-serif italic"
                    style={{ backgroundColor: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.35)', color: gold }}
                  >
                    {frostAlert && 'Mróz nocą — chroń wrażliwe rośliny (rododendron, brzoskwinia, magnolia). '}
                    {humidityAlert && 'Wysoka wilgotność — uwaga na grzyby (mączniak, monilioza). Przełóż opryski.'}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Miesiące */}
        <section className="px-7 pb-6">
          <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(201,169,110,0.4)' }}>
            Miesiąc
          </p>
          <div className="grid grid-cols-6 gap-2">
            {MONTHS_SHORT.map((m, i) => {
              const month = i + 1;
              const isSelected = month === selectedMonth;
              const isCurrent = month === currentMonth;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(month)}
                  className="py-2 rounded-lg text-[12px] tracking-wide cursor-pointer"
                  style={{
                    border: isSelected ? `1px solid ${gold}` : '0.5px solid var(--card-border)',
                    backgroundColor: isSelected ? 'rgba(201,169,110,0.12)' : 'transparent',
                    color: isSelected ? gold : isCurrent ? 'rgba(201,169,110,0.7)' : 'rgba(232,221,208,0.55)',
                    fontWeight: isSelected ? 500 : 400,
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </section>

        {/* Akcje miesiąca */}
        <section className="px-7 pb-8">
          <h2 className="font-serif italic mb-4" style={{ fontSize: '24px', color: gold }}>
            {MONTHS[selectedMonth - 1]}
          </h2>
          {TYPE_ORDER.map((type) => {
            const items = monthActions[type] || [];
            if (items.length === 0) return null;
            return (
              <div key={type} className="mb-5">
                <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(201,169,110,0.55)' }}>
                  {TYPE_LABELS[type]}
                </p>
                <div className="rounded-[14px] overflow-hidden" style={{ backgroundColor: cardBg, border: cardBorder }}>
                  {items.map((a, idx) => (
                    <div
                      key={`${a.plant}-${idx}`}
                      className="px-4 py-3 flex items-start gap-3"
                      style={{ borderTop: idx === 0 ? 'none' : '0.5px solid var(--card-border)' }}
                    >
                      <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(201,169,110,0.7)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] tracking-wide uppercase" style={{ color: 'rgba(201,169,110,0.75)' }}>
                          {a.plantName}
                          {a.custom && (
                            <span className="ml-2 text-[10px] normal-case" style={{ color: 'rgba(232,221,208,0.35)' }}>
                              własna
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'rgba(232,221,208,0.75)' }}>
                          {a.text}
                        </p>
                      </div>
                      {a.custom && (
                        <button
                          onClick={() => handleDeleteCustom(a.id)}
                          className="text-[18px] leading-none shrink-0 cursor-pointer"
                          style={{ color: 'rgba(232,221,208,0.3)', background: 'none', border: 'none', padding: 0 }}
                          aria-label="Usuń"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {TYPE_ORDER.every((t) => (monthActions[t] || []).length === 0) && (
            <p className="text-sm font-serif italic" style={{ color: 'rgba(232,221,208,0.4)' }}>
              Nic zaplanowanego w tym miesiącu — czas odpocząć.
            </p>
          )}
        </section>

        {/* Przypomnienia */}
        <section className="px-7 pb-8">
          <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(201,169,110,0.4)' }}>
            Przypomnienia
          </p>
          <div className="rounded-[16px] p-4 flex items-center justify-between gap-3" style={{ backgroundColor: cardBg, border: cardBorder }}>
            <p className="text-[13px] font-serif italic flex-1" style={{ color: 'rgba(232,221,208,0.7)' }}>
              {notifPermission === 'granted'
                ? 'Powiadomienia włączone. Pokażemy dziś akcje na bieżący miesiąc.'
                : notifPermission === 'denied'
                ? 'Powiadomienia zablokowane — włącz w ustawieniach przeglądarki.'
                : notifPermission === 'unsupported'
                ? 'Twoja przeglądarka nie wspiera powiadomień.'
                : 'Włącz, by dostawać przypomnienia o opryskach i cięciu.'}
            </p>
            <button
              onClick={handleEnableNotif}
              disabled={notifPermission === 'denied' || notifPermission === 'unsupported'}
              className="px-4 py-2 rounded-full text-[12px] tracking-wide cursor-pointer"
              style={{
                border: `1px solid ${gold}`,
                color: gold,
                background: 'transparent',
                opacity: notifPermission === 'denied' || notifPermission === 'unsupported' ? 0.4 : 1,
              }}
            >
              {notifPermission === 'granted' ? 'Wyślij teraz' : 'Włącz'}
            </button>
          </div>
        </section>

        {/* Notatki */}
        <section className="px-7 pb-8">
          <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(201,169,110,0.4)' }}>
            Notatki ogrodnika
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
              placeholder="Co dziś zauważyłeś..."
              className="flex-1 bg-transparent text-[13px] font-serif italic px-4 py-2.5 rounded-full outline-none"
              style={{ border: '1px solid var(--card-border)', color: 'rgba(232,221,208,0.75)' }}
            />
            <button
              onClick={handleAddNote}
              disabled={!noteDraft.trim()}
              className="px-4 rounded-full text-[12px] tracking-wide cursor-pointer"
              style={{ border: `1px solid ${gold}`, color: gold, background: 'transparent', opacity: noteDraft.trim() ? 1 : 0.4 }}
            >
              Dodaj
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-[13px] font-serif italic" style={{ color: 'rgba(232,221,208,0.35)' }}>
              Brak notatek. Pierwsza linijka — pierwszy krok.
            </p>
          ) : (
            <div className="rounded-[14px] overflow-hidden" style={{ backgroundColor: cardBg, border: cardBorder }}>
              {notes.map((n, idx) => (
                <div
                  key={n.id}
                  className="px-4 py-3 flex items-start gap-3"
                  style={{ borderTop: idx === 0 ? 'none' : '0.5px solid var(--card-border)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] tracking-wide" style={{ color: 'rgba(201,169,110,0.55)' }}>{n.date}</p>
                    <p className="mt-0.5 text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'rgba(232,221,208,0.75)' }}>
                      {n.text}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    className="text-[18px] leading-none shrink-0 cursor-pointer"
                    style={{ color: 'rgba(232,221,208,0.3)', background: 'none', border: 'none', padding: 0 }}
                    aria-label="Usuń notatkę"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Zarządzanie roślinami */}
        <section className="px-7 pb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] tracking-[2px] uppercase" style={{ color: 'rgba(201,169,110,0.4)' }}>
              Twoje rośliny
            </p>
            <button
              onClick={() => setShowManage((s) => !s)}
              className="text-[11px] tracking-wide cursor-pointer"
              style={{ color: gold, background: 'none', border: 'none', padding: 0 }}
            >
              {showManage ? 'Schowaj' : 'Zarządzaj'}
            </button>
          </div>

          {showManage && (
            <div className="rounded-[14px] p-3 mb-3" style={{ backgroundColor: cardBg, border: cardBorder }}>
              {DEFAULT_PLANTS.map((p) => {
                const removed = removedSet.has(p.key);
                return (
                  <div
                    key={p.key}
                    className="flex items-center justify-between py-2 px-1"
                    style={{ borderBottom: '0.5px solid rgba(201,169,110,0.1)' }}
                  >
                    <span
                      className="text-[13px] font-serif italic"
                      style={{ color: removed ? 'rgba(232,221,208,0.3)' : cream, textDecoration: removed ? 'line-through' : 'none' }}
                    >
                      {p.name}
                    </span>
                    {removed ? (
                      <button
                        onClick={() => handleRestoreBuiltin(p.key)}
                        className="text-[11px] tracking-wide cursor-pointer"
                        style={{ color: gold, background: 'none', border: 'none', padding: 0 }}
                      >
                        Przywróć
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemoveBuiltin(p.key)}
                        className="text-[16px] leading-none cursor-pointer"
                        style={{ color: 'rgba(232,221,208,0.4)', background: 'none', border: 'none', padding: 0 }}
                        aria-label={`Usuń ${p.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              {removedPlants.length > 0 && (
                <button
                  onClick={handleRestoreAll}
                  className="mt-3 w-full py-2 rounded-full text-[12px] cursor-pointer"
                  style={{ border: '0.5px solid var(--card-border)', color: gold, background: 'transparent' }}
                >
                  Przywróć wszystkie ({removedPlants.length})
                </button>
              )}
            </div>
          )}

          {!showAddPlant ? (
            <button
              onClick={() => setShowAddPlant(true)}
              className="w-full py-3 rounded-full text-[13px] tracking-wide cursor-pointer"
              style={{ border: '1px solid var(--card-border)', color: gold, background: 'transparent' }}
            >
              + Dodaj własną akcję
            </button>
          ) : (
            <div className="rounded-[14px] p-4 flex flex-col gap-3" style={{ backgroundColor: cardBg, border: cardBorder }}>
              <input
                type="text"
                value={newPlantDraft.name}
                onChange={(e) => setNewPlantDraft({ ...newPlantDraft, name: e.target.value })}
                placeholder="Nazwa rośliny (np. Winorośl)"
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid var(--card-border)', color: 'rgba(232,221,208,0.75)' }}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newPlantDraft.month}
                  onChange={(e) => setNewPlantDraft({ ...newPlantDraft, month: Number(e.target.value) })}
                  className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid var(--card-border)', color: 'rgba(232,221,208,0.75)' }}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={newPlantDraft.type}
                  onChange={(e) => setNewPlantDraft({ ...newPlantDraft, type: e.target.value })}
                  className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid var(--card-border)', color: 'rgba(232,221,208,0.75)' }}
                >
                  {TYPE_ORDER.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={newPlantDraft.text}
                onChange={(e) => setNewPlantDraft({ ...newPlantDraft, text: e.target.value })}
                placeholder="Co zrobić..."
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid var(--card-border)', color: 'rgba(232,221,208,0.75)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddPlant(false); setNewPlantDraft({ name: '', month: currentMonth, type: 'opryski', text: '' }); }}
                  className="flex-1 py-2 rounded-full text-[12px] cursor-pointer"
                  style={{ border: '0.5px solid var(--card-border)', color: 'rgba(232,221,208,0.7)', background: 'transparent' }}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddCustomAction}
                  disabled={!newPlantDraft.name.trim() || !newPlantDraft.text.trim()}
                  className="flex-1 py-2 rounded-full text-[12px] cursor-pointer"
                  style={{
                    backgroundColor: gold,
                    color: '#1A1208',
                    border: 'none',
                    opacity: newPlantDraft.name.trim() && newPlantDraft.text.trim() ? 1 : 0.4,
                  }}
                >
                  Zapisz
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className="px-7 pt-4 pb-6">
          <p className="text-[10px] tracking-[2px] uppercase text-center" style={{ color: 'rgba(232,221,208,0.25)' }}>
            Dane lokalnie · localStorage
          </p>
        </footer>
      </div>

      <Flora notes={notes} weather={weather} currentMonth={currentMonth} />

      {toast && (
        <div
          className="fixed bottom-8 left-1/2 z-50 px-4 py-2 rounded-full text-xs"
          style={{
            transform: 'translateX(-50%)',
            backgroundColor: '#1A1208',
            border: '1px solid rgba(201,169,110,0.4)',
            color: gold,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
