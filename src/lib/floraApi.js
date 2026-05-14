// Public Supabase config — anon key is safe to expose; the garden-flora function
// runs with verify_jwt=false so no real authentication is performed. Abuse is mitigated
// at the function layer (CORS allowlist + max_tokens cap + per-request payload limits).

const SUPABASE_URL = 'https://txqjjwanyfcpezgqbwou.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cWpqd2FueWZjcGV6Z3Fid291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTc2NTksImV4cCI6MjA5MTM3MzY1OX0.Dy1N3rHMUZCAnTSKayRa7GNzSlWOe4PSi6_1BVOUHyU';

// Payload: { messages, context, image_base64?, image_media_type?, mode? }
// — wszystkie pola przekazywane bez modyfikacji do edge function.
export async function callFlora(payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/garden-flora`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let hint = '';
    if (res.status === 404) hint = ' Funkcja nie została wdrożona (uruchom `supabase functions deploy garden-flora`).';
    else if (res.status === 502) hint = ' Problem z Claude API.';
    else if (res.status === 429) hint = ' Limit zapytań.';
    const error = new Error(`HTTP ${res.status}.${hint}`);
    error.detail = detail;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// AddPlantWizard — rozpoznawanie rośliny ze zdjęcia. Edge Function mode='identify'.
// Zwraca: { identifications: [{ name, categoryId, variety|null, confidence }] }
export async function callFloraIdentify(imageBase64, mediaType = 'image/jpeg') {
  return callFlora({
    mode: 'identify',
    image_base64: imageBase64,
    image_media_type: mediaType,
  });
}

// Spec auto-fetch — po dodaniu rośliny w wizardzie. Mode 'spec' w Edge Function.
// Zwraca object z polami: height_cm, position, soil, watering, fertilizing, pruning,
// pests, sprays, lifespan, frost_hardiness, flowering, description.
// Mapuje na pola plant w db.js (height_cm, position, soil, watering, frost_hardiness,
// flowering, description). Pola "fertilizing", "pruning", "pests", "sprays", "lifespan"
// gromadzone w polu description jako sufiks.
export async function fetchFloraSpec({ plantName, category }) {
  if (!plantName) return null;
  try {
    const res = await callFlora({ mode: 'spec', plantName, plantCategory: category });
    const spec = res?.spec;
    if (!spec || typeof spec !== 'object') return null;
    const mapped = {
      height_cm: spec.height_cm || spec.height || '',
      position: spec.position || '',
      soil: spec.soil || '',
      watering: spec.watering || '',
      frost_hardiness: spec.frost_hardiness || spec.frostResistance || '',
      flowering: spec.flowering || '',
    };
    // Sklej advanced fields w description jeśli są — by user widział całość w jednym polu.
    const extras = [];
    if (spec.description) extras.push(spec.description);
    if (spec.fertilizing) extras.push(`Nawożenie: ${spec.fertilizing}`);
    if (spec.pruning) extras.push(`Cięcie: ${spec.pruning}`);
    if (spec.pests) extras.push(`Szkodniki: ${spec.pests}`);
    if (spec.sprays) extras.push(`Opryski: ${spec.sprays}`);
    if (spec.lifespan) extras.push(`Cykl życia: ${spec.lifespan}`);
    if (extras.length > 0) mapped.description = extras.join(' · ');
    return mapped;
  } catch (e) {
    console.warn('fetchFloraSpec failed:', e?.message || e);
    return null;
  }
}

// Daily tip — 1 konkretna porada na dziś. Cache per YYYY-MM-DD w localStorage.
// Zwraca string z poradą. Lazy: 1 fetch dziennie.
const TIP_CACHE_PREFIX = 'garden-flora-tip-';
export async function getFloraDailyTip(context) {
  const today = new Date().toISOString().slice(0, 10);
  const key = TIP_CACHE_PREFIX + today;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch { /* ignore */ }
  const res = await callFlora({ mode: 'daily_tip', context });
  const tip = (res?.tip || '').trim();
  if (tip) {
    try { localStorage.setItem(key, tip); } catch { /* ignore */ }
  }
  return tip;
}
