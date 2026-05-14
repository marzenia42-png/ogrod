// One-time migration from localStorage v1-v5 to Supabase v6.
// Idempotent: marks completion with 'garden-migrated-v6' = 'true'.
// On error, leaves localStorage untouched so user can retry.

import { supabase } from './supabaseClient.js';
import { getDeviceId } from './deviceId.js';

const MIGRATED_KEY = 'garden-migrated-v6';
const LEGACY_PLANTS_KEY = 'garden-custom-plants';
const LEGACY_VARIETIES_KEY = 'garden-varieties';

function lsRead(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

export async function runV6Migration() {
  if (typeof window === 'undefined') return { skipped: 'ssr' };
  try {
    if (localStorage.getItem(MIGRATED_KEY) === 'true') {
      return { skipped: 'already-migrated' };
    }
    const device = getDeviceId();

    // Check if cloud already has data for this device — if yes, skip overwrite.
    const { data: existing, error: existingErr } = await supabase
      .from('garden_plants')
      .select('id')
      .eq('user_device_id', device)
      .limit(1);
    if (existingErr) throw existingErr;
    if (existing && existing.length > 0) {
      localStorage.setItem(MIGRATED_KEY, 'true');
      return { skipped: 'cloud-has-data' };
    }

    const plants = lsRead(LEGACY_PLANTS_KEY, []);
    const varieties = lsRead(LEGACY_VARIETIES_KEY, []);
    if ((!plants || plants.length === 0) && (!varieties || varieties.length === 0)) {
      localStorage.setItem(MIGRATED_KEY, 'true');
      return { skipped: 'no-legacy-data' };
    }

    const rows = [];

    // Main plants.
    for (const p of plants || []) {
      rows.push({
        id: p.id,
        user_device_id: device,
        name: p.name || 'Bez nazwy',
        category: p.categoryId || null,
        is_custom: true,
        is_variety: false,
        parent_plant_id: null,
        location: p.location || null,
        purchase_date: /^\d{4}-\d{2}-\d{2}$/.test(p.purchaseDate || '') ? p.purchaseDate : null,
        purchase_price: typeof p.purchasePrice === 'number' ? p.purchasePrice : null,
        species_id: p.speciesId || null,
        variety_name: p.variety || null,
        months: Array.isArray(p.months) ? p.months : null,
        type: p.type || null,
        text: p.text || null,
      });
    }

    // Varieties — flat children of parent plants. parent in legacy = plant id.
    for (const v of varieties || []) {
      rows.push({
        id: v.id,
        user_device_id: device,
        name: v.name || 'Bez nazwy',
        is_custom: true,
        is_variety: true,
        parent_plant_id: v.parent,
      });
    }

    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from('garden_plants').upsert(rows);
      if (insertErr) throw insertErr;
    }

    localStorage.setItem(MIGRATED_KEY, 'true');
    return { migrated: true, count: rows.length };
  } catch (e) {
    console.warn('runV6Migration error:', e?.message || e);
    return { error: e?.message || String(e) };
  }
}
