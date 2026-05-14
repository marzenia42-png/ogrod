import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://txqjjwanyfcpezgqbwou.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cWpqd2FueWZjcGV6Z3Fid291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTc2NTksImV4cCI6MjA5MTM3MzY1OX0.Dy1N3rHMUZCAnTSKayRa7GNzSlWOe4PSi6_1BVOUHyU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
