import { useState } from 'react';
import { RECIPES, NATURAL_RULES } from './data/recipes.js';
import { loadCustomRecipes, addCustomRecipe, deleteCustomRecipe } from './lib/plantStorage.js';

const emptyDraft = () => ({ name: '', target: '', frequency: '', steps: [''] });

export default function Recipes() {
  const [openId, setOpenId] = useState(null);
  const [customRecipes, setCustomRecipes] = useState(() => loadCustomRecipes());
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const allRecipes = [...RECIPES, ...customRecipes];

  const handleStepChange = (i, value) => {
    setDraft((d) => {
      const steps = [...d.steps];
      steps[i] = value;
      return { ...d, steps };
    });
  };

  const handleAddStep = () => setDraft((d) => ({ ...d, steps: [...d.steps, ''] }));
  const handleRemoveStep = (i) => setDraft((d) => ({ ...d, steps: d.steps.filter((_, idx) => idx !== i) }));

  const canSave = draft.name.trim() && draft.steps.filter((s) => s.trim()).length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const next = addCustomRecipe({
      name: draft.name,
      target: draft.target,
      frequency: draft.frequency,
      steps: draft.steps.filter((s) => s.trim()),
    });
    setCustomRecipes(next);
    setDraft(emptyDraft());
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    if (!confirm('Usunąć recepturę?')) return;
    setCustomRecipes(deleteCustomRecipe(id));
  };

  return (
    <div className="px-5 pb-10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] tracking-[2px] uppercase" style={{ color: 'rgba(134, 239, 172, 0.7)' }}>
          Naturalne preparaty
        </p>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-[11px] tracking-wide cursor-pointer px-3 py-1 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#0a0f0a',
            border: 'none',
            fontWeight: 500,
          }}
        >
          + Twoja
        </button>
      </div>
      <p className="text-[13px] font-serif italic mb-5" style={{ color: 'rgba(232, 221, 208, 0.6)' }}>
        Domowe przepisy bez chemii — sprawdzone w polskich warunkach.
      </p>

      <div className="flex flex-col gap-3">
        {allRecipes.map((r) => {
          const open = openId === r.id;
          return (
            <div
              key={r.id}
              className="rounded-[14px] overflow-hidden"
              style={{
                backgroundColor: 'rgba(26, 46, 26, 0.85)',
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
                <span className="font-serif italic flex-1 min-w-0 truncate" style={{ color: '#86efac', fontSize: '16px' }}>
                  🌿 {r.name}
                  {r.custom && <span className="ml-2 text-[10px] font-normal" style={{ color: 'rgba(134,239,172,0.5)' }}>własna</span>}
                </span>
                <span style={{ color: 'rgba(134, 239, 172, 0.6)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {open && (
                <div className="px-4 pb-4 pt-1 flex flex-col gap-3" style={{ borderTop: '0.5px solid rgba(134, 239, 172, 0.2)' }}>
                  {r.target && (
                    <div>
                      <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                        Na co działa
                      </p>
                      <p className="text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'rgba(232, 221, 208, 0.85)' }}>
                        {r.target}
                      </p>
                    </div>
                  )}

                  {r.frequency && (
                    <div>
                      <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                        Częstotliwość
                      </p>
                      <p className="text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'rgba(232, 221, 208, 0.85)' }}>
                        {r.frequency}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                      Przepis
                    </p>
                    <ol className="flex flex-col gap-1.5">
                      {r.steps.map((s, i) => (
                        <li
                          key={i}
                          className="text-[13.5px] font-serif italic leading-relaxed flex gap-2"
                          style={{ color: 'rgba(232, 221, 208, 0.85)' }}
                        >
                          <span style={{ color: '#86efac', fontWeight: 500, minWidth: '20px' }}>{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {r.custom && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="self-end text-[11px] cursor-pointer"
                      style={{ background: 'none', border: 'none', color: 'rgba(232,100,100,0.7)', padding: 0 }}
                    >
                      Usuń recepturę
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="mt-8 rounded-[14px] p-4"
        style={{ backgroundColor: 'rgba(26, 46, 26, 0.85)', border: '0.5px solid rgba(134, 239, 172, 0.35)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(134, 239, 172, 0.7)' }}>
          Zasady oprysków naturalnych
        </p>
        <ul className="flex flex-col gap-2">
          {NATURAL_RULES.map((rule, i) => (
            <li
              key={i}
              className="text-[13px] font-serif italic leading-relaxed flex gap-2"
              style={{ color: 'rgba(232, 221, 208, 0.75)' }}
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
          onClick={() => setShowAdd(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col"
            style={{
              maxWidth: '480px',
              maxHeight: '85vh',
              backgroundColor: '#0d0c0a',
              border: '1px solid rgba(134, 239, 172, 0.35)',
              borderRadius: '20px',
            }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '0.5px solid rgba(134, 239, 172, 0.2)' }}>
              <h3 className="font-serif italic" style={{ fontSize: '20px', color: '#86efac' }}>Twoja receptura</h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                aria-label="Zamknij"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,221,208,0.5)', padding: 4 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3 flex-1">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nazwa (np. Macerat z mniszka)"
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: '#F0E8D8' }}
              />
              <input
                type="text"
                value={draft.target}
                onChange={(e) => setDraft({ ...draft, target: e.target.value })}
                placeholder="Na co działa (opcjonalnie)"
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: '#F0E8D8' }}
              />
              <input
                type="text"
                value={draft.frequency}
                onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}
                placeholder="Częstotliwość (opcjonalnie)"
                className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: '#F0E8D8' }}
              />

              <p className="text-[10px] tracking-[2px] uppercase" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                Kroki
              </p>
              {draft.steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-serif italic" style={{ color: '#86efac', fontWeight: 500, minWidth: '20px', paddingTop: '8px' }}>{i + 1}.</span>
                  <input
                    type="text"
                    value={s}
                    onChange={(e) => handleStepChange(i, e.target.value)}
                    placeholder="Krok..."
                    className="flex-1 bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                    style={{ border: '0.5px solid rgba(134, 239, 172, 0.25)', color: '#F0E8D8' }}
                  />
                  {draft.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(i)}
                      className="cursor-pointer"
                      style={{ background: 'none', border: 'none', color: 'rgba(232,221,208,0.4)', fontSize: '18px', lineHeight: 1, padding: '0 6px' }}
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
                  onClick={() => { setShowAdd(false); setDraft(emptyDraft()); }}
                  className="flex-1 py-2 rounded-full text-[12px] cursor-pointer"
                  style={{ background: 'none', border: '0.5px solid rgba(201,169,110,0.3)', color: 'rgba(232,221,208,0.75)' }}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="flex-1 py-2 rounded-full text-[12px] cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
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
