import { useState, useEffect, useMemo, useRef } from 'react';
import Flora from './Flora.jsx';
import Recipes from './Recipes.jsx';
import Diary from './Diary.jsx';
import PlantDetail from './PlantDetail.jsx';
import AddPlantWizard from './AddPlantWizard.jsx';
import { compressImage, addPhoto } from './lib/plantStorage.js';
import { migrateCustomPlantsV1 } from './lib/migration.js';
import { MONTHS, MONTHS_SHORT, CATEGORIES, CATEGORY_BY_KEY, PLANTS, ACTIONS } from './data/plants.js';
import { SPECIES_BY_ID } from './data/plantSpecies.js';

// Migracja v1: doposaż istniejące custom plants w speciesId+categoryId po nazwie.
// Idempotentna, side-effect free dla nowych userów. Bezpieczna w SSR (guard window).
if (typeof window !== 'undefined') {
  try { migrateCustomPlantsV1(); } catch (e) { console.warn('Migration v1 skipped:', e); }
}

const NOTES_KEY = 'garden-notes';
const CUSTOM_PLANTS_KEY = 'garden-custom-plants';
const REMOVED_PLANTS_KEY = 'garden-removed-plants';
const REMINDER_KEY = 'garden-reminders-shown';
const BG_KEY = 'garden-bg';
const LOCATION_KEY = 'garden-location';
const DEFAULT_BG = `${import.meta.env.BASE_URL}garden-bg.jpg`;
const FALLBACK_LOCATION = { lat: 49.8297, lon: 19.9373, label: 'Myślenice', source: 'fallback' };

// WMO weather code → emoji + label. Reference: open-meteo.com/en/docs (code subset).
function wmoIconAndLabel(code) {
  if (code == null) return { icon: '·', label: '' };
  if (code === 0) return { icon: '☀️', label: 'słonecznie' };
  if (code <= 2) return { icon: '🌤️', label: 'częściowo słonecznie' };
  if (code === 3) return { icon: '☁️', label: 'pochmurno' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'mgła' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'mżawka' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'deszcz' };
  if (code >= 71 && code <= 77) return { icon: '❄️', label: 'śnieg' };
  if (code >= 80 && code <= 82) return { icon: '🌧️', label: 'przelotny deszcz' };
  if (code >= 85 && code <= 86) return { icon: '🌨️', label: 'przelotny śnieg' };
  if (code >= 95) return { icon: '⛈️', label: 'burza' };
  return { icon: '·', label: '' };
}

const TABS = [
  { key: 'kalendarz', label: 'Kalendarz', icon: '📅' },
  { key: 'naturalne', label: 'Przepisy',  icon: '🌿' },
  { key: 'dziennik',  label: 'Dziennik',  icon: '📔' },
];

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
    // storage full or blocked — silent no-op.
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

  const [tab, setTab] = useState('kalendarz');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [notes, setNotes] = useState(() => lsLoad(NOTES_KEY, []));
  const [noteDraft, setNoteDraft] = useState('');
  const [customPlants, setCustomPlants] = useState(() => lsLoad(CUSTOM_PLANTS_KEY, []));
  const [removedPlants, setRemovedPlants] = useState(() => lsLoad(REMOVED_PLANTS_KEY, []));
  const [bg, setBg] = useState(() => {
    try { return localStorage.getItem(BG_KEY) || DEFAULT_BG; } catch { return DEFAULT_BG; }
  });
  const [location, setLocation] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(LOCATION_KEY) || 'null');
      if (cached && typeof cached.lat === 'number' && typeof cached.lon === 'number') return cached;
    } catch { /* ignore */ }
    return FALLBACK_LOCATION;
  });
  const [showPlantsModal, setShowPlantsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Open plant detail by id (string). For variety, also store { isVariety, parentId, parentName, name }.
  const [openPlant, setOpenPlant] = useState(null);
  // Wizard "Dodaj roślinę" (Etap 1.5) — 5 kroków, komponent AddPlantWizard.
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newPlantDraft, setNewPlantDraft] = useState({
    name: '',
    months: [currentMonth],
    type: 'chemia',
    text: '',
  });
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [toast, setToast] = useState(null);
  const bgFileRef = useRef(null);
  const monthStripRef = useRef(null);

  // Try to get user's geolocation once on mount; fall back silently to Myślenice.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: 'Twoja lokalizacja',
          source: 'geo',
        };
        setLocation(next);
        try { localStorage.setItem(LOCATION_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      },
      () => { /* user denied or geo failed — keep cached or fallback */ },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  // Open-Meteo — fetches for current `location` + refreshes every 30 min.
  useEffect(() => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
      '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
      '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum' +
      '&timezone=auto&forecast_days=2';
    const fetchWeather = () => {
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data) => { setWeather(data); setWeatherError(null); })
        .catch((e) => setWeatherError(String(e)));
    };
    fetchWeather();
    const id = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [location.lat, location.lon]);

  // Keep the active month visible in the horizontal strip.
  useEffect(() => {
    const el = monthStripRef.current?.querySelector(`[data-month="${selectedMonth}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedMonth, tab]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const removedSet = useMemo(() => new Set(removedPlants), [removedPlants]);

  const monthActions = useMemo(() => {
    const builtin = ACTIONS
      .filter((a) => a.month === selectedMonth && !removedSet.has(a.plant))
      .map((a) => {
        const plant = PLANTS.find((p) => p.key === a.plant);
        return { ...a, plantName: plant ? plant.name : a.plant, custom: false };
      });

    // Custom plants — dwa tryby:
    //   (a) z speciesId → rozwiń wszystkie species.calendarTasks dla bieżącego miesiąca
    //   (b) bez speciesId (legacy quick-add) → jedna akcja z type+text+months
    const custom = customPlants.flatMap((p) => {
      const plantName = p.variety ? `${p.name} · ${p.variety}` : p.name;
      const species = p.speciesId ? SPECIES_BY_ID[p.speciesId] : null;

      if (species) {
        return species.calendarTasks
          .filter((t) => t.month === selectedMonth)
          .map((t, idx) => ({
            plant: p.id,
            plantName,
            type: t.type,
            text: t.task,
            custom: true,
            fromSpecies: true,
            id: `${p.id}-task-${idx}`,
          }));
      }

      if (Array.isArray(p.months) && p.months.includes(selectedMonth)) {
        return [{
          plant: p.id,
          plantName,
          type: p.type,
          text: p.text,
          custom: true,
          fromSpecies: false,
          id: p.id,
        }];
      }

      return [];
    });

    const all = [...builtin, ...custom];
    const grouped = {};
    for (const c of CATEGORIES) grouped[c.key] = [];
    for (const a of all) {
      if (grouped[a.type]) grouped[a.type].push(a);
      else grouped[a.type] = [a];
    }
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

  const toggleNewPlantMonth = (m) => {
    setNewPlantDraft((d) => {
      const has = d.months.includes(m);
      const months = has ? d.months.filter((x) => x !== m) : [...d.months, m].sort((a, b) => a - b);
      return { ...d, months };
    });
  };

  const handleAddCustomPlant = () => {
    const name = newPlantDraft.name.trim();
    const text = newPlantDraft.text.trim();
    if (!name || !text || newPlantDraft.months.length === 0) return;
    const entry = {
      id: uid(),
      name,
      months: [...newPlantDraft.months],
      type: newPlantDraft.type,
      text,
    };
    const next = [...customPlants, entry];
    setCustomPlants(next);
    lsSave(CUSTOM_PLANTS_KEY, next);
    setNewPlantDraft({ name: '', months: [currentMonth], type: 'chemia', text: '' });
    setToast('Dodano roślinę');
  };

  const handleDeleteCustom = (id) => {
    const next = customPlants.filter((p) => p.id !== id);
    setCustomPlants(next);
    lsSave(CUSTOM_PLANTS_KEY, next);
  };

  // Plant detail / variety helpers.
  const getPlantName = (id) => {
    const builtin = PLANTS.find((p) => p.key === id);
    if (builtin) return builtin.name;
    const custom = customPlants.find((p) => p.id === id);
    return custom?.name || id;
  };

  // Resolve speciesId for PlantDetail profile section:
  // - builtin plant id matching species key (e.g. 'jablon') → use directly
  // - custom plant id (uid) → lookup speciesId on custom plant
  const resolveSpeciesId = (plantId) => {
    if (SPECIES_BY_ID[plantId]) return plantId;
    const custom = customPlants.find((p) => p.id === plantId);
    return custom?.speciesId || null;
  };

  const openPlantById = (id, name) => {
    setOpenPlant({
      plantId: id,
      plantName: name || getPlantName(id),
      isVariety: false,
      speciesId: resolveSpeciesId(id),
    });
  };

  const openVariety = (variety) => {
    setOpenPlant({
      plantId: variety.id,
      plantName: variety.name,
      isVariety: true,
      parentId: variety.parent,
      parentName: getPlantName(variety.parent),
      speciesId: resolveSpeciesId(variety.parent),
    });
  };

  // (Stare handlery quick-add usunięte w Etap 1.5 — flow w AddPlantWizard.jsx)

  const toggleBuiltin = (key) => {
    const next = removedSet.has(key)
      ? removedPlants.filter((k) => k !== key)
      : [...removedPlants, key];
    setRemovedPlants(next);
    lsSave(REMOVED_PLANTS_KEY, next);
  };

  const handleEnableNotif = async () => {
    if (typeof Notification === 'undefined') {
      setToast('Przeglądarka nie wspiera powiadomień');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm !== 'granted') return;
    const monthly = ACTIONS
      .filter((a) => a.month === currentMonth && !removedSet.has(a.plant))
      .slice(0, 3);
    const last = localStorage.getItem(REMINDER_KEY);
    if (last === todayISO()) {
      setToast('Dzisiejsze przypomnienia już wysłane');
      return;
    }
    monthly.forEach((a, i) => {
      setTimeout(() => {
        const plant = PLANTS.find((p) => p.key === a.plant);
        const cat = CATEGORY_BY_KEY[a.type];
        new Notification(`Ogród Marzeń — ${cat?.label || a.type}`, {
          body: `${plant?.name || a.plant}: ${a.text}`,
          icon: `${import.meta.env.BASE_URL}icon-192.png`,
          tag: `garden-${a.plant}-${a.month}-${i}`,
        });
      }, i * 1500);
    });
    localStorage.setItem(REMINDER_KEY, todayISO());
    setToast(`Włączone — ${monthly.length} przypomnień`);
  };

  const handleBgUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setToast('To nie jest zdjęcie');
      return;
    }
    try {
      const dataUrl = await compressImage(file, 1920, 0.78);
      localStorage.setItem(BG_KEY, dataUrl);
      setBg(dataUrl);
      setToast('Tło zaktualizowane');
    } catch {
      setToast('Nie udało się załadować zdjęcia');
    }
  };

  const handleBgReset = () => {
    try { localStorage.removeItem(BG_KEY); } catch { /* ignore */ }
    setBg(DEFAULT_BG);
    setToast('Tło zresetowane');
  };

  const gold = '#C9A96E';

  return (
    <div className="relative min-h-svh flex flex-col">
      {/* Background image + dark overlay */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.30)',
          backdropFilter: 'blur(1px)',
          WebkitBackdropFilter: 'blur(1px)',
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full pb-24">
        <header className="px-6 pt-10 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] tracking-[3px] uppercase" style={{ color: 'rgba(201,169,110,0.5)' }}>
                {location.label} · {location.lat.toFixed(2)}°N
              </p>
              <h1 className="mt-1 font-serif italic tracking-wide leading-tight" style={{ fontSize: '34px', color: gold }}>
                Ogród Marzeń
              </h1>
            </div>
            <div className="flex flex-col gap-2 shrink-0 pt-2">
              <button
                type="button"
                onClick={() => setShowPlantsModal(true)}
                className="px-3 py-1.5 rounded-full text-[11px] tracking-wide cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(0,0,0,0.70)', border: '0.5px solid rgba(201,169,110,0.35)', color: gold, backdropFilter: 'blur(8px)' }}
              >
                🌱 Rośliny
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label="Ustawienia"
                className="cursor-pointer self-end"
                style={{ background: 'rgba(0,0,0,0.70)', border: '0.5px solid rgba(201,169,110,0.25)', color: 'rgba(201,169,110,0.7)', width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', backdropFilter: 'blur(8px)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {tab === 'kalendarz' && (
          <>
            {/* Weather */}
            <section className="px-6 pb-5">
              <div
                className="rounded-[16px] p-4"
                style={{ backgroundColor: 'rgba(0,0,0,0.70)', border: '0.5px solid rgba(201,169,110,0.25)', backdropFilter: 'blur(10px)' }}
              >
                {!weather && !weatherError && (
                  <p className="text-sm font-serif italic" style={{ color: 'rgba(232,221,208,0.45)' }}>Sprawdzam pogodę...</p>
                )}
                {weatherError && (
                  <p className="text-sm font-serif italic" style={{ color: 'rgba(232,221,208,0.55)' }}>Brak pogody — sprawdź połączenie.</p>
                )}
                {weather && (() => {
                  const { icon, label } = wmoIconAndLabel(weather.current.weather_code);
                  return (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span style={{ fontSize: '36px', lineHeight: 1 }}>{icon}</span>
                      <span className="font-serif tabular-nums" style={{ fontSize: '40px', fontWeight: 300, color: gold, lineHeight: 1 }}>
                        {Math.round(weather.current.temperature_2m)}°
                      </span>
                      <span className="text-sm" style={{ color: 'rgba(232,221,208,0.6)' }}>
                        {label && `${label} · `}wilgotność {weather.current.relative_humidity_2m}%
                      </span>
                    </div>
                    <div className="mt-2 text-[12px]" style={{ color: 'rgba(232,221,208,0.5)' }}>
                      Min {Math.round(weather.daily.temperature_2m_min[0])}° / Max {Math.round(weather.daily.temperature_2m_max[0])}°
                      {weather.daily.precipitation_sum[0] > 0 && ` · opady ${weather.daily.precipitation_sum[0]} mm`}
                    </div>
                    {(frostAlert || humidityAlert) && (
                      <div
                        className="mt-3 px-3 py-2 rounded-lg text-[12px] font-serif italic"
                        style={{ backgroundColor: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.35)', color: gold }}
                      >
                        {frostAlert && 'Mróz nocą — chroń wrażliwe (rododendron, brzoskwinia, magnolia). '}
                        {humidityAlert && 'Wysoka wilgotność — uwaga na grzyby (mączniak, monilioza).'}
                      </div>
                    )}
                  </>
                  );
                })()}
              </div>
            </section>

            {/* Month strip — horizontally scrollable */}
            <section className="pb-5">
              <div
                ref={monthStripRef}
                className="flex gap-2 px-6 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {MONTHS_SHORT.map((m, i) => {
                  const month = i + 1;
                  const isSelected = month === selectedMonth;
                  const isCurrent = month === currentMonth;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-month={month}
                      onClick={() => setSelectedMonth(month)}
                      className="shrink-0 px-4 py-2 rounded-full text-[12px] tracking-wide cursor-pointer"
                      style={{
                        minWidth: 56,
                        border: isSelected ? `1px solid ${gold}` : '0.5px solid rgba(201,169,110,0.2)',
                        background: isSelected ? 'linear-gradient(135deg, rgba(201,169,110,0.22), rgba(123,201,123,0.12))' : 'rgba(0,0,0,0.55)',
                        color: isSelected ? gold : isCurrent ? 'rgba(201,169,110,0.75)' : 'rgba(232,221,208,0.55)',
                        fontWeight: isSelected ? 500 : 400,
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Actions grouped by category */}
            <section className="px-6 pb-8">
              <h2 className="font-serif italic mb-4" style={{ fontSize: '22px', color: gold }}>
                {MONTHS[selectedMonth - 1]}
              </h2>
              {CATEGORIES.map((cat) => {
                const items = monthActions[cat.key] || [];
                if (items.length === 0) return null;
                return (
                  <div key={cat.key} className="mb-5">
                    <p
                      className="px-3 py-1.5 rounded-full inline-block text-[11px] tracking-[2px] uppercase mb-3"
                      style={{ backgroundColor: cat.bg, border: `1px solid ${cat.border}`, color: cat.text }}
                    >
                      {cat.label}
                    </p>
                    <div className="flex flex-col gap-2">
                      {items.map((a, idx) => (
                        <div
                          key={`${a.plant}-${idx}`}
                          className="rounded-[12px] flex items-stretch gap-1"
                          style={{ backgroundColor: cat.bg, border: `0.5px solid ${cat.border}`, backdropFilter: 'blur(4px)' }}
                        >
                          <button
                            type="button"
                            onClick={() => openPlantById(a.plant, a.plantName)}
                            className="flex-1 min-w-0 text-left cursor-pointer px-4 py-3"
                            style={{ background: 'none', border: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          >
                            <span
                              style={{ color: cat.text, fontWeight: 500, fontSize: '13px', letterSpacing: '0.3px', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.15)', textUnderlineOffset: '3px' }}
                            >
                              {a.plantName}
                            </span>
                            {a.custom && <span style={{ marginLeft: 8, fontSize: '10px', opacity: 0.6, fontWeight: 400, color: cat.text }}>własna</span>}
                            <p
                              className="mt-1 font-serif italic leading-relaxed"
                              style={{ color: 'rgba(232,221,208,0.85)', fontSize: '13.5px' }}
                            >
                              {a.text}
                            </p>
                          </button>
                          {a.custom && !a.fromSpecies && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteCustom(a.id); }}
                              className="cursor-pointer shrink-0 px-3 py-3"
                              style={{ background: 'none', border: 'none', color: 'rgba(232,221,208,0.4)', fontSize: '18px', lineHeight: 1 }}
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
              {CATEGORIES.every((c) => (monthActions[c.key] || []).length === 0) && (
                <p className="text-sm font-serif italic" style={{ color: 'rgba(232,221,208,0.45)' }}>
                  Nic zaplanowanego w tym miesiącu — czas odpocząć.
                </p>
              )}
            </section>

            {/* Reminders */}
            <section className="px-6 pb-6">
              <div
                className="rounded-[16px] p-4 flex items-center justify-between gap-3"
                style={{ backgroundColor: 'rgba(0,0,0,0.70)', border: '0.5px solid rgba(201,169,110,0.25)', backdropFilter: 'blur(10px)' }}
              >
                <div className="flex-1">
                  <p className="text-[11px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(201,169,110,0.55)' }}>
                    Przypomnienia
                  </p>
                  <p className="text-[12.5px] font-serif italic" style={{ color: 'rgba(232,221,208,0.7)' }}>
                    {notifPermission === 'granted'
                      ? 'Włączone. Pokażemy akcje na ten miesiąc.'
                      : notifPermission === 'denied'
                      ? 'Zablokowane — włącz w ustawieniach przeglądarki.'
                      : notifPermission === 'unsupported'
                      ? 'Przeglądarka nie wspiera.'
                      : 'Włącz — przypomnienia o opryskach.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnableNotif}
                  disabled={notifPermission === 'denied' || notifPermission === 'unsupported'}
                  className="px-3 py-1.5 rounded-full text-[11px] tracking-wide cursor-pointer shrink-0"
                  style={{
                    border: `1px solid ${gold}`,
                    color: gold,
                    background: 'transparent',
                    opacity: notifPermission === 'denied' || notifPermission === 'unsupported' ? 0.4 : 1,
                  }}
                >
                  {notifPermission === 'granted' ? 'Wyślij' : 'Włącz'}
                </button>
              </div>
            </section>

            {/* Notes */}
            <section className="px-6 pb-8">
              <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(201,169,110,0.55)' }}>
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
                  style={{ border: '1px solid rgba(201,169,110,0.3)', color: 'rgba(232,221,208,0.85)', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteDraft.trim()}
                  className="px-4 rounded-full text-[12px] tracking-wide cursor-pointer"
                  style={{ border: `1px solid ${gold}`, color: gold, background: 'rgba(0,0,0,0.55)', opacity: noteDraft.trim() ? 1 : 0.4, backdropFilter: 'blur(6px)' }}
                >
                  Dodaj
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-[13px] font-serif italic" style={{ color: 'rgba(232,221,208,0.4)' }}>
                  Brak notatek.
                </p>
              ) : (
                <div className="rounded-[14px] overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.70)', border: '0.5px solid rgba(201,169,110,0.25)', backdropFilter: 'blur(10px)' }}>
                  {notes.map((n, idx) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 flex items-start gap-3"
                      style={{ borderTop: idx === 0 ? 'none' : '0.5px solid rgba(201,169,110,0.12)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] tracking-wide" style={{ color: 'rgba(201,169,110,0.55)' }}>{n.date}</p>
                        <p className="mt-0.5 text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'rgba(232,221,208,0.85)' }}>
                          {n.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="cursor-pointer"
                        style={{ background: 'none', border: 'none', color: 'rgba(232,221,208,0.35)', fontSize: '18px', lineHeight: 1, padding: 0 }}
                        aria-label="Usuń notatkę"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'naturalne' && <Recipes />}
        {tab === 'dziennik' && <Diary />}
      </div>

      {/* Bottom navigation bar — z-index 50, below FAB/FLORA but above content. */}
      <nav
        className="fixed left-0 right-0"
        style={{
          bottom: 0,
          zIndex: 50,
          background: 'rgba(13, 12, 10, 0.94)',
          borderTop: '0.5px solid rgba(201, 169, 110, 0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="max-w-lg mx-auto flex">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 cursor-pointer"
                style={{
                  background: 'none',
                  border: 'none',
                  color: active ? gold : 'rgba(232, 221, 208, 0.45)',
                  fontWeight: active ? 500 : 400,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{t.icon}</span>
                <span style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB "+" — always visible quick add. Sits opposite FLORA (left vs right).
          z-index 1000 — above bottom nav (50), FLORA panel/button (999), backdrop (998),
          so it never gets shadowed by the slide-up panel's bounding box on mobile Safari. */}
      <button
        type="button"
        onClick={() => setShowQuickAdd(true)}
        aria-label="Dodaj roślinę"
        style={{
          position: 'fixed',
          left: '20px',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #C9A96E 0%, #b89556 100%)',
          color: '#1A1208',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          fontSize: '28px',
          fontWeight: 300,
          lineHeight: 1,
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(201, 169, 110, 0.3)',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        +
      </button>

      <Flora notes={notes} weather={weather} currentMonth={currentMonth} />

      {/* 5-step wizard "Dodaj roślinę" (Etap 1.5) — zastępuje stary bottom sheet */}
      {showQuickAdd && (
        <AddPlantWizard
          onClose={() => setShowQuickAdd(false)}
          onSave={(plant) => {
            const next = [...customPlants, plant];
            setCustomPlants(next);
            lsSave(CUSTOM_PLANTS_KEY, next);
            setShowQuickAdd(false);
            setToast(`Dodano: ${plant.variety ? `${plant.name} · ${plant.variety}` : plant.name}`);
          }}
        />
      )}

      {/* Plant detail modal — opened by clicking a plant name. */}
      {openPlant && (
        <PlantDetail
          key={openPlant.plantId}
          plantId={openPlant.plantId}
          plantName={openPlant.plantName}
          isVariety={openPlant.isVariety}
          parentId={openPlant.parentId}
          parentName={openPlant.parentName}
          speciesId={openPlant.speciesId}
          onClose={() => setOpenPlant(null)}
          onOpenVariety={(v) => openVariety(v)}
        />
      )}

      {/* Plants management modal */}
      {showPlantsModal && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
          onClick={() => setShowPlantsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col"
            style={{
              maxWidth: '480px',
              maxHeight: '85vh',
              backgroundColor: '#0d0c0a',
              border: '1px solid rgba(201,169,110,0.3)',
              borderRadius: '20px',
            }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '0.5px solid rgba(201,169,110,0.2)' }}>
              <h3 className="font-serif italic" style={{ fontSize: '20px', color: gold }}>Twoje rośliny</h3>
              <button
                type="button"
                onClick={() => setShowPlantsModal(false)}
                aria-label="Zamknij"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,221,208,0.5)', padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex-1">
              <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(201,169,110,0.55)' }}>
                Domyślne (odznacz, żeby ukryć)
              </p>
              <div className="flex flex-col gap-1.5 mb-5">
                {PLANTS.map((p) => {
                  const active = !removedSet.has(p.key);
                  return (
                    <div
                      key={p.key}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ background: active ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(201,169,110,0.15)' }}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleBuiltin(p.key)}
                        style={{ accentColor: gold, width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <button
                        type="button"
                        onClick={() => { setShowPlantsModal(false); openPlantById(p.key, p.name); }}
                        className="font-serif italic flex-1 text-left cursor-pointer"
                        style={{
                          fontSize: '14px',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: active ? '#F0E8D8' : 'rgba(232,221,208,0.4)',
                          textDecoration: active ? 'none' : 'line-through',
                        }}
                      >
                        {p.name}
                      </button>
                      <span style={{ color: 'rgba(201,169,110,0.4)', fontSize: '11px' }}>›</span>
                    </div>
                  );
                })}
              </div>

              {customPlants.length > 0 && (
                <>
                  <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(201,169,110,0.55)' }}>
                    Twoje dodane
                  </p>
                  <div className="flex flex-col gap-1.5 mb-5">
                    {customPlants.map((p) => {
                      const cat = CATEGORY_BY_KEY[p.type];
                      return (
                        <div
                          key={p.id}
                          className="px-3 py-2 rounded-lg flex items-start gap-2"
                          style={{ background: 'rgba(201,169,110,0.05)', border: '0.5px solid rgba(201,169,110,0.15)' }}
                        >
                          <button
                            type="button"
                            onClick={() => { setShowPlantsModal(false); openPlantById(p.id, p.name); }}
                            className="flex-1 min-w-0 text-left cursor-pointer"
                            style={{ background: 'none', border: 'none', padding: 0 }}
                          >
                            <p className="font-serif italic" style={{ fontSize: '14px', color: '#F0E8D8' }}>
                              {p.name}
                              {p.variety && <span style={{ color: 'rgba(201,169,110,0.65)', marginLeft: 8, fontSize: '12px' }}>· {p.variety}</span>}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: cat?.text || 'rgba(232,221,208,0.5)' }}>
                              {cat?.label || p.type} · {p.months.map((m) => MONTHS_SHORT[m - 1]).join(', ')}
                            </p>
                            <p className="text-[12px] font-serif italic mt-0.5" style={{ color: 'rgba(232,221,208,0.65)' }}>{p.text}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustom(p.id)}
                            className="cursor-pointer"
                            style={{ background: 'none', border: 'none', color: 'rgba(232,221,208,0.4)', fontSize: '18px', lineHeight: 1, padding: 0 }}
                            aria-label="Usuń"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(201,169,110,0.55)' }}>
                Dodaj swoją roślinę
              </p>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newPlantDraft.name}
                  onChange={(e) => setNewPlantDraft({ ...newPlantDraft, name: e.target.value })}
                  placeholder="Nazwa rośliny (np. Winorośl)"
                  className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid rgba(201,169,110,0.25)', color: '#F0E8D8' }}
                />
                <div>
                  <p className="text-[10px] tracking-[2px] uppercase mb-1.5" style={{ color: 'rgba(201,169,110,0.55)' }}>
                    Miesiące
                  </p>
                  <div className="grid grid-cols-6 gap-1">
                    {MONTHS_SHORT.map((m, i) => {
                      const month = i + 1;
                      const selected = newPlantDraft.months.includes(month);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleNewPlantMonth(month)}
                          className="py-1.5 rounded-md text-[11px] cursor-pointer"
                          style={{
                            border: selected ? `0.5px solid ${gold}` : '0.5px solid rgba(201,169,110,0.2)',
                            background: selected ? 'rgba(201,169,110,0.18)' : 'transparent',
                            color: selected ? gold : 'rgba(232,221,208,0.55)',
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <select
                  value={newPlantDraft.type}
                  onChange={(e) => setNewPlantDraft({ ...newPlantDraft, type: e.target.value })}
                  className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid rgba(201,169,110,0.25)', color: '#F0E8D8' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newPlantDraft.text}
                  onChange={(e) => setNewPlantDraft({ ...newPlantDraft, text: e.target.value })}
                  placeholder="Co zrobić..."
                  className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid rgba(201,169,110,0.25)', color: '#F0E8D8' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomPlant}
                  disabled={!newPlantDraft.name.trim() || !newPlantDraft.text.trim() || newPlantDraft.months.length === 0}
                  className="py-2 rounded-full text-[12px] cursor-pointer mt-1"
                  style={{
                    background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                    color: '#1A1208',
                    border: 'none',
                    opacity: newPlantDraft.name.trim() && newPlantDraft.text.trim() && newPlantDraft.months.length > 0 ? 1 : 0.4,
                  }}
                >
                  Dodaj roślinę
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full"
            style={{
              maxWidth: '420px',
              backgroundColor: '#0d0c0a',
              border: '1px solid rgba(201,169,110,0.3)',
              borderRadius: '20px',
              padding: '20px',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif italic" style={{ fontSize: '20px', color: gold }}>Ustawienia</h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Zamknij"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,221,208,0.5)', padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(201,169,110,0.55)' }}>
              Tło aplikacji
            </p>

            <div className="relative mb-3 rounded-[14px] overflow-hidden" style={{ border: '0.5px solid rgba(201,169,110,0.25)' }}>
              <img
                src={bg}
                alt="Aktualne tło"
                style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-[10px] tracking-[2px] uppercase"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                  color: 'rgba(232,221,208,0.85)',
                }}
              >
                {bg === DEFAULT_BG ? 'Domyślne — Pergola' : 'Twoje zdjęcie'}
              </div>
            </div>

            <p className="text-[12px] font-serif italic mb-3" style={{ color: 'rgba(232,221,208,0.6)' }}>
              Wgraj własne zdjęcie — zapisze się lokalnie. Zalecane: krajobraz, max 1920px.
            </p>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              onChange={(e) => { handleBgUpload(e.target.files?.[0]); e.target.value = ''; }}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => bgFileRef.current?.click()}
                className="flex-1 py-2 rounded-full text-[12px] cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208', border: 'none' }}
              >
                Wybierz zdjęcie
              </button>
              <button
                type="button"
                onClick={handleBgReset}
                disabled={bg === DEFAULT_BG}
                className="px-4 py-2 rounded-full text-[12px] cursor-pointer"
                style={{
                  background: 'none',
                  border: '0.5px solid rgba(201,169,110,0.3)',
                  color: 'rgba(232,221,208,0.75)',
                  opacity: bg === DEFAULT_BG ? 0.4 : 1,
                }}
              >
                Przywróć
              </button>
            </div>

            <p className="text-[11px] tracking-[2px] uppercase mb-2 mt-5" style={{ color: 'rgba(201,169,110,0.55)' }}>
              Synchronizacja
            </p>
            <button
              type="button"
              onClick={() => {
                // TODO: future Google Calendar OAuth integration hook.
                // Plan: gapi.auth2 → calendar.events.insert for each scheduled garden action.
                // Implementation deferred — see roadmap.
                setToast('Google Calendar — wkrótce dostępne');
              }}
              className="w-full py-2.5 rounded-full text-[13px] cursor-pointer flex items-center justify-center gap-2"
              style={{
                background: 'rgba(66, 133, 244, 0.10)',
                border: '0.5px solid rgba(66, 133, 244, 0.45)',
                color: '#90caf9',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
                <circle cx="8" cy="14" r="1" fill="currentColor" />
                <circle cx="12" cy="14" r="1" fill="currentColor" />
                <circle cx="16" cy="14" r="1" fill="currentColor" />
              </svg>
              Połącz z Google Calendar
            </button>
            <p className="text-[11px] mt-1.5 text-center" style={{ color: 'rgba(232,221,208,0.4)' }}>
              Wkrótce dostępne — integracja w przygotowaniu
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-8 left-1/2 z-50 px-4 py-2 rounded-full text-xs"
          style={{
            transform: 'translateX(-50%)',
            backgroundColor: '#1A1208',
            border: '1px solid rgba(201,169,110,0.4)',
            color: gold,
            zIndex: 1100,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
