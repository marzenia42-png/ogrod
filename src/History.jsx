import { useEffect, useState, useMemo } from 'react';
import {
  getYearSummary, upsertYearSummary,
  getPlants, getSeasons, getSeasonEntries, getSprays, getGallery,
} from './lib/db.js';
import { PLANTS } from './data/plants.js';

const ENTRY_BADGES = {
  note: { icon: '📝', label: 'Notatka', color: '#9B9B9B' },
  spray: { icon: '💊', label: 'Oprysk', color: '#E8A87C' },
  fertilizer: { icon: '🌿', label: 'Nawóz', color: '#78C47E' },
  observation: { icon: '👁️', label: 'Obserwacja', color: '#5B8DB8' },
};

export default function History({ onBack }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState('');
  const [allEntries, setAllEntries] = useState([]); // { date, plantName, type, text }
  const [sprays, setSprays] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  const yearTabs = useMemo(() => {
    const years = new Set([currentYear, currentYear - 1, currentYear - 2]);
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await getYearSummary(year);
      const plants = await getPlants();
      const sp = await getSprays();
      const ga = await getGallery({ year });

      // Aggregate season entries from all plants for this year.
      const entries = [];
      for (const p of plants) {
        try {
          const seasons = await getSeasons(p.id);
          const season = seasons.find((sn) => sn.year === year);
          if (!season) continue;
          const list = await getSeasonEntries(season.id);
          for (const e of list) {
            entries.push({
              date: e.entry_date,
              plantId: p.id,
              plantName: p.name + (p.variety_name ? ` · ${p.variety_name}` : ''),
              type: e.entry_type,
              text: e.entry_text,
              id: e.id,
            });
          }
        } catch { /* ignore per-plant */ }
      }
      entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      if (!cancelled) {
        setSummary((s && s.content) || '');
        setAllEntries(entries);
        setSprays(sp.filter((x) => (x.spray_date || '').startsWith(String(year))));
        setGallery(ga);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [year]);

  const handleSaveSummary = async () => {
    await upsertYearSummary(year, summary);
  };

  return (
    <div style={{ paddingBottom: 100, animation: 'screenEnter 0.2s ease' }}>
      <section className="px-5 pt-3 pb-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer mb-2"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, padding: '7px 14px', borderRadius: 999,
              background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)',
              color: 'var(--text-primary)', fontWeight: 500,
            }}
          >← Wróć</button>
        )}
        <h2 className="font-serif italic" style={{ fontSize: 26, color: 'var(--gold)' }}>📖 Historia ogrodu</h2>
      </section>

      <section className="px-5 pb-3">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {yearTabs.map((y) => {
            const active = y === year;
            return (
              <button key={y} type="button" onClick={() => setYear(y)}
                style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 14,
                  background: active ? 'linear-gradient(135deg, rgba(201,169,110,0.22), rgba(123,201,123,0.12))' : 'var(--surface-card-soft)',
                  border: active ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                  color: active ? 'var(--gold)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400, fontVariantNumeric: 'tabular-nums', cursor: 'pointer', whiteSpace: 'nowrap',
                }}>{y}</button>
            );
          })}
        </div>
      </section>

      {loading && <p className="px-5" style={{ fontSize: 14, color: 'var(--text-faint)' }}>Ładuję rok {year}...</p>}

      {!loading && (
        <>
          <section className="px-5 pb-4">
            <p className="font-mono uppercase tracking-widest mb-2" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Notatka roku</p>
            <textarea lang="pl" spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={handleSaveSummary}
              rows={3}
              placeholder={`Jak wspominasz rok ${year}? Co się udało, co było trudne?`}
              className="w-full px-3 py-2 rounded-lg resize-none"
              style={{ fontSize: 14, background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
            />
          </section>

          <section className="px-5 pb-4">
            <p className="font-mono uppercase tracking-widest mb-2" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Wpisy chronologicznie ({allEntries.length})</p>
            {allEntries.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', padding: '12px 0' }}>Brak wpisów w roku {year}.</p>
            )}
            <div className="flex flex-col gap-2">
              {allEntries.slice(0, 50).map((e) => {
                const badge = ENTRY_BADGES[e.type] || ENTRY_BADGES.note;
                return (
                  <div key={e.id} className="rounded-xl p-3" style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-soft)' }}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontSize: 12, color: 'var(--gold-label)', fontVariantNumeric: 'tabular-nums' }}>{(e.date || '').slice(0, 10)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{e.plantName}</span>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 999, background: `${badge.color}25`, color: badge.color, border: `0.5px solid ${badge.color}55` }}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{e.text}</p>
                  </div>
                );
              })}
              {allEntries.length > 50 && (
                <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', padding: '8px 0' }}>
                  ...i jeszcze {allEntries.length - 50} wpisów
                </p>
              )}
            </div>
          </section>

          {gallery.length > 0 && (
            <section className="px-5 pb-4">
              <p className="font-mono uppercase tracking-widest mb-2" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Zdjęcia ({gallery.length})</p>
              <div className="grid grid-cols-3 gap-1.5">
                {gallery.slice(0, 6).map((g) => (
                  <div key={g.id} className="rounded-lg overflow-hidden" style={{ aspectRatio: '1', border: '0.5px solid var(--border-soft)' }}>
                    <img src={g.photo_data || g.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {sprays.length > 0 && (
            <section className="px-5 pb-4">
              <p className="font-mono uppercase tracking-widest mb-2" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Środki w {year} ({sprays.length})</p>
              <div className="flex flex-col gap-1.5">
                {sprays.slice(0, 20).map((s) => (
                  <div key={s.id} className="rounded-lg px-3 py-2 flex justify-between items-center" style={{ background: 'var(--surface-faint)', border: '0.5px solid var(--border-soft)' }}>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{s.product_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                        {(s.spray_date || '').slice(0, 10)}
                        {s.concentration && ` · ${s.concentration}`}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(201,169,110,0.15)', color: 'var(--gold)' }}>
                      {s.product_type === 'fertilizer' ? '🌿' : '💊'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
