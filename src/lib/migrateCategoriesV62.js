// One-time migration v6.2 — przenosi rośliny w localStorage + Supabase
// z legacy/unknown categoryId na finalną listę (8 kategorii + 'all' wirtualne).
//
// Mapowanie:
//   herbs → vegetables
//   vegetables-greenhouse → vegetables
//   * → other (jeśli nieznane)
//
// Idempotentne: stempel 'garden-categories-migrated-v62' = 'true'.

import { supabase } from './supabaseClient.js';
import { getDeviceId } from './deviceId.js';
import { normalizeCategoryId, CATEGORY_REMAP } from '../data/plantCategories.js';

const STAMP = 'garden-categories-migrated-v62';

function lsRead(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}
function lsWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export async function runCategoriesMigrationV62() {
  if (typeof window === 'undefined') return { skipped: 'ssr' };
  try {
    if (localStorage.getItem(STAMP) === 'true') {
      return { skipped: 'already-migrated' };
    }
    const device = getDeviceId();

    // 1) localStorage — garden-custom-plants
    const cur = lsRead('garden-custom-plants', []);
    let lsTouched = 0;
    const nextLs = (cur || []).map((p) => {
      const oldCat = p.categoryId || p.category;
      if (!oldCat) return p;
      if (CATEGORY_REMAP[oldCat]) {
        lsTouched++;
        return { ...p, categoryId: CATEGORY_REMAP[oldCat] };
      }
      return p;
    });
    if (lsTouched > 0) lsWrite('garden-custom-plants', nextLs);

    // 2) Supabase — garden_plants for this device
    let cloudTouched = 0;
    try {
      const oldCats = Object.keys(CATEGORY_REMAP);
      const { data, error } = await supabase
        .from('garden_plants')
        .select('id, category')
        .eq('user_device_id', device)
        .in('category', oldCats);
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) {
        for (const row of data) {
          const next = normalizeCategoryId(row.category);
          if (next !== row.category) {
            const { error: updErr } = await supabase
              .from('garden_plants')
              .update({ category: next, updated_at: new Date().toISOString() })
              .eq('id', row.id);
            if (!updErr) cloudTouched++;
          }
        }
      }
    } catch (e) {
      console.warn('v62 cloud migration partial:', e?.message || e);
    }

    localStorage.setItem(STAMP, 'true');
    return { migrated: true, lsTouched, cloudTouched };
  } catch (e) {
    console.warn('runCategoriesMigrationV62 error:', e?.message || e);
    return { error: e?.message || String(e) };
  }
}
