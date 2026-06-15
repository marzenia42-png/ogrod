import { useEffect, useRef, useState } from 'react';
import { getFloraWeeklyPlan } from './lib/floraApi.js';
import { MONTHS } from './data/plants.js';
import { listRecentDiaryEntries } from './Diary.jsx';

// Pełny kontekst dla FLORY — miesiąc, data, pogoda, rośliny, profil, notatki, dziennik.
function buildCtx({ weather, currentMonth, plants, profile, notes }) {
  const now = new Date();
  const monthName = MONTHS[(currentMonth ?? now.getMonth() + 1) - 1] || '';
  return {
    monthName,
    dateStr: now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }),
    timeStr: now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    weather: weather?.current
      ? {
          temperature: weather.current.temperature_2m,
          humidity: weather.current.relative_humidity_2m,
          wind: weather.current.wind_speed_10m,
          minToday: weather.daily?.temperature_2m_min?.[0],
          maxToday: weather.daily?.temperature_2m_max?.[0],
          precipitation: weather.daily?.precipitation_sum?.[0],
        }
      : null,
    notes: (notes || []).slice(0, 5).map((n) => ({ date: n.date, text: n.text })),
    diary: listRecentDiaryEntries(7),
    plants: (plants || []).map((p) => ({
      name: p.name,
      location: p.location || '',
      recentEvents: (p.recentEvents || []).map((e) => ({ type: e.type, date: e.date, note: e.note || '' })),
    })),
    profile: profile && (profile.experience || profile.preferences || profile.notes)
      ? { experience: profile.experience, preferences: profile.preferences, notes: profile.notes || '' }
      : null,
  };
}

/**
 * Karta "Plan na ten tydzień" — FLORA układa 4-7 konkretnych zadań dla roślin
 * użytkownika, dopasowanych do miesiąca i pogody. Cache 1×/dzień (force = odśwież).
 * Każde zadanie klikalne → otwiera FLORA z pytaniem "jak to zrobić".
 */
export default function WeeklyPlan({ plants = [], weather, currentMonth, profile = null, notes = [], onOpenFlora }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const fetchedRef = useRef(false);

  const load = async (force = false) => {
    setLoading(true);
    setError(false);
    try {
      const p = await getFloraWeeklyPlan(buildCtx({ weather, currentMonth, plants, profile, notes }), force);
      setPlan(p);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Poczekaj aż pogoda się załaduje, żeby plan ją uwzględnił.
  useEffect(() => {
    if (fetchedRef.current) return;
    if (!weather?.current) return;
    fetchedRef.current = true;
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather]);

  // Fallback: jeśli pogoda nie dojdzie w 4 s (np. offline), pobierz mimo to.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!fetchedRef.current) {
        fetchedRef.current = true;
        load(false);
      }
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nic do pokazania (pusty plan bez błędu i bez ładowania) → nie zaśmiecaj ekranu.
  if (!loading && !error && Array.isArray(plan) && plan.length === 0) return null;
  if (plan === null && !loading && !error) return null;

  const seedFor = (item) =>
    `Pomóż mi z zadaniem z planu: "${item.action}"${item.plant ? ` dla: ${item.plant}` : ''}. Jak dokładnie to zrobić — preparat, dawka, termin i na co uważać?`;

  return (
    <section className="px-5 pb-3">
      <div
        className="rounded-2xl px-4 py-3"
        style={{
          background: 'rgba(8, 18, 12, 0.55)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid var(--border-leaf-soft)',
          borderLeft: '3px solid var(--gold)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.30), 0 0 22px rgba(201, 169, 110, 0.10)',
        }}
      >
        {/* Nagłówek */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-2 cursor-pointer"
            style={{ background: 'none', border: 'none', padding: 0 }}
            aria-expanded={!collapsed}
          >
            <span
              className="font-serif italic"
              style={{ fontSize: 16, fontWeight: 500, color: 'var(--gold)', letterSpacing: '0.2px' }}
            >
              🗓️ Plan na ten tydzień
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
          </button>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            aria-label="Odśwież plan"
            title="Ułóż plan od nowa"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 15, padding: 4, opacity: loading ? 0.4 : 1,
            }}
          >
            ⟳
          </button>
        </div>

        {!collapsed && (
          <div style={{ marginTop: 8 }}>
            {loading && (
              <p className="font-serif italic" style={{ fontSize: 13, color: 'rgba(130,198,138,0.7)' }}>
                FLORA układa plan<span className="flora-dots">…</span>
              </p>
            )}

            {error && !loading && (
              <button
                type="button"
                onClick={() => load(true)}
                className="cursor-pointer"
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'left' }}
              >
                Nie udało się ułożyć planu — dotknij, by spróbować ponownie.
              </button>
            )}

            {!loading && !error && Array.isArray(plan) && plan.length > 0 && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {plan.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onOpenFlora?.(seedFor(item))}
                      className="w-full text-left cursor-pointer rounded-xl"
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        background: 'rgba(255,255,255,0.03)',
                        border: '0.5px solid var(--border-soft)',
                        padding: '8px 10px',
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0, minWidth: 38, textAlign: 'center',
                          fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
                          color: '#0a0f0a', background: 'var(--gold)',
                          borderRadius: 999, padding: '3px 8px', marginTop: 1,
                        }}
                      >
                        {item.day || '•'}
                      </span>
                      <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                        {item.plant && (
                          <b style={{ color: 'var(--leaf)', fontWeight: 600 }}>{item.plant}: </b>
                        )}
                        {item.action}
                        {item.note ? (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}> · {item.note}</span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8, fontStyle: 'italic' }}>
                  Dotknij zadanie, a FLORA wyjaśni jak je wykonać.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
