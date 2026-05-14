// Data layer v6 — Supabase primary, localStorage mirror.
// Each mutation writes to BOTH targets so offline reads still work.
// Reads try Supabase first, fall back to LS on error.

import { supabase } from './supabaseClient.js';
import { getDeviceId } from './deviceId.js';

const LS = {
  plants: 'garden-custom-plants',           // legacy + mirror
  seasons: 'garden-seasons-v6',
  entries: 'garden-season-entries-v6',
  photos: 'garden-plant-photos-v6',
  sprays: 'garden-sprays-v6',
  diary: 'garden-diary-v6',
  gallery: 'garden-gallery-v6',
  yearSummary: 'garden-year-summary-v6',
};

function lsRead(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}
function lsWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function ok(res) {
  return !res?.error && res?.data !== undefined;
}

// ── PLANTS ────────────────────────────────────────────────────────────────────
export async function getPlants() {
  const device = getDeviceId();
  try {
    const { data, error } = await supabase
      .from('garden_plants')
      .select('*')
      .eq('user_device_id', device)
      .order('created_at', { ascending: true });
    if (error) throw error;
    lsWrite(LS.plants, data || []);
    return data || [];
  } catch {
    return lsRead(LS.plants, []);
  }
}

export async function savePlant(plant) {
  const device = getDeviceId();
  const row = {
    id: plant.id,
    user_device_id: device,
    name: plant.name,
    category: plant.category || plant.categoryId || null,
    is_custom: plant.is_custom ?? true,
    is_variety: plant.is_variety ?? false,
    parent_plant_id: plant.parent_plant_id || plant.parent || null,
    location: plant.location || null,
    purchase_date: plant.purchase_date || plant.purchaseDate || null,
    purchase_price: plant.purchase_price ?? plant.purchasePrice ?? null,
    purchase_shop: plant.purchase_shop || plant.purchaseShop || null,
    height_cm: plant.height_cm || plant.heightCm || null,
    position: plant.position || null,
    soil: plant.soil || null,
    watering: plant.watering || null,
    description: plant.description || null,
    notes: plant.notes || null,
    frost_hardiness: plant.frost_hardiness || plant.frostHardiness || null,
    flowering: plant.flowering || null,
    species_id: plant.species_id || plant.speciesId || null,
    variety_name: plant.variety_name || plant.variety || null,
    months: plant.months || null,
    type: plant.type || null,
    text: plant.text || null,
    updated_at: new Date().toISOString(),
  };
  try {
    const { error } = await supabase.from('garden_plants').upsert(row);
    if (error) throw error;
  } catch (e) {
    console.warn('savePlant supabase failed:', e?.message || e);
  }
  const cur = lsRead(LS.plants, []);
  const idx = cur.findIndex((p) => p.id === row.id);
  const next = [...cur];
  if (idx >= 0) next[idx] = { ...next[idx], ...row };
  else next.push(row);
  lsWrite(LS.plants, next);
  return row;
}

export async function deletePlant(id) {
  try {
    await supabase.from('garden_plants').delete().eq('id', id);
  } catch (e) {
    console.warn('deletePlant supabase failed:', e?.message || e);
  }
  const next = lsRead(LS.plants, []).filter((p) => p.id !== id);
  lsWrite(LS.plants, next);
  return next;
}

// ── SEASONS ───────────────────────────────────────────────────────────────────
export async function getSeasons(plantId) {
  try {
    const { data, error } = await supabase
      .from('garden_plant_seasons')
      .select('*')
      .eq('plant_id', plantId)
      .order('year', { ascending: false });
    if (error) throw error;
    const all = lsRead(LS.seasons, {});
    all[plantId] = data || [];
    lsWrite(LS.seasons, all);
    return data || [];
  } catch {
    const all = lsRead(LS.seasons, {});
    return all[plantId] || [];
  }
}

export async function ensureSeason(plantId, year) {
  // Get-or-create the season row for {plantId, year}. Returns season id.
  const existing = await getSeasons(plantId);
  const found = existing.find((s) => s.year === year);
  if (found) return found;
  try {
    const { data, error } = await supabase
      .from('garden_plant_seasons')
      .insert({ plant_id: plantId, year })
      .select()
      .single();
    if (error) throw error;
    const all = lsRead(LS.seasons, {});
    all[plantId] = [data, ...(all[plantId] || [])];
    lsWrite(LS.seasons, all);
    return data;
  } catch {
    const stub = {
      id: `local-${plantId}-${year}-${Date.now()}`,
      plant_id: plantId,
      year,
      notes: '',
      _local: true,
    };
    const all = lsRead(LS.seasons, {});
    all[plantId] = [stub, ...(all[plantId] || [])];
    lsWrite(LS.seasons, all);
    return stub;
  }
}

export async function updateSeasonNotes(seasonId, notes) {
  try {
    await supabase
      .from('garden_plant_seasons')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', seasonId);
  } catch (e) {
    console.warn('updateSeasonNotes failed:', e?.message || e);
  }
  const all = lsRead(LS.seasons, {});
  for (const plantId of Object.keys(all)) {
    all[plantId] = (all[plantId] || []).map((s) => s.id === seasonId ? { ...s, notes } : s);
  }
  lsWrite(LS.seasons, all);
}

// ── SEASON ENTRIES ────────────────────────────────────────────────────────────
export async function getSeasonEntries(seasonId) {
  try {
    const { data, error } = await supabase
      .from('garden_season_entries')
      .select('*')
      .eq('season_id', seasonId)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    const all = lsRead(LS.entries, {});
    all[seasonId] = data || [];
    lsWrite(LS.entries, all);
    return data || [];
  } catch {
    const all = lsRead(LS.entries, {});
    return all[seasonId] || [];
  }
}

export async function addSeasonEntry(seasonId, { text, type = 'note', date }) {
  const row = {
    season_id: seasonId,
    entry_text: text,
    entry_type: type,
    entry_date: date || new Date().toISOString().slice(0, 10),
  };
  let saved = null;
  try {
    const { data, error } = await supabase
      .from('garden_season_entries')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    saved = data;
  } catch (e) {
    console.warn('addSeasonEntry supabase failed:', e?.message || e);
    saved = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...row, _local: true };
  }
  const all = lsRead(LS.entries, {});
  all[seasonId] = [saved, ...(all[seasonId] || [])];
  lsWrite(LS.entries, all);
  return saved;
}

export async function updateSeasonEntry(entryId, fields) {
  const patch = {};
  if (fields.text !== undefined) patch.entry_text = fields.text;
  if (fields.type !== undefined) patch.entry_type = fields.type;
  if (fields.date !== undefined) patch.entry_date = fields.date;
  try {
    await supabase.from('garden_season_entries').update(patch).eq('id', entryId);
  } catch (e) {
    console.warn('updateSeasonEntry failed:', e?.message || e);
  }
  const all = lsRead(LS.entries, {});
  for (const seasonId of Object.keys(all)) {
    all[seasonId] = (all[seasonId] || []).map((e) => e.id === entryId ? { ...e, ...patch } : e);
  }
  lsWrite(LS.entries, all);
}

export async function deleteSeasonEntry(entryId) {
  try {
    await supabase.from('garden_season_entries').delete().eq('id', entryId);
  } catch (e) {
    console.warn('deleteSeasonEntry failed:', e?.message || e);
  }
  const all = lsRead(LS.entries, {});
  for (const seasonId of Object.keys(all)) {
    all[seasonId] = (all[seasonId] || []).filter((e) => e.id !== entryId);
  }
  lsWrite(LS.entries, all);
}

// ── PLANT PHOTOS ──────────────────────────────────────────────────────────────
export async function getPlantPhotos(plantId) {
  try {
    const { data, error } = await supabase
      .from('garden_plant_photos')
      .select('*')
      .eq('plant_id', plantId)
      .order('taken_at', { ascending: false });
    if (error) throw error;
    const all = lsRead(LS.photos, {});
    all[plantId] = data || [];
    lsWrite(LS.photos, all);
    return data || [];
  } catch {
    const all = lsRead(LS.photos, {});
    return all[plantId] || [];
  }
}

export async function addPlantPhoto(plantId, { dataUrl, description = '', type = 'problem' }) {
  const row = {
    plant_id: plantId,
    photo_data: dataUrl,
    description,
    photo_type: type,
  };
  let saved = null;
  try {
    const { data, error } = await supabase
      .from('garden_plant_photos')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    saved = data;
  } catch (e) {
    console.warn('addPlantPhoto failed:', e?.message || e);
    saved = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...row, taken_at: new Date().toISOString(), _local: true };
  }
  const all = lsRead(LS.photos, {});
  all[plantId] = [saved, ...(all[plantId] || [])];
  lsWrite(LS.photos, all);
  return saved;
}

export async function updatePlantPhoto(photoId, fields) {
  try {
    await supabase.from('garden_plant_photos').update(fields).eq('id', photoId);
  } catch (e) {
    console.warn('updatePlantPhoto failed:', e?.message || e);
  }
  const all = lsRead(LS.photos, {});
  for (const plantId of Object.keys(all)) {
    all[plantId] = (all[plantId] || []).map((p) => p.id === photoId ? { ...p, ...fields } : p);
  }
  lsWrite(LS.photos, all);
}

export async function deletePlantPhoto(photoId) {
  try {
    await supabase.from('garden_plant_photos').delete().eq('id', photoId);
  } catch (e) {
    console.warn('deletePlantPhoto failed:', e?.message || e);
  }
  const all = lsRead(LS.photos, {});
  for (const plantId of Object.keys(all)) {
    all[plantId] = (all[plantId] || []).filter((p) => p.id !== photoId);
  }
  lsWrite(LS.photos, all);
}

// ── SPRAYS / FERTILIZERS ──────────────────────────────────────────────────────
export async function getSprays() {
  const device = getDeviceId();
  try {
    const { data, error } = await supabase
      .from('garden_sprays')
      .select('*')
      .eq('user_device_id', device)
      .order('spray_date', { ascending: false });
    if (error) throw error;
    lsWrite(LS.sprays, data || []);
    return data || [];
  } catch {
    return lsRead(LS.sprays, []);
  }
}

export async function addSpray(spray) {
  const device = getDeviceId();
  const row = {
    user_device_id: device,
    spray_date: spray.date || new Date().toISOString().slice(0, 10),
    product_name: spray.product_name || spray.productName,
    product_type: spray.product_type || spray.productType || 'spray',
    target_plants: spray.target_plants || spray.targetPlants || [],
    concentration: spray.concentration || null,
    notes: spray.notes || null,
    label_photo: spray.label_photo || spray.labelPhoto || null,
  };
  let saved = null;
  try {
    const { data, error } = await supabase
      .from('garden_sprays')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    saved = data;
  } catch (e) {
    console.warn('addSpray failed:', e?.message || e);
    saved = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...row, created_at: new Date().toISOString(), _local: true };
  }
  const cur = lsRead(LS.sprays, []);
  lsWrite(LS.sprays, [saved, ...cur]);
  return saved;
}

export async function updateSpray(id, fields) {
  try {
    await supabase.from('garden_sprays').update(fields).eq('id', id);
  } catch (e) {
    console.warn('updateSpray failed:', e?.message || e);
  }
  const cur = lsRead(LS.sprays, []).map((s) => s.id === id ? { ...s, ...fields } : s);
  lsWrite(LS.sprays, cur);
}

export async function deleteSpray(id) {
  try {
    await supabase.from('garden_sprays').delete().eq('id', id);
  } catch (e) {
    console.warn('deleteSpray failed:', e?.message || e);
  }
  const cur = lsRead(LS.sprays, []).filter((s) => s.id !== id);
  lsWrite(LS.sprays, cur);
}

// ── DIARY ─────────────────────────────────────────────────────────────────────
export async function getDiary() {
  const device = getDeviceId();
  try {
    const { data, error } = await supabase
      .from('garden_diary')
      .select('*')
      .eq('user_device_id', device)
      .order('entry_date', { ascending: false });
    if (error) throw error;
    lsWrite(LS.diary, data || []);
    return data || [];
  } catch {
    return lsRead(LS.diary, []);
  }
}

export async function upsertDiary(date, content) {
  const device = getDeviceId();
  const row = { user_device_id: device, entry_date: date, content };
  try {
    await supabase.from('garden_diary').upsert(row, { onConflict: 'user_device_id,entry_date' });
  } catch (e) {
    console.warn('upsertDiary failed:', e?.message || e);
  }
  const cur = lsRead(LS.diary, []);
  const idx = cur.findIndex((d) => d.entry_date === date);
  if (idx >= 0) cur[idx] = { ...cur[idx], ...row };
  else cur.unshift(row);
  lsWrite(LS.diary, cur);
}

// ── GALLERY ───────────────────────────────────────────────────────────────────
export async function getGallery({ album, year } = {}) {
  const device = getDeviceId();
  try {
    let q = supabase.from('garden_gallery').select('*').eq('user_device_id', device);
    if (album) q = q.eq('album', album);
    if (year) q = q.eq('year', year);
    const { data, error } = await q.order('taken_date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    let cur = lsRead(LS.gallery, []);
    if (album) cur = cur.filter((g) => g.album === album);
    if (year) cur = cur.filter((g) => g.year === year);
    return cur;
  }
}

export async function addGalleryItem({ dataUrl, album = 'Ogród', description = '', date }) {
  const device = getDeviceId();
  const takenDate = date || new Date().toISOString().slice(0, 10);
  const row = {
    user_device_id: device,
    photo_data: dataUrl,
    album,
    description,
    taken_date: takenDate,
  };
  let saved = null;
  try {
    const { data, error } = await supabase
      .from('garden_gallery')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    saved = data;
  } catch (e) {
    console.warn('addGalleryItem failed:', e?.message || e);
    saved = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...row,
      year: Number(takenDate.slice(0, 4)),
      _local: true,
    };
  }
  const cur = lsRead(LS.gallery, []);
  lsWrite(LS.gallery, [saved, ...cur]);
  return saved;
}

export async function deleteGalleryItem(id) {
  try {
    await supabase.from('garden_gallery').delete().eq('id', id);
  } catch (e) {
    console.warn('deleteGalleryItem failed:', e?.message || e);
  }
  const cur = lsRead(LS.gallery, []).filter((g) => g.id !== id);
  lsWrite(LS.gallery, cur);
}

// ── YEAR SUMMARY ──────────────────────────────────────────────────────────────
export async function getYearSummary(year) {
  const device = getDeviceId();
  try {
    const { data, error } = await supabase
      .from('garden_year_summary')
      .select('*')
      .eq('user_device_id', device)
      .eq('year', year)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch {
    return lsRead(LS.yearSummary, {})[String(year)] || null;
  }
}

export async function upsertYearSummary(year, content) {
  const device = getDeviceId();
  const row = { user_device_id: device, year, content, updated_at: new Date().toISOString() };
  try {
    await supabase.from('garden_year_summary').upsert(row, { onConflict: 'user_device_id,year' });
  } catch (e) {
    console.warn('upsertYearSummary failed:', e?.message || e);
  }
  const all = lsRead(LS.yearSummary, {});
  all[String(year)] = row;
  lsWrite(LS.yearSummary, all);
}
