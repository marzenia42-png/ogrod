import { useState, useMemo, useRef } from 'react';
import { RECIPES, RECIPE_TYPES, RECIPE_TYPE_BY_KEY, NATURAL_RULES } from './data/recipes.js';
import { MONTHS_SHORT } from './data/plants.js';
import { addCustomRecipe, updateCustomRecipe, deleteCustomRecipe, compressImage } from './lib/plantStorage.js';

const emptyDraft = () => ({
  name: '',
  type: 'oprysk',
  target: '',
  appliesTo: '',
  frequency: '',
  steps: [''],
  photoData: null,
  months: [],
});

export default function Recipes({ customRecipes = [], onRecipesChange = () => {}, initialOpenId = null }) {
  const [openId, setOpenId] = useState(initialOpenId);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const photoRef = useRef(null);

  const allRecipes = useMemo(() => [...RECIPES, ...customRecipes], [customRecipes]);

  const filteredRecipes = filter === 'all'
    ? allRecipes
    : allRecipes.filter((r) => (r.type || 'inny') === filter);

  const handleStepChange = (i, value) => {
    setDraft((d) => {
      const steps = [...d.steps];
      steps[i] = value;
      return { ...d, steps };
    });
  };

  const handleAddStep = () => setDraft((d) => ({ ...d, steps: [...d.steps, ''] }));
  const handleRemoveStep = (i) => setDraft((d) => ({ ...d, steps: d.steps.filter((_, idx) => idx !== i) }));

  const handlePhotoUpload = async (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    try {
      const dataUrl = await compressImage(file, 1024, 0.72);
      setDraft((d) => ({ ...d, photoData: dataUrl }));
    } catch {
      // ignore
    }
  };

  const canSave = draft.name.trim() && draft.steps.filter((s) => s.trim()).length > 0;

  const toggleDraftMonth = (m) => {
    setDraft((d) => {
      const has = d.months.includes(m);
      const months = has ? d.months.filter((x) => x !== m) : [...d.months, m].sort((a, b) => a - b);
      return { ...d, months };
    });
  };

  const closeAddModal = () => {
    setShowAdd(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const handleEdit = (r) => {
    setDraft({
      name: r.name || '',
      type: r.type || 'inny',
      target: r.target || '',
      appliesTo: r.appliesTo || '',
      frequency: r.frequency || '',
      steps: r.steps?.length ? [...r.steps] : [''],
      photoData: r.photoData || null,
      months: Array.isArray(r.months) ? [...r.months] : [],
    });
    setEditingId(r.id);
    setShowAdd(true);
  };

  const handleSave = () => {
    if (!canSave) return;
    const payload = {
      name: draft.name,
      type: draft.type,
      target: draft.target,
      appliesTo: draft.appliesTo,
      frequency: draft.frequency,
      steps: draft.steps.filter((s) => s.trim()),
      photoData: draft.photoData,
      months: draft.months,
    };
    const next = editingId
      ? updateCustomRecipe(editingId, payload)
      : addCustomRecipe(payload);
    onRecipesChange(next);
    closeAddModal();
  };

  const handleDelete = (id) => {
    if (!confirm('Usunąć recepturę?')) return;
    onRecipesChange(deleteCustomRecipe(id));
  };

  return (
    <div className="px-5 pb-10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] tracking-[2px] uppercase" style={{ color: 'rgba(134, 239, 172, 0.7)' }}>
          Środki ochrony i pielęgnacji
        </p>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-[11px] tracking-wide cursor-pointer px-3 py-1 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #4CAF50, #2e7d32)',
            color: '#0a0f0a',
            border: 'none',
            fontWeight: 500,
          }}
        >
          + Twoja
        </button>
      </div>
      <p className="text-[13px] font-serif italic mb-3" style={{ color: 'var(--text-muted)' }}>
        Domowe gnojówki, opryski, nawozy i odżywki — sprawdzone w polskich warunkach.
      </p>

      {/* Filter pills */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-3 mb-3"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {[{ key: 'all', label: 'Wszystkie' }, ...RECIPE_TYPES].map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[11px] tracking-wide cursor-pointer"
              style={{
                background: active ? 'rgba(76, 175, 80, 0.25)' : 'var(--surface-card-soft)',
                border: active ? '0.5px solid #4CAF50' : '0.5px solid rgba(134, 239, 172, 0.2)',
                color: active ? '#86efac' : 'var(--text-muted)',
                fontWeight: active ? 500 : 400,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {filteredRecipes.length === 0 && (
          <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-faint)' }}>
            Brak receptur w tej kategorii.
          </p>
        )}
        {filteredRecipes.map((r) => {
          const open = openId === r.id;
          const typeMeta = RECIPE_TYPE_BY_KEY[r.type] || { label: 'Inny' };
          return (
            <div
              key={r.id}
              className="rounded-[14px] overflow-hidden"
              style={{
                backgroundColor: 'var(--surface-card)',
                border: '1px solid #22c55e',
                backdropFilter: 'blur(8px)',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                style={{ background: 'none', border: 'none' }}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-serif italic block truncate" style={{ color: '#86efac', fontSize: '16px' }}>
                    🌿 {r.name}
                    {r.custom && <span className="ml-2 text-[10px] font-normal" style={{ color: 'rgba(134,239,172,0.5)' }}>własna</span>}
                  </span>
                  <span className="text-[10px] tracking-[2px] uppercase" style={{ color: 'rgba(134,239,172,0.6)' }}>
                    {typeMeta.label}
                  </span>
                </div>
                <span style={{ color: 'rgba(134, 239, 172, 0.6)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {open && (
                <div className="px-4 pb-4 pt-1 flex flex-col gap-3" style={{ borderTop: '0.5px solid rgba(134, 239, 172, 0.2)' }}>
                  {r.photoData && (
                    <img
                      src={r.photoData}
                      alt=""
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '10px', border: '0.5px solid rgba(134, 239, 172, 0.25)' }}
                    />
                  )}
                  {r.target && (
                    <div>
                      <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                        Na co działa
                      </p>
                      <p className="text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {r.target}
                      </p>
                    </div>
                  )}

                  {r.appliesTo && (
                    <div>
                      <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                        Zastosowanie
                      </p>
                      <p className="text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {r.appliesTo}
                      </p>
                    </div>
                  )}

                  {r.frequency && (
                    <div>
                      <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                        Częstotliwość
                      </p>
                      <p className="text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {r.frequency}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                      Przygotowanie
                    </p>
                    <ol className="flex flex-col gap-1.5">
                      {r.steps.map((s, i) => (
                        <li
                          key={i}
                          className="text-[13.5px] font-serif italic leading-relaxed flex gap-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <span style={{ color: '#86efac', fontWeight: 500, minWidth: '20px' }}>{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {r.months?.length > 0 && (
                    <div>
                      <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                        Miesiące przypomnień
                      </p>
                      <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-secondary)' }}>
                        {r.months.map((m) => MONTHS_SHORT[m - 1]).join(', ')}
                      </p>
                    </div>
                  )}

                  {r.custom ? (
                    <div className="flex gap-2 self-end mt-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(r)}
                        className="cursor-pointer"
                        style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(201,169,110,0.15)', border: '0.5px solid var(--border-medium)', color: 'var(--gold)', fontSize: 12 }}
                        aria-label="Edytuj"
                      >
                        ✏️ Edytuj
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="cursor-pointer"
                        style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(229,75,75,0.10)', border: '0.5px solid rgba(229,75,75,0.40)', color: 'rgba(229,75,75,0.85)', fontSize: 12 }}
                        aria-label="Usuń"
                      >
                        🗑️ Usuń
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 self-end mt-2">
                      <button
                        type="button"
                        onClick={() => handleEdit({ ...r, id: undefined, custom: true })}
                        className="cursor-pointer"
                        style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(123,201,123,0.10)', border: '0.5px solid rgba(123,201,123,0.35)', color: '#7bc97b', fontSize: 12 }}
                        aria-label="Skopiuj i edytuj"
                      >
                        ✏️ Skopiuj i edytuj
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="mt-8 rounded-[14px] p-4"
        style={{ backgroundColor: 'var(--surface-card)', border: '0.5px solid rgba(134, 239, 172, 0.35)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(134, 239, 172, 0.7)' }}>
          Zasady oprysków naturalnych
        </p>
        <ul className="flex flex-col gap-2">
          {NATURAL_RULES.map((rule, i) => (
            <li
              key={i}
              className="text-[13px] font-serif italic leading-relaxed flex gap-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span style={{ color: '#86efac', marginTop: '6px' }}>•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      {showAdd && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center px-4"
          style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
          onClick={closeAddModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col"
            style={{
              maxWidth: '480px',
              maxHeight: '90vh',
              backgroundColor: 'var(--surface-modal)',
              border: '1px solid rgba(134, 239, 172, 0.35)',
              borderRadius: '20px',
            }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '0.5px solid rgba(134, 239, 172, 0.2)' }}>
              <h3 className="font-serif italic" style={{ fontSize: '20px', color: '#86efac' }}>
                {editingId ? 'Edytuj recepturę' : 'Twoja receptura'}
              </h3>
              <button
                type="button"
                onClick={closeAddModal}
                aria-label="Zamknij"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3 flex-1">
              <input
                type="text" lang="pl" spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nazwa (np. Macerat z mniszka)"
                autoFocus
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: 'var(--text-primary)' }}
              />

              <div>
                <p className="text-[10px] tracking-[2px] uppercase mb-1.5" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>Typ</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {RECIPE_TYPES.map((t) => {
                    const active = draft.type === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setDraft({ ...draft, type: t.key })}
                        className="py-1.5 px-2 rounded-md text-[11px] cursor-pointer"
                        style={{
                          background: active ? 'rgba(76, 175, 80, 0.25)' : 'var(--surface-faint)',
                          border: active ? '0.5px solid #4CAF50' : '0.5px solid rgba(134, 239, 172, 0.2)',
                          color: active ? '#86efac' : 'var(--text-secondary)',
                          fontWeight: active ? 500 : 400,
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text" lang="pl" spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
                value={draft.target}
                onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                placeholder="Na co działa (opcjonalnie)"
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: 'var(--text-primary)' }}
              />
              <input
                type="text" lang="pl" spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
                value={draft.appliesTo}
                onChange={(e) => setDraft({ ...draft, appliesTo: e.target.value })}
                placeholder="Zastosowanie — na które rośliny (opcjonalnie)"
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: 'var(--text-primary)' }}
              />
              <input
                type="text" lang="pl" spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
                value={draft.frequency}
                onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
                placeholder="Częstotliwość (opcjonalnie)"
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: 'var(--text-primary)' }}
              />

              <div>
                <p className="text-[10px] tracking-[2px] uppercase mb-1.5" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                  Miesiące przypomnień (opcjonalne)
                </p>
                <p className="text-[11px] mb-2 font-serif italic" style={{ color: 'var(--text-muted)' }}>
                  Zaznaczone miesiące pojawią się w kalendarzu jako naturalna akcja.
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {MONTHS_SHORT.map((m, i) => {
                    const month = i + 1;
                    const selected = draft.months.includes(month);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleDraftMonth(month)}
                        className="py-1.5 rounded-md text-[11px] cursor-pointer"
                        style={{
                          border: selected ? '0.5px solid #4CAF50' : '0.5px solid rgba(134, 239, 172, 0.2)',
                          background: selected ? 'rgba(76, 175, 80, 0.20)' : 'transparent',
                          color: selected ? '#86efac' : 'var(--text-muted)',
                          fontWeight: selected ? 500 : 400,
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] tracking-[2px] uppercase mb-1.5" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>Zdjęcie (opcjonalne)</p>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => { handlePhotoUpload(e.target.files?.[0]); e.target.value = ''; }}
                  className="hidden"
                />
                {draft.photoData ? (
                  <div className="relative rounded-lg overflow-hidden" style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)' }}>
                    <img src={draft.photoData} alt="" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, photoData: null })}
                      className="absolute top-2 right-2 cursor-pointer"
                      style={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: 'var(--text-primary)', lineHeight: 1 }}
                      aria-label="Usuń zdjęcie"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="w-full py-2.5 rounded-lg text-[12px] cursor-pointer"
                    style={{ background: 'none', border: '0.5px dashed rgba(134, 239, 172, 0.4)', color: 'rgba(134, 239, 172, 0.85)' }}
                  >
                    📷 Wybierz / zrób zdjęcie
                  </button>
                )}
              </div>

              <p className="text-[10px] tracking-[2px] uppercase mt-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                Kroki
              </p>
              {draft.steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-serif italic" style={{ color: '#86efac', fontWeight: 500, minWidth: '20px', paddingTop: '8px' }}>{i + 1}.</span>
                  <input
                    type="text" lang="pl" spellCheck={true} autoCorrect="on" autoCapitalize="sentences"
                    value={s}
                    onChange={(e) => handleStepChange(i, e.target.value)}
                    placeholder="Krok..."
                    className="flex-1 bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                    style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: 'var(--text-primary)' }}
                  />
                  {draft.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(i)}
                      className="cursor-pointer"
                      style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: '18px', lineHeight: 1, padding: '0 6px' }}
                      aria-label="Usuń krok"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddStep}
                className="py-2 rounded-lg text-[12px] cursor-pointer"
                style={{ background: 'none', border: '0.5px dashed rgba(134, 239, 172, 0.4)', color: '#86efac' }}
              >
                + dodaj krok
              </button>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 py-2 rounded-full text-[12px] cursor-pointer"
                  style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="flex-1 py-2 rounded-full text-[12px] cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF50, #2e7d32)',
                    color: '#0a0f0a',
                    border: 'none',
                    fontWeight: 500,
                    opacity: canSave ? 1 : 0.4,
                  }}
                >
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
