// Migracja per-user (v7) — przy pierwszym zalogowaniu konkretnego user.id.
// Sprawdza czy w cloud są jakieś dane pod tym user_id. Jeśli nie — kopiuje
// z localStorage (czyli z prac w trybie anonimowym/device_id) na user_id.
//
// Idempotentne: localStorage stamp `garden-migrated-user-v7-<userId>` = 'true'.

import { supabase } from './supabaseClient.js';

function stampKey(userId) { return `garden-migrated-user-v7-${userId}`; }

function lsRead(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

export async function runUserMigrationV7(userId) {
  if (!userId || typeof window === 'undefined') return { skipped: 'no-user' };
  const stamp = stampKey(userId);
  if (localStorage.getItem(stamp) === 'true') return { skipped: 'already-migrated' };
  try {
    // 1. Czy cloud ma już dane dla tego usera?
    const { data: existing, error } = await supabase
      .from('garden_plants')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    if (error) throw error;
    if (existing && existing.length > 0) {
      localStorage.setItem(stamp, 'true');
      return { skipped: 'cloud-has-data' };
    }

    // 2. Pobierz LS plants + varieties (legacy storage).
    const plants = lsRead('garden-custom-plants', []) || [];
    const varieties = lsRead('garden-varieties', []) || [];
    if (plants.length === 0 && varieties.length === 0) {
      localStorage.setItem(stamp, 'true');
      return { skipped: 'no-local-data' };
    }

    // 3. Insert plants + varieties z user_id.
    const rows = [];
    for (const p of plants) {
      rows.push({
        id: p.id,
        user_id: userId,
        name: p.name || 'Bez nazwy',
        category: p.categoryId || p.category || null,
        is_custom: true,
        is_variety: false,
        parent_plant_id: null,
        location: p.location || null,
        purchase_date: /^\d{4}-\d{2}-\d{2}$/.test(p.purchaseDate || '') ? p.purchaseDate : null,
        purchase_price: typeof p.purchasePrice === 'number' ? p.purchasePrice : null,
        purchase_shop: p.purchaseShop || null,
        species_id: p.speciesId || null,
        variety_name: p.variety || null,
        months: Array.isArray(p.months) ? p.months : null,
        type: p.type || null,
        text: p.text || null,
        height_cm: p.height_cm || null,
        position: p.position || null,
        soil: p.soil || null,
        watering: p.watering || null,
        frost_hardiness: p.frost_hardiness || null,
        flowering: p.flowering || null,
        description: p.description || null,
      });
    }
    for (const v of varieties) {
      rows.push({
        id: v.id,
        user_id: userId,
        name: v.name || 'Bez nazwy',
        is_custom: true,
        is_variety: true,
        parent_plant_id: v.parent,
      });
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('garden_plants').upsert(rows);
      if (insErr) throw insErr;
    }

    localStorage.setItem(stamp, 'true');
    return { migrated: true, count: rows.length };
  } catch (e) {
    console.warn('runUserMigrationV7 error:', e?.message || e);
    return { error: e?.message || String(e) };
  }
}
