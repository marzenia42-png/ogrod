import { useState, useMemo } from 'react';
import { MONTHS } from './data/plants.js';
import { getHolidays } from './lib/polishHolidays.js';

const DIARY_PREFIX = 'garden-diary-';
const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

function dateKey(year, month, day) {
  return `${DIARY_PREFIX}${year}-${pad(month)}-${pad(day)}`;
}

function loadEntry(year, month, day) {
  try {
    return localStorage.getItem(dateKey(year, month, day)) || '';
  } catch {
    return '';
  }
}

function saveEntry(year, month, day, text) {
  const trimmed = text.trim();
  const key = dateKey(year, month, day);
  try {
    if (trimmed) localStorage.setItem(key, trimmed);
    else localStorage.removeItem(key);
  } catch {
    // localStorage full or blocked — silent no-op.
  }
}

// Day-of-week index where Mon = 0.
function mondayBasedDOW(jsDay) {
  return (jsDay + 6) % 7;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function listRecentDiaryEntries(limit = 7) {
  const entries = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DIARY_PREFIX)) {
        const date = k.slice(DIARY_PREFIX.length);
        const text = localStorage.getItem(k);
        if (text) entries.push({ date, text });
      }
    }
  } catch {
    return [];
  }
  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  return entries.slice(0, limit);
}

export default function Diary() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selectedDay, setSelectedDay] = useState(null);
  const [draft, setDraft] = useState('');
  const [tick, setTick] = useState(0); // bump after save to recompute filledDays

  const filledDays = useMemo(() => {
    void tick;
    const total = daysInMonth(year, month);
    const set = new Set();
    try {
      for (let d = 1; d <= total; d++) {
        if (localStorage.getItem(dateKey(year, month, d))) set.add(d);
      }
    } catch {
      // ignore
    }
    return set;
  }, [year, month, tick]);

  // Polskie święta państwowe — czerwone oznaczenie w siatce + nazwa w modalu dnia.
  const holidays = useMemo(() => getHolidays(year), [year]);

  const holidayFor = (day) => holidays[`${year}-${pad(month)}-${pad(day)}`] || null;
  const selectedHoliday = selectedDay != null ? holidayFor(selectedDay) : null;

  const firstDow = mondayBasedDOW(new Date(year, month - 1, 1).getDay());
  const total = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isCurrentDay = (d) =>
    d &&
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    d === today.getDate();

  const openDay = (d) => {
    setSelectedDay(d);
    setDraft(loadEntry(year, month, d));
  };

  const closeDay = () => {
    setSelectedDay(null);
    setDraft('');
  };

  const handleSave = () => {
    if (selectedDay == null) return;
    saveEntry(year, month, selectedDay, draft);
    setTick((t) => t + 1);
    closeDay();
  };

  const handleDelete = () => {
    if (selectedDay == null) return;
    saveEntry(year, month, selectedDay, '');
    setTick((t) => t + 1);
    closeDay();
  };

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  const formatDateLabel = (d) =>
    `${d} ${MONTHS[month - 1].toLowerCase()} ${year}`;

  return (
    <div className="px-5 pb-10">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Poprzedni miesiąc"
          className="cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 8, color: 'var(--gold-label-strong)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="font-serif italic" style={{ fontSize: '22px', color: 'var(--gold)' }}>
          {MONTHS[month - 1]} {year}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Następny miesiąc"
          className="cursor-pointer"
          style={{ background: 'none', border: 'none', padding: 8, color: 'var(--gold-label-strong)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] tracking-[2px] uppercase py-1"
            style={{ color: 'var(--text-faint)' }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1 p-2 rounded-[14px]"
        style={{ backgroundColor: 'var(--surface-card)', border: '0.5px solid var(--border-soft)', backdropFilter: 'blur(8px)' }}
      >
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          const has = filledDays.has(d);
          const today = isCurrentDay(d);
          const holiday = holidayFor(d);
          // Color precedence: today (gold) > non-today holiday (red) > has-note (gold) > plain.
          const textColor = today
            ? 'var(--text-primary)'
            : holiday
            ? '#fca5a5'
            : has
            ? 'var(--gold)'
            : 'var(--text-muted)';
          return (
            <button
              key={i}
              type="button"
              onClick={() => openDay(d)}
              title={holiday || undefined}
              className="aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer relative"
              style={{
                background: today
                  ? 'linear-gradient(135deg, rgba(201, 169, 110, 0.18), rgba(123, 201, 123, 0.12))'
                  : holiday
                  ? 'rgba(239, 68, 68, 0.10)'
                  : has
                  ? 'rgba(201, 169, 110, 0.08)'
                  : 'var(--surface-deep)',
                border: today
                  ? '1px solid #C9A96E'
                  : holiday
                  ? '0.5px solid rgba(239, 68, 68, 0.55)'
                  : has
                  ? '0.5px solid rgba(201, 169, 110, 0.35)'
                  : '0.5px solid var(--border-soft)',
                color: textColor,
                fontSize: '13px',
                fontWeight: today || holiday ? 500 : 400,
              }}
            >
              <span>{d}</span>
              {holiday && (
                <span
                  className="absolute"
                  style={{
                    top: 3,
                    right: 3,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    boxShadow: '0 0 5px rgba(239, 68, 68, 0.7)',
                  }}
                />
              )}
              {has && (
                <span
                  className="absolute"
                  style={{
                    bottom: 4,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: 'var(--gold)',
                    boxShadow: '0 0 6px rgba(201, 169, 110, 0.6)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] mt-3 font-serif italic" style={{ color: 'var(--text-faint)' }}>
        Kliknij dzień, żeby zapisać co dziś zrobiłeś w ogrodzie.
      </p>

      {selectedDay != null && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center"
          style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
          onClick={closeDay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full"
            style={{
              maxWidth: '460px',
              backgroundColor: 'var(--surface-modal)',
              border: '1px solid var(--border-medium)',
              borderRadius: '20px',
              padding: '20px',
              marginBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-serif italic" style={{ fontSize: '18px', color: 'var(--gold)' }}>
                  {formatDateLabel(selectedDay)}
                </h3>
                {selectedHoliday && (
                  <p
                    className="mt-1 inline-block px-2 py-0.5 rounded-full text-[11px] tracking-wide"
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '0.5px solid rgba(239, 68, 68, 0.45)',
                      color: '#fca5a5',
                    }}
                  >
                    🇵🇱 {selectedHoliday}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeDay}
                aria-label="Zamknij"
                style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-faint)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>
            <textarea lang="pl" spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Co dziś zrobiłeś w ogrodzie?"
              autoFocus
              rows={6}
              className="w-full bg-transparent text-[14px] font-serif italic px-3 py-2 rounded-lg outline-none resize-none"
              style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
            />
            <div className="flex gap-2 mt-4">
              {filledDays.has(selectedDay) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-full text-[12px] cursor-pointer"
                  style={{ background: 'none', border: '0.5px solid rgba(232, 100, 100, 0.4)', color: 'rgba(232, 100, 100, 0.85)' }}
                >
                  Usuń
                </button>
              )}
              <button
                type="button"
                onClick={closeDay}
                className="ml-auto px-4 py-2 rounded-full text-[12px] cursor-pointer"
                style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.trim() && !filledDays.has(selectedDay)}
                className="px-4 py-2 rounded-full text-[12px] cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                  color: '#1A1208',
                  border: 'none',
                  opacity: draft.trim() || filledDays.has(selectedDay) ? 1 : 0.4,
                }}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
