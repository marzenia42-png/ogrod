import { useState, useEffect, useMemo, useRef } from 'react';
import Flora from './Flora.jsx';
import Recipes from './Recipes.jsx';
import Diary from './Diary.jsx';
import PlantDetail from './PlantDetail.jsx';
import AddPlantWizard from './AddPlantWizard.jsx';
import CategoryGrid from './CategoryGrid.jsx';
import CategoryPage from './CategoryPage.jsx';
import Onboarding, { hasSeenOnboarding } from './Onboarding.jsx';
import ProactiveBanner from './ProactiveBanner.jsx';
import Spacer from './Spacer.jsx';
import Sprays from './Sprays.jsx';
import {
  compressImage, addPhoto, loadCustomRecipes, updateVariety,
  loadUserProfile, saveUserProfile, EXPERIENCE_LEVELS, PREFERENCE_TYPES,
  loadEvents, loadTheme, saveTheme,
} from './lib/plantStorage.js';
import { migrateCustomPlantsV1 } from './lib/migration.js';
import { runV6Migration } from './lib/migrateV6.js';
import { MONTHS, MONTHS_SHORT, CATEGORIES, CATEGORY_BY_KEY, PLANTS, ACTIONS } from './data/plants.js';
import { SPECIES_BY_ID } from './data/plantSpecies.js';

// Migracja v1: doposaż istniejące custom plants w speciesId+categoryId po nazwie.
// Idempotentna, side-effect free dla nowych userów. Bezpieczna w SSR (guard window).
if (typeof window !== 'undefined') {
  try { migrateCustomPlantsV1(); } catch (e) { console.warn('Migration v1 skipped:', e); }
  // Migracja v6: localStorage → Supabase. Idempotentna, marks 'garden-migrated-v6'.
  runV6Migration().then((r) => console.info('v6 migration:', r));
}

const NOTES_KEY = 'garden-notes';
const CUSTOM_PLANTS_KEY = 'garden-custom-plants';
const REMOVED_PLANTS_KEY = 'garden-removed-plants';
const REMINDER_KEY = 'garden-reminders-shown';
const BG_KEY = 'garden-bg';
const LOCATION_KEY = 'garden-location';
const DEFAULT_BG = `${import.meta.env.BASE_URL}garden-bg.jpg`;
const FALLBACK_LOCATION = { lat: 49.8297, lon: 19.9373, label: 'Myślenice', source: 'fallback' };

// Polski skrót dnia + numer ("wt 14", "śr 15"). Bierze ISO YYYY-MM-DD.
function shortDay(iso) {
  const d = new Date(iso);
  const dow = d.toLocaleDateString('pl-PL', { weekday: 'short' }).replace('.', '');
  return `${dow} ${d.getDate()}`;
}

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
  { key: 'glowna',    label: 'Główna',    icon: '🏡' },
  { key: 'kalendarz', label: 'Kalendarz', icon: '📅' },
  { key: 'naturalne', label: 'Środki',    icon: '🌿' },
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

  const [tab, setTab] = useState('glowna');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [notes, setNotes] = useState(() => lsLoad(NOTES_KEY, []));
  const [noteDraft, setNoteDraft] = useState('');
  const [customPlants, setCustomPlants] = useState(() => lsLoad(CUSTOM_PLANTS_KEY, []));
  const [customRecipes, setCustomRecipes] = useState(() => {
    try { return loadCustomRecipes(); } catch { return []; }
  });
  const [userProfile, setUserProfile] = useState(() => {
    try { return loadUserProfile() || { experience: 'srednio', preferences: 'oba', notes: '' }; }
    catch { return { experience: 'srednio', preferences: 'oba', notes: '' }; }
  });
  const [profileDraft, setProfileDraft] = useState(null);
  const [theme, setTheme] = useState(() => { try { return loadTheme(); } catch { return 'dark'; } });
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
  const [showSettings, setShowSettings] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSpacer, setShowSpacer] = useState(false);
  const [addPlantPreseed, setAddPlantPreseed] = useState(null);
  // FLORA: parent increments to ask Flora to open. Optional seed greeting.
  const [floraOpenSignal, setFloraOpenSignal] = useState(0);
  const [floraSeedMessage, setFloraSeedMessage] = useState(null);
  // Onboarding pokazywany tylko na pierwszym otwarciu — flag w localStorage.
  // Hook init wykonywany raz, więc tryb SSR-safe (hasSeenOnboarding ma fallback).
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());

  const openFlora = (seed) => {
    setFloraSeedMessage(seed || null);
    setFloraOpenSignal((n) => n + 1);
  };
  // Open plant detail by id (string). For variety, also store { isVariety, parentId, parentName, name }.
  const [openPlant, setOpenPlant] = useState(null);
  // Wizard "Dodaj roślinę" (Etap 1.5) — 5 kroków, komponent AddPlantWizard.
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [toast, setToast] = useState(null);
  const bgFileRef = useRef(null);
  const monthStripRef = useRef(null);

  // Try to get user's geolocation once on mount; fall back silently to Myślenice.
  // On success, also query Nominatim reverse geocoding for a human-readable name
  // (Bęczarka, Myślenice, …). Nominatim rate limit: 1 req/s — well within budget.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const initial = { lat, lon, label: 'Twoja lokalizacja', source: 'geo' };
        if (cancelled) return;
        setLocation(initial);
        try { localStorage.setItem(LOCATION_KEY, JSON.stringify(initial)); } catch { /* ignore */ }

        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1&accept-language=pl`)
          .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
          .then((data) => {
            if (cancelled) return;
            const addr = data?.address || {};
            const name = addr.village || addr.town || addr.city || addr.hamlet || addr.suburb || addr.county || (data?.display_name || '').split(',')[0]?.trim();
            if (!name) return;
            const next = { lat, lon, label: name, source: 'geo' };
            setLocation(next);
            try { localStorage.setItem(LOCATION_KEY, JSON.stringify(next)); } catch { /* ignore */ }
          })
          .catch(() => { /* keep 'Twoja lokalizacja' fallback */ });
      },
      () => { /* user denied or geo failed — keep cached or fallback */ },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
    return () => { cancelled = true; };
  }, []);

  // Open-Meteo — fetches for current `location` + refreshes every 30 min.
  // 4-day forecast (today + 3) + hourly precipitation for "dry spray window" detection.
  useEffect(() => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
      '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
      '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code' +
      '&hourly=precipitation,precipitation_probability' +
      '&timezone=auto&forecast_days=4';
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

  // Tick zegara co minutę (data + godzina w headerze).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Sync theme do <html data-theme> dla CSS overrides.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  const handleToggleTheme = (next) => {
    const value = next === 'light' ? 'light' : 'dark';
    saveTheme(value);
    setTheme(value);
  };

  // Proaktywne reguły FLORA — co 30 min sprawdź czy pokazać push:
  //   1) Mróz nocą (≤2°C) + wrażliwe rośliny (species.guide.frostHardy=false)
  //   2) Susza (max ≥28°C) + brak podlewania od 3+ dni
  //   3) Wilgotność ≥85% + temp 12-25°C → ryzyko parcha
  // Debounce: jeden push per typ per dzień (klucz 'garden-proactive-shown').
  useEffect(() => {
    if (typeof Notification === 'undefined' || notifPermission !== 'granted' || !weather) return;
    const PROACTIVE_KEY = 'garden-proactive-shown';

    const run = () => {
      const today = todayISO();
      let shown;
      try { shown = JSON.parse(localStorage.getItem(PROACTIVE_KEY) || '{}'); } catch { shown = {}; }
      const icon = `${import.meta.env.BASE_URL}icon-192.png`;

      // Reguła 1: mróz
      const minToday = weather.daily?.temperature_2m_min?.[0];
      if (typeof minToday === 'number' && minToday <= 2 && shown.mraz !== today) {
        const sensitive = customPlants
          .filter((p) => {
            const s = p.speciesId ? SPECIES_BY_ID[p.speciesId] : null;
            return s && s.guide?.frostHardy === false;
          })
          .map((p) => (p.variety ? `${p.name} · ${p.variety}` : p.name));
        if (sensitive.length > 0) {
          new Notification('Ogród Marzeń — Mróz', {
            body: `Mróz nocą (${Math.round(minToday)}°C). Chroń: ${sensitive.slice(0, 3).join(', ')}.`,
            icon,
            tag: `garden-mraz-${today}`,
          });
          shown.mraz = today;
        }
      }

      // Reguła 2: susza + brak podlewania
      const maxToday = weather.daily?.temperature_2m_max?.[0];
      if (typeof maxToday === 'number' && maxToday >= 28 && shown.susza !== today) {
        const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
        const dry = customPlants
          .filter((p) => {
            const evs = loadEvents(p.id);
            const last = evs.find((e) => e.type === 'podlano');
            if (!last) return true;
            return new Date(last.date).getTime() < threeDaysAgo;
          })
          .slice(0, 3)
          .map((p) => p.name);
        if (dry.length > 0) {
          new Notification('Ogród Marzeń — Susza', {
            body: `${Math.round(maxToday)}°C dziś. Niepodlewane 3+ dni: ${dry.join(', ')}.`,
            icon,
            tag: `garden-susza-${today}`,
          });
          shown.susza = today;
        }
      }

      // Reguła 3: ryzyko parcha
      const humidity = weather.current?.relative_humidity_2m;
      const temp = weather.current?.temperature_2m;
      if (typeof humidity === 'number' && humidity >= 85
          && typeof temp === 'number' && temp >= 12 && temp <= 25
          && shown.parch !== today) {
        new Notification('Ogród Marzeń — Parch', {
          body: `Wilgotność ${humidity}%, ${Math.round(temp)}°C. Ryzyko parcha — skrzyp polny dolistnie.`,
          icon,
          tag: `garden-parch-${today}`,
        });
        shown.parch = today;
      }

      try { localStorage.setItem(PROACTIVE_KEY, JSON.stringify(shown)); } catch { /* ignore */ }
    };

    run();
    const id = setInterval(run, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [weather, customPlants, notifPermission]);

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

    // Custom recipes z polem months — przypomnienia w kalendarzu (kategoria naturalna).
    const recipes = customRecipes
      .filter((r) => Array.isArray(r.months) && r.months.includes(selectedMonth))
      .map((r) => ({
        plant: r.id,
        plantName: r.name,
        type: 'naturalny',
        text: r.target || r.appliesTo || (r.steps?.[0] ?? 'Receptura naturalna'),
        custom: false,
        fromSpecies: false,
        isRecipe: true,
        id: r.id,
      }));

    const all = [...builtin, ...custom, ...recipes];
    const grouped = {};
    for (const c of CATEGORIES) grouped[c.key] = [];
    for (const a of all) {
      if (grouped[a.type]) grouped[a.type].push(a);
      else grouped[a.type] = [a];
    }
    return grouped;
  }, [selectedMonth, customPlants, customRecipes, removedSet]);

  // Snapshot roślin dla kontekstu FLORA (builtin nieukryte + custom).
  // Limit 20 z 2 ostatnimi eventami per roślina (event-by-event read tani — kilkadziesiąt LS calls).
  const plantsForFlora = useMemo(() => {
    const builtin = PLANTS
      .filter((p) => !removedSet.has(p.key))
      .map((p) => ({ id: p.key, name: p.name, location: '', months: [] }));
    const custom = customPlants.map((p) => ({
      id: p.id,
      name: p.variety ? `${p.name} · ${p.variety}` : p.name,
      location: p.location || '',
      months: p.months || [],
    }));
    return [...builtin, ...custom].slice(0, 20).map((p) => ({
      ...p,
      recentEvents: loadEvents(p.id).slice(0, 2).map((e) => ({
        type: e.type, date: e.date, note: e.note,
      })),
    }));
  }, [customPlants, removedSet]);

  const frostAlert = weather?.daily?.temperature_2m_min?.[0] != null && weather.daily.temperature_2m_min[0] <= 2;
  const humidityAlert = weather?.current?.relative_humidity_2m != null && weather.current.relative_humidity_2m >= 85;

  // "Dobry czas na oprysk" — najbliższe 6h: każda godzina <0.1mm opadów i <30%
  // prawdopodobieństwa. Wymaga hourly.precipitation + precipitation_probability.
  const drySprayWindow = (() => {
    const h = weather?.hourly;
    if (!h?.time || !h.precipitation) return false;
    const now = Date.now();
    const idx = h.time.findIndex((t) => new Date(t).getTime() >= now - 30 * 60 * 1000);
    if (idx < 0) return false;
    const mm = h.precipitation.slice(idx, idx + 6);
    const prob = (h.precipitation_probability || []).slice(idx, idx + 6);
    if (mm.length < 6) return false;
    return mm.every((v) => (v ?? 0) < 0.1) && prob.every((v) => (v ?? 0) < 30);
  })();

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
      isCustom: !PLANTS.find((p) => p.key === id),
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
      isCustom: true,
    });
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab !== 'glowna') setSelectedCategory(null);
  };

  const openSettings = () => {
    setProfileDraft({ ...userProfile });
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
    setProfileDraft(null);
  };

  const handleSaveProfile = () => {
    if (!profileDraft) return;
    const saved = saveUserProfile(profileDraft);
    setUserProfile(saved);
    setToast('Profil zapisany');
  };

  const handleUpdatePlantName = (plantId, newName, isVariety) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;
    if (isVariety) {
      updateVariety(plantId, trimmed);
    } else {
      const nextPlants = customPlants.map((p) =>
        p.id === plantId
          ? { ...p, name: trimmed, text: p.variety ? `${trimmed} · ${p.variety}` : trimmed }
          : p,
      );
      setCustomPlants(nextPlants);
      lsSave(CUSTOM_PLANTS_KEY, nextPlants);
    }
    setOpenPlant((prev) => (prev ? { ...prev, plantName: trimmed } : prev));
  };

  // Aktualizuj pola "zakup" rośliny własnej: { purchaseDate?: 'YYYY-MM-DD', purchasePrice?: number }
  // Wartości pustego stringa lub null kasują pole (idempotentne).
  const handleUpdatePlantPurchase = (plantId, { purchaseDate, purchasePrice }) => {
    const cleanDate = (typeof purchaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate))
      ? purchaseDate
      : null;
    const priceNum = (typeof purchasePrice === 'number' && Number.isFinite(purchasePrice) && purchasePrice >= 0)
      ? Math.round(purchasePrice * 100) / 100
      : null;
    const nextPlants = customPlants.map((p) => {
      if (p.id !== plantId) return p;
      const updated = { ...p };
      if (cleanDate) updated.purchaseDate = cleanDate; else delete updated.purchaseDate;
      if (priceNum != null) updated.purchasePrice = priceNum; else delete updated.purchasePrice;
      return updated;
    });
    setCustomPlants(nextPlants);
    lsSave(CUSTOM_PLANTS_KEY, nextPlants);
  };

  // (Stare handlery quick-add usunięte w Etap 1.5 — flow w AddPlantWizard.jsx)

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
          backgroundColor: 'var(--bg-image-overlay)',
          backdropFilter: 'blur(1px)',
          WebkitBackdropFilter: 'blur(1px)',
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full pb-24">
        <header className="px-5 pt-9 pb-3">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              aria-label="Otwórz menu"
              className="shrink-0 cursor-pointer"
              style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)', color: 'var(--gold-label-strong)', width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', backdropFilter: 'blur(8px)', marginTop: 4 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>

            <div className="flex-1 min-w-0 text-center">
              <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold-label)' }}>
                {location.label} · {location.lat.toFixed(2)}°N
              </p>
              <h1 className="mt-1 font-serif italic tracking-wide leading-tight" style={{ fontSize: '32px', color: 'var(--gold)' }}>
                Ogród Marzeń
              </h1>
              <button
                type="button"
                onClick={() => openFlora('Dzień dobry! Co planujemy dziś w ogrodzie? 🌿')}
                className="cursor-pointer"
                style={{ background: 'none', border: 'none', padding: 0, marginTop: 4 }}
              >
                <span className="font-serif italic" style={{ fontSize: 15, color: 'var(--text-secondary)', fontVariantNumeric: 'lining-nums tabular-nums' }}>
                  {now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  <span style={{ color: 'var(--gold)', margin: '0 8px', fontWeight: 600 }}>·</span>
                  <span style={{ fontWeight: 500, color: 'var(--gold)' }}>{now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleToggleTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Zmień motyw"
              className="shrink-0 cursor-pointer"
              style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)', color: 'var(--gold-label-strong)', width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', backdropFilter: 'blur(8px)', marginTop: 4 }}
            >
              {theme === 'dark' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                  <line x1="4.5" y1="4.5" x2="6.5" y2="6.5" />
                  <line x1="17.5" y1="17.5" x2="19.5" y2="19.5" />
                  <line x1="4.5" y1="19.5" x2="6.5" y2="17.5" />
                  <line x1="17.5" y1="6.5" x2="19.5" y2="4.5" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {tab === 'glowna' && selectedCategory && (
          <CategoryPage
            categoryId={selectedCategory}
            customPlants={customPlants}
            removedSet={removedSet}
            onBack={() => setSelectedCategory(null)}
            onSelectCategory={setSelectedCategory}
            onOpenPlant={(id, name) => openPlantById(id, name)}
            onOpenVariety={(v) => openVariety(v)}
            onAddPlant={() => setShowQuickAdd(true)}
          />
        )}

        {((tab === 'glowna' && !selectedCategory) || tab === 'kalendarz') && (
          <>
            {/* Weather */}
            <section className="px-6 pb-5">
              <div
                className="rounded-[16px] p-4"
                style={{ backgroundColor: 'var(--surface-card)', border: '0.5px solid var(--border-medium)', backdropFilter: 'blur(10px)' }}
              >
                {!weather && !weatherError && (
                  <p className="text-sm font-serif italic" style={{ color: 'var(--text-faint)' }}>Sprawdzam pogodę...</p>
                )}
                {weatherError && (
                  <p className="text-sm font-serif italic" style={{ color: 'var(--text-muted)' }}>Brak pogody — sprawdź połączenie.</p>
                )}
                {weather && (() => {
                  const { icon, label } = wmoIconAndLabel(weather.current.weather_code);
                  return (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span style={{ fontSize: '36px', lineHeight: 1 }}>{icon}</span>
                      <span className="font-serif tabular-nums" style={{ fontSize: '40px', fontWeight: 300, color: 'var(--gold)', lineHeight: 1, fontVariantNumeric: 'lining-nums tabular-nums' }}>
                        {Math.round(weather.current.temperature_2m)}°
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {label && `${label} · `}wilgotność {weather.current.relative_humidity_2m}%
                      </span>
                    </div>
                    <div className="mt-2 text-[12px]" style={{ color: 'var(--text-faint)' }}>
                      Min {Math.round(weather.daily.temperature_2m_min[0])}° / Max {Math.round(weather.daily.temperature_2m_max[0])}°
                      {weather.daily.precipitation_sum[0] > 0 && ` · opady ${weather.daily.precipitation_sum[0]} mm`}
                    </div>
                    {tab === 'kalendarz' && weather.daily?.time?.length > 1 && (
                      <div className="mt-3 flex gap-1.5">
                        {weather.daily.time.slice(1, 4).map((iso, i) => {
                          const di = i + 1;
                          const wmo = wmoIconAndLabel(weather.daily.weather_code?.[di]);
                          const tmin = Math.round(weather.daily.temperature_2m_min[di]);
                          const tmax = Math.round(weather.daily.temperature_2m_max[di]);
                          const prec = weather.daily.precipitation_sum[di];
                          return (
                            <div
                              key={iso}
                              className="flex-1 rounded-lg px-2 py-2 flex flex-col items-center gap-0.5"
                              style={{ background: 'var(--surface-tint)', border: '0.5px solid var(--border-soft)' }}
                            >
                              <p className="text-[10px] tracking-wide" style={{ color: 'var(--gold-label-strong)' }}>{shortDay(iso)}</p>
                              <span style={{ fontSize: '22px', lineHeight: 1 }}>{wmo.icon}</span>
                              <p className="text-[11px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>{tmax}° / {tmin}°</p>
                              {prec > 0 && (
                                <p className="text-[10px] tabular-nums" style={{ color: 'rgba(135, 206, 250, 0.7)' }}>{prec.toFixed(1)} mm</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {tab === 'kalendarz' && (frostAlert || humidityAlert) && (
                      <div
                        className="mt-3 px-3 py-2 rounded-lg text-[12px] font-serif italic"
                        style={{ backgroundColor: 'var(--surface-tint)', border: '1px solid var(--border-strong)', color: 'var(--gold)' }}
                      >
                        {frostAlert && 'Mróz nocą — chroń wrażliwe (rododendron, brzoskwinia, magnolia). '}
                        {humidityAlert && 'Wysoka wilgotność — uwaga na grzyby (mączniak, monilioza).'}
                      </div>
                    )}
                    {tab === 'kalendarz' && drySprayWindow && !humidityAlert && (
                      <div
                        className="mt-3 px-3 py-2 rounded-lg text-[12px] font-serif italic"
                        style={{ backgroundColor: 'rgba(76, 175, 80, 0.10)', border: '1px solid rgba(76, 175, 80, 0.35)', color: '#86efac' }}
                      >
                        🌿 Dobry czas na oprysk — najbliższe 6h bez deszczu.
                      </div>
                    )}
                  </>
                  );
                })()}
              </div>
            </section>
          </>
        )}

        {tab === 'glowna' && !selectedCategory && (
          <>
            <ProactiveBanner
              plants={plantsForFlora}
              weather={weather}
              currentMonth={currentMonth}
              onOpenFlora={(seed) => openFlora(seed)}
              context={{
                monthName: MONTHS[currentMonth - 1],
                dateStr: now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }),
                timeStr: now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
                weather: weather?.current ? {
                  temperature: weather.current.temperature_2m,
                  humidity: weather.current.relative_humidity_2m,
                  wind: weather.current.wind_speed_10m,
                  minToday: weather.daily?.temperature_2m_min?.[0],
                  maxToday: weather.daily?.temperature_2m_max?.[0],
                } : null,
              }}
            />
            <CategoryGrid
              customPlants={customPlants}
              removedSet={removedSet}
              onPickCategory={setSelectedCategory}
            />
          </>
        )}

        {tab === 'kalendarz' && (
          <>
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
                        border: isSelected ? `1px solid var(--gold)` : '0.5px solid var(--border-soft)',
                        background: isSelected ? 'linear-gradient(135deg, rgba(201,169,110,0.22), rgba(123,201,123,0.12))' : 'var(--surface-card-soft)',
                        color: isSelected ? 'var(--gold)' : isCurrent ? 'var(--gold-label-strong)' : 'var(--text-muted)',
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
              <h2 className="font-serif italic mb-4" style={{ fontSize: '22px', color: 'var(--gold)' }}>
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
                            onClick={() => a.isRecipe ? setTab('naturalne') : openPlantById(a.plant, a.plantName)}
                            className="flex-1 min-w-0 text-left cursor-pointer px-4 py-3"
                            style={{ background: 'none', border: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          >
                            <span
                              style={{ color: cat.text, fontWeight: 500, fontSize: '13px', letterSpacing: '0.3px', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.15)', textUnderlineOffset: '3px' }}
                            >
                              {a.isRecipe ? `🌿 ${a.plantName}` : a.plantName}
                            </span>
                            {a.custom && <span style={{ marginLeft: 8, fontSize: '10px', opacity: 0.6, fontWeight: 400, color: cat.text }}>własna</span>}
                            {a.isRecipe && <span style={{ marginLeft: 8, fontSize: '10px', opacity: 0.7, fontWeight: 400, color: cat.text }}>receptura →</span>}
                            <p
                              className="mt-1 font-serif italic leading-relaxed"
                              style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}
                            >
                              {a.text}
                            </p>
                          </button>
                          {a.custom && !a.fromSpecies && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteCustom(a.id); }}
                              className="cursor-pointer shrink-0 px-3 py-3"
                              style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: '18px', lineHeight: 1 }}
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
                <p className="text-sm font-serif italic" style={{ color: 'var(--text-faint)' }}>
                  Nic zaplanowanego w tym miesiącu — czas odpocząć.
                </p>
              )}
            </section>

            {/* Reminders */}
            <section className="px-6 pb-6">
              <div
                className="rounded-[16px] p-4 flex items-center justify-between gap-3"
                style={{ backgroundColor: 'var(--surface-card)', border: '0.5px solid var(--border-medium)', backdropFilter: 'blur(10px)' }}
              >
                <div className="flex-1">
                  <p className="text-[11px] tracking-[2px] uppercase mb-1" style={{ color: 'var(--gold-label)' }}>
                    Przypomnienia
                  </p>
                  <p className="text-[12.5px] font-serif italic" style={{ color: 'var(--text-secondary)' }}>
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
                    border: `1px solid var(--gold)`,
                    color: 'var(--gold)',
                    background: 'transparent',
                    opacity: notifPermission === 'denied' || notifPermission === 'unsupported' ? 0.4 : 1,
                  }}
                >
                  {notifPermission === 'granted' ? 'Wyślij' : 'Włącz'}
                </button>
              </div>
            </section>
          </>
        )}

        {tab === 'glowna' && !selectedCategory && (
          <>
            {/* Notes */}
            <section className="px-6 pb-8">
              <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'var(--gold-label)' }}>
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
                  style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--surface-card-soft)', backdropFilter: 'blur(6px)' }}
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteDraft.trim()}
                  className="px-4 rounded-full text-[12px] tracking-wide cursor-pointer"
                  style={{ border: `1px solid var(--gold)`, color: 'var(--gold)', background: 'var(--surface-card-soft)', opacity: noteDraft.trim() ? 1 : 0.4, backdropFilter: 'blur(6px)' }}
                >
                  Dodaj
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-faint)' }}>
                  Brak notatek.
                </p>
              ) : (
                <div className="rounded-[14px] overflow-hidden" style={{ backgroundColor: 'var(--surface-card)', border: '0.5px solid var(--border-medium)', backdropFilter: 'blur(10px)' }}>
                  {notes.map((n, idx) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 flex items-start gap-3"
                      style={{ borderTop: idx === 0 ? 'none' : '0.5px solid var(--border-soft)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] tracking-wide" style={{ color: 'var(--gold-label)' }}>{n.date}</p>
                        <p className="mt-0.5 text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {n.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="cursor-pointer"
                        style={{ background: 'none', border: 'none', color: 'var(--text-very-faint)', fontSize: '18px', lineHeight: 1, padding: 0 }}
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

        {tab === 'naturalne' && (
          <Recipes customRecipes={customRecipes} onRecipesChange={setCustomRecipes} />
        )}
        {tab === 'srodki' && (
          <Sprays customPlants={customPlants} />
        )}
        {tab === 'dziennik' && <Diary />}
      </div>

      {/* Bottom navigation bar — z-index 50, below FAB/FLORA but above content. */}
      <nav
        className="fixed left-0 right-0"
        style={{
          bottom: 0,
          zIndex: 50,
          background: 'var(--nav-bg)',
          borderTop: '0.5px solid var(--nav-border)',
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
                onClick={() => handleTabChange(t.key)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 cursor-pointer"
                style={{
                  background: 'none',
                  border: 'none',
                  color: active ? 'var(--gold)' : 'var(--text-faint)',
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

      {/* FAB "+" — quick add + Spacer mode (📸) above it */}
      <button
        type="button"
        onClick={() => setShowSpacer(true)}
        aria-label="Spacer z aparatem"
        style={{
          position: 'fixed',
          left: '20px',
          bottom: 'calc(146px + env(safe-area-inset-bottom))',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          border: '1px solid rgba(201,169,110,0.4)',
          background: 'rgba(20,14,8,0.85)',
          color: '#E8C77E',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          backdropFilter: 'blur(8px)',
        }}
      >
        📸
      </button>

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

      {showSpacer && (
        <Spacer
          onClose={() => setShowSpacer(false)}
          onAddToGarden={(p) => {
            setShowSpacer(false);
            setAddPlantPreseed(p);
            setShowQuickAdd(true);
          }}
        />
      )}

      <Flora
        notes={notes}
        weather={weather}
        currentMonth={currentMonth}
        plants={plantsForFlora}
        profile={userProfile}
        openSignal={floraOpenSignal}
        seedMessage={floraSeedMessage}
      />

      {/* Drawer menu — boczny panel z nawigacją do sekcji aplikacji */}
      {showDrawer && (
        <>
          <div
            onClick={() => setShowDrawer(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, animation: 'drawerFade 0.25s ease' }}
          />
          <aside
            style={{
              position: 'fixed', top: 0, bottom: 0, left: 0, width: 280,
              background: 'var(--drawer-bg)', borderRight: '1px solid var(--drawer-border)',
              zIndex: 1101, display: 'flex', flexDirection: 'column',
              paddingTop: 'env(safe-area-inset-top)',
              animation: 'drawerSlide 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            <div style={{ padding: '22px 18px 14px', borderBottom: '1px solid var(--drawer-border)' }}>
              <p className="font-serif italic" style={{ fontSize: 20, color: 'var(--gold)', letterSpacing: 1 }}>🌱 Ogród Marzeń</p>
            </div>
            <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { key: 'glowna',     icon: '🪴', label: 'Moje rośliny' },
                { key: 'srodki',     icon: '💊', label: 'Środki i nawozy' },
                { key: 'galeria',    icon: '📸', label: 'Galeria ogrodu' },
                { key: 'historia',   icon: '📖', label: 'Historia ogrodu' },
                { key: 'kalendarz',  icon: '📅', label: 'Kalendarz' },
                { key: 'dziennik',   icon: '📔', label: 'Dziennik' },
              ].map((item) => {
                const isActive = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { setTab(item.key); setSelectedCategory(null); setShowDrawer(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '11px 14px', borderRadius: 10,
                      background: isActive ? 'var(--surface-tint)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                      color: isActive ? 'var(--gold)' : 'var(--text-primary)',
                      cursor: 'pointer', fontSize: 14, fontWeight: isActive ? 600 : 400,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <div style={{ height: 1, background: 'var(--drawer-border)', margin: '8px 6px' }} />
              <button
                type="button"
                onClick={() => { setShowDrawer(false); openFlora(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
                  background: 'transparent', borderLeft: '3px solid transparent',
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>🌿</span>
                <span>FLORA</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowDrawer(false); openSettings(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
                  background: 'transparent', borderLeft: '3px solid transparent',
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14, textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>⚙️</span>
                <span>Ustawienia</span>
              </button>
            </nav>
          </aside>
        </>
      )}

      {/* 5-step wizard "Dodaj roślinę" (Etap 1.5) — zastępuje stary bottom sheet */}
      {showQuickAdd && (
        <AddPlantWizard
          onClose={() => { setShowQuickAdd(false); setAddPlantPreseed(null); }}
          preseed={addPlantPreseed}
          onSave={(plant) => {
            const next = [...customPlants, plant];
            setCustomPlants(next);
            lsSave(CUSTOM_PLANTS_KEY, next);
            setShowQuickAdd(false);
            setAddPlantPreseed(null);
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
          isCustom={openPlant.isCustom}
          customPlant={openPlant.isCustom ? customPlants.find((p) => p.id === openPlant.plantId) : null}
          onClose={() => setOpenPlant(null)}
          onUpdateName={handleUpdatePlantName}
          onUpdatePurchase={handleUpdatePlantPurchase}
          onOpenFlora={(seed) => openFlora(seed)}
        />
      )}


      {/* Settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
          onClick={closeSettings}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col"
            style={{
              maxWidth: '420px',
              maxHeight: '90vh',
              backgroundColor: 'var(--surface-modal)',
              border: '1px solid var(--border-strong)',
              borderRadius: '20px',
            }}
          >
            <div className="flex items-center justify-between p-5 pb-3" style={{ borderBottom: '0.5px solid var(--border-soft)' }}>
              <h3 className="font-serif italic" style={{ fontSize: '20px', color: 'var(--gold)' }}>Ustawienia</h3>
              <button
                type="button"
                onClick={closeSettings}
                aria-label="Zamknij"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex-1">

            <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gold-label)' }}>
              Motyw
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-5">
              {[
                { id: 'dark', label: '🌙 Ciemny' },
                { id: 'light', label: '☀️ Jasny' },
              ].map((opt) => {
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleTheme(opt.id)}
                    className="py-2 rounded-lg text-[13px] cursor-pointer"
                    style={{
                      background: active ? 'var(--surface-tint)' : 'var(--surface-faint)',
                      border: active ? `0.5px solid var(--gold)` : '0.5px solid var(--border-soft)',
                      color: active ? 'var(--gold)' : 'var(--text-secondary)',
                      fontWeight: active ? 500 : 400,
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gold-label)' }}>
              Tło aplikacji
            </p>

            <div className="relative mb-3 rounded-[14px] overflow-hidden" style={{ border: '0.5px solid var(--border-medium)' }}>
              <img
                src={bg}
                alt="Aktualne tło"
                style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-[10px] tracking-[2px] uppercase"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                  color: '#F0E8D8',
                }}
              >
                {bg === DEFAULT_BG ? 'Domyślne — Pergola' : 'Twoje zdjęcie'}
              </div>
            </div>

            <p className="text-[12px] font-serif italic mb-3" style={{ color: 'var(--text-muted)' }}>
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
                  border: '0.5px solid var(--border-medium)',
                  color: 'var(--text-secondary)',
                  opacity: bg === DEFAULT_BG ? 0.4 : 1,
                }}
              >
                Przywróć
              </button>
            </div>

            {/* Profil FLORA — doklejany do system prompt jako kontekst preferencji */}
            <p className="text-[11px] tracking-[2px] uppercase mb-2 mt-5" style={{ color: 'var(--gold-label)' }}>
              Profil FLORA
            </p>
            <p className="text-[12px] font-serif italic mb-3" style={{ color: 'var(--text-muted)' }}>
              FLORA dopasuje rady do Twojego doświadczenia i preferencji.
            </p>

            {profileDraft && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[10px] tracking-[2px] uppercase mb-1.5" style={{ color: 'var(--gold-label)' }}>
                    Doświadczenie
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {EXPERIENCE_LEVELS.map((lvl) => {
                      const active = profileDraft.experience === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setProfileDraft({ ...profileDraft, experience: lvl.id })}
                          className="py-1.5 px-2 rounded-md text-[11px] cursor-pointer"
                          style={{
                            background: active ? 'var(--surface-tint)' : 'transparent',
                            border: active ? `0.5px solid var(--gold)` : '0.5px solid var(--border-soft)',
                            color: active ? 'var(--gold)' : 'var(--text-secondary)',
                            fontWeight: active ? 500 : 400,
                          }}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-[2px] uppercase mb-1.5" style={{ color: 'var(--gold-label)' }}>
                    Preferencje preparatów
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PREFERENCE_TYPES.map((pref) => {
                      const active = profileDraft.preferences === pref.id;
                      return (
                        <button
                          key={pref.id}
                          type="button"
                          onClick={() => setProfileDraft({ ...profileDraft, preferences: pref.id })}
                          className="py-1.5 px-2 rounded-md text-[11px] cursor-pointer"
                          style={{
                            background: active ? 'rgba(76, 175, 80, 0.20)' : 'transparent',
                            border: active ? '0.5px solid rgba(76, 175, 80, 0.5)' : '0.5px solid var(--border-soft)',
                            color: active ? '#2e7d32' : 'var(--text-secondary)',
                            fontWeight: active ? 500 : 400,
                          }}
                        >
                          {pref.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-[2px] uppercase mb-1.5" style={{ color: 'var(--gold-label)' }}>
                    O Tobie (opcjonalne)
                  </p>
                  <textarea
                    value={profileDraft.notes}
                    onChange={(e) => setProfileDraft({ ...profileDraft, notes: e.target.value })}
                    placeholder="np. Beata, lubi zioła, alergia na sosnowe oleje, ogród 200m²..."
                    rows={3}
                    maxLength={1000}
                    className="w-full bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none resize-none"
                    style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="py-2 rounded-full text-[12px] cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                    color: '#1A1208',
                    border: 'none',
                    fontWeight: 500,
                  }}
                >
                  Zapisz profil
                </button>
              </div>
            )}

            <p className="text-[11px] tracking-[2px] uppercase mb-2 mt-5" style={{ color: 'var(--gold-label)' }}>
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
                background: 'rgba(66, 133, 244, 0.12)',
                border: '0.5px solid rgba(66, 133, 244, 0.45)',
                color: '#1565c0',
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
            <p className="text-[11px] mt-1.5 text-center" style={{ color: 'var(--text-faint)' }}>
              Wkrótce dostępne — integracja w przygotowaniu
            </p>

            <p className="text-[11px] tracking-[2px] uppercase mb-2 mt-5" style={{ color: 'var(--gold-label)' }}>
              Pomoc
            </p>
            <button
              type="button"
              onClick={() => { setShowSettings(false); setShowOnboarding(true); }}
              className="w-full py-2.5 rounded-full text-[13px] cursor-pointer flex items-center justify-center gap-2"
              style={{
                background: 'var(--surface-tint)',
                border: '0.5px solid var(--border-medium)',
                color: 'var(--gold)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              🌿 Pokaż przewodnik ponownie
            </button>

            </div>{/* /overflow-y-auto */}
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-8 left-1/2 z-50 px-4 py-2 rounded-full text-xs"
          style={{
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-strong)',
            color: 'var(--gold)',
            zIndex: 1100,
          }}
        >
          {toast}
        </div>
      )}

      {/* Onboarding — pokazywany RAZ na pierwszym otwarciu. Render na samym końcu
          żeby z-index 2000 nakładał się nad WSZYSTKO (modale 1000, fullscreen 1100). */}
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
