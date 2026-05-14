import { useEffect, useState, useMemo } from 'react';
import {
  getSprays, addSpray, updateSpray, deleteSpray,
  getPlants, ensureSeason, addSeasonEntry,
} from './lib/db.js';
import { PLANTS } from './data/plants.js';

const PRODUCT_TYPES = [
  { id: 'spray',       icon: '💊', label: 'Oprysk',   color: '#E8A87C' },
  { id: 'fertilizer',  icon: '🌿', label: 'Nawóz',    color: '#78C47E' },
];

const TABS = [
  { id: 'all',         label: 'Wszystkie' },
  { id: 'spray',       label: 'Opryski' },
  { id: 'fertilizer',  label: 'Nawozy' },
];

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Sprays({ customPlants = [] }) {
  const [sprays, setSpraysState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    product_name: '',
    product_type: 'spray',
    spray_date: todayISO(),
    concentration: '',
    target_plants: [],
    target_mode: 'all', // 'all' | 'select'
    notes: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await getSprays();
      if (!cancelled) {
        setSpraysState(data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Combined list of plant names — built-in + custom — for the multiselect.
  const plantOptions = useMemo(() => {
    const builtin = PLANTS.map((p) => ({ id: p.key, name: p.name }));
    const custom = customPlants.map((p) => ({
      id: p.id,
      name: p.variety ? `${p.name} · ${p.variety}` : p.name,
    }));
    return [...builtin, ...custom];
  }, [customPlants]);

  const filtered = useMemo(() => {
    if (tab === 'all') return sprays;
    return sprays.filter((s) => s.product_type === tab);
  }, [sprays, tab]);

  const resetDraft = () => {
    setDraft({
      product_name: '',
      product_type: 'spray',
      spray_date: todayISO(),
      concentration: '',
      target_plants: [],
      target_mode: 'all',
      notes: '',
    });
    setEditingId(null);
  };

  const openForm = () => { resetDraft(); setShowForm(true); };
  const closeForm = () => { setShowForm(false); resetDraft(); };

  const handleSave = async () => {
    if (!draft.product_name.trim()) return;
    const payload = {
      product_name: draft.product_name.trim(),
      product_type: draft.product_type,
      spray_date: draft.spray_date,
      concentration: draft.concentration.trim() || null,
      target_plants: draft.target_mode === 'all'
        ? ['Wszystkie']
        : draft.target_plants.map((id) => plantOptions.find((p) => p.id === id)?.name).filter(Boolean),
      notes: draft.notes.trim() || null,
    };
    if (editingId) {
      await updateSpray(editingId, payload);
      setSpraysState((s) => s.map((x) => x.id === editingId ? { ...x, ...payload } : x));
    } else {
      const saved = await addSpray(payload);
      setSpraysState((s) => [saved, ...s]);
      // Auto-add to garden_season_entries for each targeted plant.
      if (draft.target_mode === 'select' && draft.target_plants.length > 0) {
        const year = new Date(draft.spray_date).getFullYear();
        const text = `${PRODUCT_TYPES.find((t) => t.id === draft.product_type)?.label || 'Środek'}: ${payload.product_name}${payload.concentration ? ` (${payload.concentration})` : ''}${payload.notes ? ` — ${payload.notes}` : ''}`;
        for (const plantId of draft.target_plants) {
          try {
            const season = await ensureSeason(plantId, year);
            await addSeasonEntry(season.id, { text, type: draft.product_type, date: draft.spray_date });
          } catch (e) { console.warn('Auto-entry failed for', plantId, e?.message || e); }
        }
      }
    }
    closeForm();
  };

  const handleEdit = (sprayRow) => {
    setDraft({
      product_name: sprayRow.product_name,
      product_type: sprayRow.product_type || 'spray',
      spray_date: (sprayRow.spray_date || '').slice(0, 10),
      concentration: sprayRow.concentration || '',
      target_plants: [], // editing target_plants is non-trivial; clear and re-pick
      target_mode: 'all',
      notes: sprayRow.notes || '',
    });
    setEditingId(sprayRow.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Usunąć ten wpis?')) return;
    await deleteSpray(id);
    setSpraysState((s) => s.filter((x) => x.id !== id));
  };

  const togglePlantInDraft = (id) => {
    setDraft((d) => ({
      ...d,
      target_plants: d.target_plants.includes(id)
        ? d.target_plants.filter((x) => x !== id)
        : [...d.target_plants, id],
    }));
  };

  return (
    <div style={{ paddingBottom: 100, animation: 'screenEnter 0.2s ease' }}>
      <header className="px-5 pt-3 pb-2">
        <h2 className="font-serif italic" style={{ fontSize: 26, color: 'var(--gold)' }}>💊 Środki i nawozy</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Historia oprysków i nawożeń, chronologicznie.
        </p>
      </header>

      <section className="px-5 pb-3">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 13,
                  background: active ? 'linear-gradient(135deg, rgba(201,169,110,0.22), rgba(123,201,123,0.12))' : 'var(--surface-card-soft)',
                  border: active ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                  color: active ? 'var(--gold)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >{t.label}</button>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-3">
        {loading && <p style={{ fontSize: 14, color: 'var(--text-faint)' }}>Ładuję...</p>}
        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl py-8 px-4 text-center" style={{ background: 'var(--surface-faint)', border: '0.5px dashed var(--border-medium)' }}>
            <p className="font-serif italic" style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              Brak wpisów {tab !== 'all' && `w kategorii ${TABS.find((t) => t.id === tab)?.label.toLowerCase()}`}.
            </p>
            <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-faint)' }}>
              Kliknij <strong style={{ color: 'var(--gold)' }}>+</strong> żeby dodać pierwszy oprysk lub nawóz.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {filtered.map((s) => {
            const tdef = PRODUCT_TYPES.find((t) => t.id === s.product_type) || PRODUCT_TYPES[0];
            return (
              <div key={s.id} className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)' }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontSize: 12, color: 'var(--gold-label)', fontVariantNumeric: 'tabular-nums' }}>{(s.spray_date || '').slice(0, 10)}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: `${tdef.color}20`, color: tdef.color, border: `0.5px solid ${tdef.color}55` }}>
                        {tdef.icon} {tdef.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{s.product_name}</p>
                    {s.concentration && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Stężenie/dawka: {s.concentration}</p>}
                    {Array.isArray(s.target_plants) && s.target_plants.length > 0 && (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        🌿 {s.target_plants.join(', ')}
                      </p>
                    )}
                    {s.notes && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>{s.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => handleEdit(s)} style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', color: 'var(--gold)', border: '0.5px solid var(--border-soft)', fontSize: 12, cursor: 'pointer' }}>✏️</button>
                    <button type="button" onClick={() => handleDelete(s.id)} style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', color: 'var(--text-faint)', border: '0.5px solid var(--border-soft)', fontSize: 12, cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAB + */}
      <button
        type="button"
        onClick={openForm}
        aria-label="Dodaj oprysk lub nawóz"
        style={{
          position: 'fixed', right: 20, bottom: 'calc(90px + env(safe-area-inset-bottom))',
          width: 54, height: 54, borderRadius: '50%',
          background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208',
          border: 'none', cursor: 'pointer', fontSize: 26, lineHeight: 1,
          boxShadow: '0 6px 18px rgba(0,0,0,0.35)', zIndex: 800,
        }}
      >+</button>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 1200, background: 'rgba(0,0,0,0.7)' }} onClick={closeForm}>
          <div
            className="w-full"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
              background: 'var(--surface-modal)', borderRadius: '20px 20px 0 0',
              border: '0.5px solid var(--border-strong)',
            }}
          >
            <div className="px-5 py-4 sticky top-0" style={{ background: 'var(--surface-modal)', borderBottom: '0.5px solid var(--border-soft)' }}>
              <div className="flex justify-between items-center">
                <h3 className="font-serif italic" style={{ fontSize: 20, color: 'var(--gold)' }}>
                  {editingId ? 'Edytuj wpis' : 'Nowy wpis'}
                </h3>
                <button type="button" onClick={closeForm} style={{ background: 'none', color: 'var(--text-muted)', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <div className="flex gap-2">
                {PRODUCT_TYPES.map((t) => {
                  const active = draft.product_type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, product_type: t.id }))}
                      style={{
                        flex: 1, padding: '11px 12px', borderRadius: 10, fontSize: 14,
                        background: active ? `${t.color}25` : 'var(--surface-faint)',
                        border: active ? `1px solid ${t.color}` : '0.5px solid var(--border-soft)',
                        color: active ? t.color : 'var(--text-secondary)',
                        fontWeight: active ? 600 : 400, cursor: 'pointer',
                      }}
                    >{t.icon} {t.label}</button>
                  );
                })}
              </div>

              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Produkt
                <input
                  type="text" value={draft.product_name}
                  onChange={(e) => setDraft((d) => ({ ...d, product_name: e.target.value }))}
                  placeholder={draft.product_type === 'spray' ? 'np. Topsin M, Miedzian, Karate Zeon' : 'np. NPK 13-13-21, Azofoska'}
                  className="mt-1 w-full px-3 py-2 rounded-lg"
                  style={{ fontSize: 15, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
                />
              </label>

              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Data
                <input
                  type="date" value={draft.spray_date}
                  onChange={(e) => setDraft((d) => ({ ...d, spray_date: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg"
                  style={{ fontSize: 15, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
                />
              </label>

              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Stężenie / dawka
                <input
                  type="text" value={draft.concentration}
                  onChange={(e) => setDraft((d) => ({ ...d, concentration: e.target.value }))}
                  placeholder="np. 0.1% lub 1 g/L"
                  className="mt-1 w-full px-3 py-2 rounded-lg"
                  style={{ fontSize: 15, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
                />
              </label>

              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Rośliny</p>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setDraft((d) => ({ ...d, target_mode: 'all', target_plants: [] }))}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                      background: draft.target_mode === 'all' ? 'rgba(201,169,110,0.22)' : 'transparent',
                      border: draft.target_mode === 'all' ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                      color: draft.target_mode === 'all' ? 'var(--gold)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}>Cały ogród</button>
                  <button type="button" onClick={() => setDraft((d) => ({ ...d, target_mode: 'select' }))}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                      background: draft.target_mode === 'select' ? 'rgba(201,169,110,0.22)' : 'transparent',
                      border: draft.target_mode === 'select' ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                      color: draft.target_mode === 'select' ? 'var(--gold)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}>Wybrane</button>
                </div>
                {draft.target_mode === 'select' && (
                  <div className="rounded-lg p-2 max-h-44 overflow-y-auto" style={{ background: 'var(--surface-faint)', border: '0.5px solid var(--border-soft)' }}>
                    {plantOptions.slice(0, 60).map((p) => {
                      const checked = draft.target_plants.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => togglePlantInDraft(p.id)} />
                          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Notatka (opcjonalna)
                <textarea
                  value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  rows={2} placeholder="np. po deszczu, profilaktycznie..."
                  className="mt-1 w-full px-3 py-2 rounded-lg resize-none"
                  style={{ fontSize: 14, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
                />
              </label>

              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.product_name.trim()}
                style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                  color: '#1A1208', fontWeight: 600, fontSize: 15,
                  border: 'none', cursor: 'pointer',
                  opacity: draft.product_name.trim() ? 1 : 0.5,
                }}
              >Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
