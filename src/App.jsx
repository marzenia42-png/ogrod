import { useState, useEffect, useMemo, useRef } from 'react';
import Flora from './Flora.jsx';
import Recipes from './Recipes.jsx';
import Diary from './Diary.jsx';
import { MONTHS, MONTHS_SHORT, CATEGORIES, CATEGORY_BY_KEY, PLANTS, ACTIONS } from './data/plants.js';

const NOTES_KEY = 'garden-notes';
const CUSTOM_PLANTS_KEY = 'garden-custom-plants';
const REMOVED_PLANTS_KEY = 'garden-removed-plants';
const REMINDER_KEY = 'garden-reminders-shown';
const BG_KEY = 'garden-bg';
const DEFAULT_BG = `${import.meta.env.BASE_URL}garden-bg.jpg`;

const TABS = [
  { key: 'kalendarz', label: 'Kalendarz', icon: '📅' },
  { key: 'naturalne', label: 'Naturalne', icon: '🌿' },
  { key: 'dziennik', label: 'Dziennik', icon: '📔' },
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

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1920;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
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
  const [showPlantsModal, setShowPlantsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  // Open-Meteo Myślenice — fetch on mount + refresh every 30 min so all-day sessions stay current.
  useEffect(() => {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=49.83&longitude=19.94' +
      '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
      '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum' +
      '&timezone=Europe%2FWarsaw&forecast_days=2';
    const fetchWeather = () => {
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((data) => { setWeather(data); setWeatherError(null); })
        .catch((e) => setWeatherError(String(e)));
    };
    fetchWeather();
    const id = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

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

    // Custom plants have a list of months — expand to per-month entries on the fly.
    const custom = customPlants
      .filter((p) => Array.isArray(p.months) && p.months.includes(selectedMonth))
      .map((p) => ({
        plant: p.id,
        plantName: p.name,
        type: p.type,
        text: p.text,
        custom: true,
        id: p.id,
      }));

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
      const dataUrl = await compressImage(file);
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
      <div className="fixed inset-0 z-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.78)' }} />

      <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full pb-24">
        <header className="px-6 pt-10 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] tracking-[3px] uppercase" style={{ color: 'rgba(201,169,110,0.5)' }}>
                Myślenice · 49.83°N
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
                style={{ background: 'rgba(13,12,10,0.55)', border: '0.5px solid rgba(201,169,110,0.35)', color: gold, backdropFilter: 'blur(8px)' }}
              >
                🌱 Rośliny
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                aria-label="Ustawienia"
                className="cursor-pointer self-end"
                style={{ background: 'rgba(13,12,10,0.55)', border: '0.5px solid rgba(201,169,110,0.25)', color: 'rgba(201,169,110,0.7)', width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', backdropFilter: 'blur(8px)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="px-6 pb-4">
          <div
            className="flex gap-1 p-1 rounded-full"
            style={{ background: 'rgba(13,12,10,0.55)', border: '0.5px solid rgba(201,169,110,0.2)', backdropFilter: 'blur(8px)' }}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className="flex-1 py-2 rounded-full text-[12px] tracking-wide cursor-pointer"
                  style={{
                    background: active ? 'linear-gradient(135deg, rgba(201,169,110,0.2), rgba(123,201,123,0.1))' : 'transparent',
                    border: active ? '0.5px solid rgba(201,169,110,0.45)' : '0.5px solid transparent',
                    color: active ? gold : 'rgba(232,221,208,0.55)',
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <span style={{ marginRight: 4 }}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {tab === 'kalendarz' && (
          <>
            {/* Weather */}
            <section className="px-6 pb-5">
              <div
                className="rounded-[16px] p-4"
                style={{ backgroundColor: 'rgba(13,12,10,0.62)', border: '0.5px solid rgba(201,169,110,0.25)', backdropFilter: 'blur(10px)' }}
              >
                {!weather && !weatherError && (
                  <p className="text-sm font-serif italic" style={{ color: 'rgba(232,221,208,0.45)' }}>Sprawdzam pogodę...</p>
                )}
                {weatherError && (
                  <p className="text-sm font-serif italic" style={{ color: 'rgba(232,221,208,0.55)' }}>Brak pogody — sprawdź połączenie.</p>
                )}
                {weather && (
                  <>
                    <div className="flex items-baseline gap-3">
                      <span className="font-serif tabular-nums" style={{ fontSize: '40px', fontWeight: 300, color: gold, lineHeight: 1 }}>
                        {Math.round(weather.current.temperature_2m)}°
                      </span>
                      <span className="text-sm" style={{ color: 'rgba(232,221,208,0.6)' }}>
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
                        style={{ backgroundColor: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.35)', color: gold }}
                      >
                        {frostAlert && 'Mróz nocą — chroń wrażliwe (rododendron, brzoskwinia, magnolia). '}
                        {humidityAlert && 'Wysoka wilgotność — uwaga na grzyby (mączniak, monilioza).'}
                      </div>
                    )}
                  </>
                )}
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
                        background: isSelected ? 'linear-gradient(135deg, rgba(201,169,110,0.22), rgba(123,201,123,0.12))' : 'rgba(13,12,10,0.5)',
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
                          className="rounded-[12px] px-4 py-3 flex items-start gap-3"
                          style={{ backgroundColor: cat.bg, border: `0.5px solid ${cat.border}`, backdropFilter: 'blur(4px)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p style={{ color: cat.text, fontWeight: 500, fontSize: '13px', letterSpacing: '0.3px' }}>
                              {a.plantName}
                              {a.custom && <span style={{ marginLeft: 8, fontSize: '10px', opacity: 0.6, fontWeight: 400 }}>własna</span>}
                            </p>
                            <p
                              className="mt-1 font-serif italic leading-relaxed"
                              style={{ color: 'rgba(232,221,208,0.85)', fontSize: '13.5px' }}
                            >
                              {a.text}
                            </p>
                          </div>
                          {a.custom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustom(a.id)}
                              className="cursor-pointer"
                              style={{ background: 'none', border: 'none', color: 'rgba(232,221,208,0.4)', fontSize: '18px', lineHeight: 1, padding: 0 }}
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
                style={{ backgroundColor: 'rgba(13,12,10,0.62)', border: '0.5px solid rgba(201,169,110,0.25)', backdropFilter: 'blur(10px)' }}
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
                  style={{ border: '1px solid rgba(201,169,110,0.3)', color: 'rgba(232,221,208,0.85)', background: 'rgba(13,12,10,0.5)', backdropFilter: 'blur(6px)' }}
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteDraft.trim()}
                  className="px-4 rounded-full text-[12px] tracking-wide cursor-pointer"
                  style={{ border: `1px solid ${gold}`, color: gold, background: 'rgba(13,12,10,0.5)', opacity: noteDraft.trim() ? 1 : 0.4, backdropFilter: 'blur(6px)' }}
                >
                  Dodaj
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-[13px] font-serif italic" style={{ color: 'rgba(232,221,208,0.4)' }}>
                  Brak notatek.
                </p>
              ) : (
                <div className="rounded-[14px] overflow-hidden" style={{ backgroundColor: 'rgba(13,12,10,0.62)', border: '0.5px solid rgba(201,169,110,0.25)', backdropFilter: 'blur(10px)' }}>
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

      <Flora notes={notes} weather={weather} currentMonth={currentMonth} />

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
                    <label
                      key={p.key}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: active ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(201,169,110,0.15)' }}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleBuiltin(p.key)}
                        style={{ accentColor: gold, width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <span
                        className="font-serif italic"
                        style={{ fontSize: '14px', color: active ? '#F0E8D8' : 'rgba(232,221,208,0.4)', textDecoration: active ? 'none' : 'line-through' }}
                      >
                        {p.name}
                      </span>
                    </label>
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
                          <div className="flex-1 min-w-0">
                            <p className="font-serif italic" style={{ fontSize: '14px', color: '#F0E8D8' }}>{p.name}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: cat?.text || 'rgba(232,221,208,0.5)' }}>
                              {cat?.label || p.type} · {p.months.map((m) => MONTHS_SHORT[m - 1]).join(', ')}
                            </p>
                            <p className="text-[12px] font-serif italic mt-0.5" style={{ color: 'rgba(232,221,208,0.65)' }}>{p.text}</p>
                          </div>
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
                className="px-4 py-2 rounded-full text-[12px] cursor-pointer"
                style={{ background: 'none', border: '0.5px solid rgba(201,169,110,0.3)', color: 'rgba(232,221,208,0.75)' }}
              >
                Reset
              </button>
            </div>
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
