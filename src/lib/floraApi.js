// Public Supabase config — anon key is safe to expose; the garden-flora function
// runs with verify_jwt=false so no real authentication is performed. Abuse is mitigated
// at the function layer (CORS allowlist + max_tokens cap + per-request payload limits).

const SUPABASE_URL = 'https://txqjjwanyfcpezgqbwou.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cWpqd2FueWZjcGV6Z3Fid291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTc2NTksImV4cCI6MjA5MTM3MzY1OX0.Dy1N3rHMUZCAnTSKayRa7GNzSlWOe4PSi6_1BVOUHyU';

export async function callFlora({ messages, context }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/garden-flora`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
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
