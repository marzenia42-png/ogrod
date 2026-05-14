import { useEffect, useState, useMemo, useRef } from 'react';
import { getGallery, addGalleryItem, deleteGalleryItem } from './lib/db.js';
import { compressImage } from './lib/plantStorage.js';
import { callFloraIdentify } from './lib/floraApi.js';

const ALBUMS = ['Wszystkie', 'Ogród', 'Warzywnik', 'Sad', 'Kwiaty', 'Inne'];

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Gallery({ onOpenFlora, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openYear, setOpenYear] = useState(null);
  const [albumFilter, setAlbumFilter] = useState('Wszystkie');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(null); // { dataUrl, album, taken_date, description }
  const [adding, setAdding] = useState(false);
  const [lightboxId, setLightboxId] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await getGallery();
      if (!cancelled) {
        setItems(data || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Group by year
  const byYear = useMemo(() => {
    const map = {};
    for (const it of items) {
      const y = it.year || (it.taken_date ? Number(it.taken_date.slice(0, 4)) : new Date().getFullYear());
      if (!map[y]) map[y] = [];
      map[y].push(it);
    }
    return map;
  }, [items]);

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  const handlePick = (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    compressImage(file, 1280, 0.78).then((dataUrl) => {
      setDraft({
        dataUrl,
        album: albumFilter !== 'Wszystkie' && albumFilter !== 'Inne' ? albumFilter : 'Ogród',
        taken_date: todayISO(),
        description: '',
      });
      setShowForm(true);
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    setAdding(true);
    try {
      const saved = await addGalleryItem({
        dataUrl: draft.dataUrl,
        album: draft.album,
        description: draft.description.trim(),
        date: draft.taken_date,
      });
      setItems((cur) => [saved, ...cur]);
      // Ask FLORA if user wants identification
      setTimeout(() => {
        if (typeof onOpenFlora === 'function') {
          onOpenFlora('Nowe zdjęcie w galerii 🌿 Chcesz żebym rozpoznała co tam rośnie? Wyślij to zdjęcie do mnie używając aparatu w panelu.');
        }
      }, 300);
    } finally {
      setAdding(false);
      setShowForm(false);
      setDraft(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Usunąć zdjęcie?')) return;
    await deleteGalleryItem(id);
    setItems((cur) => cur.filter((i) => i.id !== id));
    setLightboxId(null);
  };

  const lightboxItem = items.find((i) => i.id === lightboxId);

  // Year list view
  if (openYear == null) {
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
          <h2 className="font-serif italic" style={{ fontSize: 26, color: 'var(--gold)' }}>📸 Galeria ogrodu</h2>
        </section>

        <section className="px-5 pb-3">
          {loading && <p style={{ fontSize: 14, color: 'var(--text-faint)' }}>Ładuję zdjęcia...</p>}
          {!loading && items.length === 0 && (
            <div className="rounded-2xl py-8 px-4 text-center" style={{ background: 'var(--surface-faint)', border: '0.5px dashed var(--border-medium)' }}>
              <p className="font-serif italic" style={{ color: 'var(--text-muted)', fontSize: 15 }}>
                Galeria jest pusta.
              </p>
              <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-faint)' }}>Kliknij + żeby dodać pierwsze zdjęcie.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {years.map((y) => {
              const list = byYear[y];
              const cover = list[0]?.photo_data || list[0]?.dataUrl;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => setOpenYear(y)}
                  className="rounded-2xl overflow-hidden relative cursor-pointer"
                  style={{ aspectRatio: '1', border: '0.5px solid var(--border-medium)', background: 'var(--surface-card)' }}
                >
                  {cover && (
                    <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 14 }}>
                    <p className="font-serif italic" style={{ fontSize: 26, color: '#F0E8D8', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>📁 {y}</p>
                    <p style={{ fontSize: 13, color: 'rgba(240,232,216,0.85)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                      {list.length} {list.length === 1 ? 'zdjęcie' : 'zdjęć'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { handlePick(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
        <FabAdd onClick={() => fileRef.current?.click()} />

        {showForm && draft && (
          <GalleryForm draft={draft} setDraft={setDraft} adding={adding} onSave={handleSave} onClose={() => { setShowForm(false); setDraft(null); }} />
        )}
      </div>
    );
  }

  // Year detail view
  const yearItems = (byYear[openYear] || []).filter((i) => albumFilter === 'Wszystkie' || i.album === albumFilter);
  return (
    <div style={{ paddingBottom: 100, animation: 'screenEnter 0.2s ease' }}>
      <header className="px-5 pt-3 pb-2">
        <button type="button" onClick={() => setOpenYear(null)} className="cursor-pointer mb-2"
          style={{ fontSize: 13, padding: '6px 12px', borderRadius: 999, background: 'var(--surface-card-soft)', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
          ← Wszystkie lata
        </button>
        <h2 className="font-serif italic" style={{ fontSize: 26, color: 'var(--gold)' }}>📸 {openYear}</h2>
      </header>

      <section className="px-5 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {ALBUMS.map((a) => {
            const active = albumFilter === a;
            return (
              <button key={a} type="button" onClick={() => setAlbumFilter(a)}
                style={{
                  padding: '6px 13px', borderRadius: 999, fontSize: 13,
                  background: active ? 'linear-gradient(135deg, rgba(201,169,110,0.22), rgba(123,201,123,0.12))' : 'var(--surface-card-soft)',
                  border: active ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                  color: active ? 'var(--gold)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>{a}</button>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-3">
        {yearItems.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--text-faint)', textAlign: 'center', padding: '20px 0' }}>
            Brak zdjęć {albumFilter !== 'Wszystkie' && `w albumie "${albumFilter}"`}.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {yearItems.map((it) => (
            <button key={it.id} type="button" onClick={() => setLightboxId(it.id)}
              className="rounded-xl overflow-hidden cursor-pointer relative"
              style={{ aspectRatio: '1', border: '0.5px solid var(--border-soft)' }}>
              <img src={it.photo_data || it.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      </section>

      <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { handlePick(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
      <FabAdd onClick={() => fileRef.current?.click()} />

      {showForm && draft && (
        <GalleryForm draft={draft} setDraft={setDraft} adding={adding} onSave={handleSave} onClose={() => { setShowForm(false); setDraft(null); }} />
      )}

      {lightboxItem && (
        <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.95)' }} onClick={() => setLightboxId(null)}>
          <img src={lightboxItem.photo_data || lightboxItem.dataUrl} alt="" style={{ maxWidth: '95vw', maxHeight: '70vh', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
          {lightboxItem.description && (
            <p style={{ marginTop: 14, color: '#F0E8D8', fontSize: 14, maxWidth: '90vw', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>{lightboxItem.description}</p>
          )}
          <p style={{ marginTop: 6, color: 'rgba(240,232,216,0.6)', fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
            {(lightboxItem.taken_date || '').slice(0, 10)} · {lightboxItem.album}
          </p>
          <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => handleDelete(lightboxItem.id)}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(229,75,75,0.20)', color: '#E54B4B', border: '1px solid rgba(229,75,75,0.55)', fontSize: 13, cursor: 'pointer' }}>🗑️ Usuń</button>
            <button type="button" onClick={() => setLightboxId(null)}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: '#F0E8D8', border: '1px solid rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer' }}>Zamknij</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FabAdd({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Dodaj zdjęcie"
      style={{
        position: 'fixed', left: 20, bottom: 'calc(20px + env(safe-area-inset-bottom))',
        width: 54, height: 54, borderRadius: '50%',
        background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208',
        border: 'none', cursor: 'pointer', fontSize: 26, lineHeight: 1,
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)', zIndex: 800,
      }}>+</button>
  );
}

function GalleryForm({ draft, setDraft, adding, onSave, onClose }) {
  return (
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 1200, background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full"
        style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface-modal)', borderRadius: '20px 20px 0 0', border: '0.5px solid var(--border-strong)' }}>
        <div className="px-5 py-4 sticky top-0" style={{ background: 'var(--surface-modal)', borderBottom: '0.5px solid var(--border-soft)' }}>
          <div className="flex justify-between items-center">
            <h3 className="font-serif italic" style={{ fontSize: 20, color: 'var(--gold)' }}>Nowe zdjęcie</h3>
            <button type="button" onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
          </div>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <img src={draft.dataUrl} alt="" style={{ width: '100%', maxHeight: 280, borderRadius: 12, objectFit: 'cover' }} />
          <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Album
            <select value={draft.album} onChange={(e) => setDraft({ ...draft, album: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg"
              style={{ fontSize: 15, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
              {ALBUMS.filter((a) => a !== 'Wszystkie').map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Data
            <input type="date" value={draft.taken_date} onChange={(e) => setDraft({ ...draft, taken_date: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg"
              style={{ fontSize: 15, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }} />
          </label>
          <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Opis (opcjonalny)
            <input type="text" lang="pl" spellCheck={true} autoCorrect="on" autoCapitalize="sentences" maxLength={100} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="np. Pierwsze pomidory, lipiec"
              className="mt-1 w-full px-3 py-2 rounded-lg"
              style={{ fontSize: 15, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }} />
          </label>
          <button type="button" onClick={onSave} disabled={adding}
            style={{ padding: '12px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer', opacity: adding ? 0.5 : 1 }}>
            {adding ? 'Zapisuję...' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
