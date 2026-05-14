import { useEffect, useState } from 'react';
import { getFloraDailyTip } from './lib/floraApi.js';
import { MONTHS } from './data/plants.js';

const SHOWN_KEY = 'garden-banner-shown';

function readShown() {
  try { return JSON.parse(localStorage.getItem(SHOWN_KEY) || '{}'); }
  catch { return {}; }
}
function markShown(kind, ymd) {
  try {
    const cur = readShown();
    cur[kind] = ymd;
    localStorage.setItem(SHOWN_KEY, JSON.stringify(cur));
  } catch { /* ignore */ }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const SEASONAL_TIPS = {
  3: 'Marzec to czas oprysków zapobiegawczych miedzianem na drzewach pestkowych.',
  4: 'Kwiecień — sadzenie róż, dosadzenie cebul. Pierwsza dawka azotowego pod owocowe.',
  5: 'Maj to czas oprysków zapobiegawczych! Przed kwitnieniem — Topsin lub Switch.',
  6: 'Czerwiec — podlewanie regularne, kontrola mszyc, pierwsze cięcia żywopłotów.',
  7: 'Lipiec — letnie cięcie wiśni i czereśni po owocowaniu. Susza — głębokie podlewanie.',
  8: 'Sierpień — zbiór nasion, kompostowanie. Cięcie róż powtarzających kwitnienie.',
  9: 'Wrzesień — sadzenie cebulowych. Ostatnie nawożenie potasowo-fosforowe.',
  10: 'Październik — okrycie wrażliwych, ściółkowanie. Sadzenie drzew i krzewów.',
  11: 'Listopad — okrycie róż i magnolii. Czyszczenie skrzynek i narzędzi.',
  12: 'Grudzień — czas planowania. Przejrzyj katalogi, zamów nasiona na wiosnę.',
  1: 'Styczeń — kontrola przechowywanych warzyw i bulw. Plan ogrodu.',
  2: 'Luty — cięcie krzewów owocowych przed ruszeniem wegetacji.',
};

/**
 * Pojedynczy banner FLORA na stronie głównej. Priorytet (top → bottom):
 *   1. Zaniedbana roślina (>14 dni bez wpisu w sezonie / events)
 *   2. Ostrzeżenie mrozu (min <5°C)
 *   3. Porada sezonowa (1× dziennie)
 *   4. Daily tip (z FLORA Edge Function, cache per day)
 *
 * Props:
 *   plants — Array<{ id, name, lastActivity?: string ISO }>
 *   weather — z App.jsx (Open-Meteo response)
 *   currentMonth — 1-12
 *   onOpenFlora(seedMessage) — otwiera FLORA z konkretną wiadomością
 */
export default function ProactiveBanner({ plants = [], weather, currentMonth, onOpenFlora, context }) {
  const [tip, setTip] = useState(null);
  const [tipLoading, setTipLoading] = useState(false);
  const today = todayISO();
  const shown = readShown();

  // Choose ONE banner per priority.
  // 1. Neglected plant (>14 days no activity)
  const neglected = plants.find((p) => {
    const last = p.lastActivity ? new Date(p.lastActivity).getTime() : 0;
    if (!last) return false;
    const daysAgo = Math.floor((Date.now() - last) / (24 * 60 * 60 * 1000));
    return daysAgo >= 14;
  });

  // 2. Frost warning (min nightly temp < 5°C)
  const minTonight = weather?.daily?.temperature_2m_min?.[0];
  const frostAlert = typeof minTonight === 'number' && minTonight < 5;

  // 3. Seasonal advice (1x per day)
  const seasonalTip = SEASONAL_TIPS[currentMonth || (new Date().getMonth() + 1)];
  const showSeasonal = seasonalTip && shown.seasonal !== today;

  // Fetch daily_tip lazily (1× per day, cached in floraApi).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (neglected || frostAlert || showSeasonal) return; // higher priority banners present
      setTipLoading(true);
      try {
        const t = await getFloraDailyTip(context || {});
        if (!cancelled && t) setTip(t);
      } catch { /* ignore */ }
      finally { if (!cancelled) setTipLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [neglected, frostAlert, showSeasonal, context?.monthName]);

  // Pick the active banner
  let active = null;
  if (neglected) {
    active = {
      kind: 'neglected',
      title: `🌿 ${neglected.name} czeka na uwagę`,
      body: `Ostatni wpis ${neglected.daysAgo || '14+'} dni temu.`,
      seed: `Mam roślinę "${neglected.name}" której nie dotykałem od ponad 14 dni. Co powinienem sprawdzić teraz?`,
    };
  } else if (frostAlert) {
    active = {
      kind: 'frost',
      title: `🌡️ Dziś w nocy ${Math.round(minTonight)}°C`,
      body: 'Sprawdź wrażliwe rośliny — okryj lub przenieś do domu.',
      seed: `Prognoza pokazuje minimum ${Math.round(minTonight)}°C dziś w nocy. Które z moich roślin są wrażliwe i jak je zabezpieczyć?`,
    };
  } else if (showSeasonal) {
    active = {
      kind: 'seasonal',
      title: `🌸 ${MONTHS[(currentMonth || 1) - 1]} w ogrodzie`,
      body: seasonalTip,
      seed: seasonalTip,
      onDismiss: () => markShown('seasonal', today),
    };
  } else if (tip) {
    active = {
      kind: 'daily',
      title: '🌿 Porada na dziś',
      body: tip,
      seed: tip,
    };
  }

  if (!active && !tipLoading) return null;

  if (tipLoading && !active) {
    return null;
  }

  const handleClick = () => onOpenFlora?.(active.seed);
  const handleDismiss = (e) => {
    e.stopPropagation();
    if (active.onDismiss) active.onDismiss();
    if (active.kind === 'frost') markShown('frost', today);
    if (active.kind === 'daily') markShown('daily', today);
    if (active.kind === 'neglected') markShown('neglected', today);
    // Force a re-render: not great but localStorage change isn't reactive; user can refresh.
    window.dispatchEvent(new Event('garden-banner-dismissed'));
  };

  if (shown[active.kind] === today) return null;

  return (
    <section className="px-5 pb-3">
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left cursor-pointer relative rounded-2xl px-4 py-3"
        style={{
          background: 'var(--banner-bg)',
          color: 'var(--banner-text)',
          border: '1px solid rgba(0,0,0,0.10)',
          boxShadow: '0 4px 14px rgba(201, 169, 110, 0.25)',
          paddingRight: 40,
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{active.title}</p>
        <p style={{ fontSize: 13, marginTop: 4, lineHeight: 1.35, opacity: 0.9 }}>{active.body}</p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Zamknij"
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(26, 18, 8, 0.10)', color: 'var(--banner-text)',
            border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}
        >×</button>
      </button>
    </section>
  );
}
