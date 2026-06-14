import { useEffect, useState } from 'react';
import { loadDiagnoses, deleteDiagnosis } from './lib/plantStorage.js';

function fmtDate(iso) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

/**
 * Historia diagnoz FLORA dla jednej rośliny — oś czasu zdjęć problemów + diagnoz AI.
 * Pozwala podejrzeć każdy wpis i porównać "przed/po" (najstarsze ↔ najnowsze),
 * żeby zobaczyć czy leczenie działa.
 */
export default function DiagnosisHistory({ plantId }) {
  const [list, setList] = useState([]);
  const [fullscreen, setFullscreen] = useState(null);
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    setList(loadDiagnoses(plantId));
  }, [plantId]);

  const handleDelete = (id) => {
    const next = deleteDiagnosis(plantId, id);
    setList(next);
    setFullscreen(null);
  };

  const oldest = list.length ? list[list.length - 1] : null;
  const newest = list.length ? list[0] : null;

  return (
    <section className="px-5 pt-3 pb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--gold-label)' }}>
          Historia diagnoz FLORA{list.length > 0 ? ` (${list.length})` : ''}
        </p>
        {list.length >= 2 && (
          <button
            type="button"
            onClick={() => setCompare(true)}
            style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12,
              background: 'transparent', color: 'var(--gold)', border: '0.5px solid var(--gold)', cursor: 'pointer',
            }}
          >↔ Porównaj postęp</button>
        )}
      </div>

      {list.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '14px 0', background: 'var(--surface-card)', borderRadius: 12, border: '0.5px dashed var(--border-medium)' }}>
          Brak diagnoz. Zrób zdjęcie problemu w FLORA (📷 → „Choroba / problem") i zapisz wynik tutaj.
        </p>
      )}

      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {list.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setFullscreen(d)}
              className="relative rounded-xl overflow-hidden cursor-pointer"
              style={{ aspectRatio: '1', border: '0.5px solid var(--border-soft)' }}
            >
              {d.dataUrl
                ? <img src={d.dataUrl} alt={`Diagnoza ${d.date}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <span style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 22 }}>📝</span>}
              <span
                style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  fontSize: 10, color: '#F0E8D8', textAlign: 'center',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '8px 2px 3px',
                }}
              >{fmtDate(d.date)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Podgląd pojedynczej diagnozy */}
      {fullscreen && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{ zIndex: 1100, background: 'rgba(0,0,0,0.95)', padding: 16 }}
          onClick={() => setFullscreen(null)}
        >
          {fullscreen.dataUrl && (
            <img src={fullscreen.dataUrl} alt="" style={{ maxWidth: '92vw', maxHeight: '50vh', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
          )}
          <p style={{ marginTop: 12, color: 'var(--gold)', fontSize: 13 }} onClick={(e) => e.stopPropagation()}>
            {fmtDate(fullscreen.date)}
          </p>
          <p
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: 8, color: '#F0E8D8', fontSize: 13, lineHeight: 1.5, textAlign: 'left', maxWidth: '92vw', maxHeight: '28vh', overflowY: 'auto', whiteSpace: 'pre-wrap' }}
          >
            {fullscreen.text || '—'}
          </p>
          <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => handleDelete(fullscreen.id)}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(229,75,75,0.20)', color: '#E54B4B', border: '1px solid rgba(229,75,75,0.55)', fontSize: 13, cursor: 'pointer' }}>🗑️ Usuń</button>
            <button type="button" onClick={() => setFullscreen(null)}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: '#F0E8D8', border: '1px solid rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer' }}>Zamknij</button>
          </div>
        </div>
      )}

      {/* Porównanie: najstarsze ↔ najnowsze */}
      {compare && oldest && newest && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{ zIndex: 1100, background: 'rgba(0,0,0,0.95)', padding: 16 }}
          onClick={() => setCompare(false)}
        >
          <p style={{ color: 'var(--gold)', fontSize: 14, marginBottom: 12 }} onClick={(e) => e.stopPropagation()}>
            Postęp: {fmtDate(oldest.date)} → {fmtDate(newest.date)}
          </p>
          <div className="flex gap-3" style={{ maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
            {[oldest, newest].map((d, i) => (
              <div key={d.id} style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{i === 0 ? 'Przed' : 'Teraz'} · {fmtDate(d.date)}</p>
                {d.dataUrl
                  ? <img src={d.dataUrl} alt="" style={{ width: '100%', maxHeight: '52vh', objectFit: 'contain', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.2)' }} />
                  : <div style={{ fontSize: 28, padding: 20 }}>📝</div>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setCompare(false)}
            style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: '#F0E8D8', border: '1px solid rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer' }}
            onClickCapture={(e) => e.stopPropagation()}>Zamknij</button>
        </div>
      )}
    </section>
  );
}
