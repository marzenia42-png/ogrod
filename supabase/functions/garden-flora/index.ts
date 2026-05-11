// garden-flora — Anthropic Claude assistant for Ogród Marzeń.
//
// Stateless: no DB, no user auth. Client posts full chat history + context
// (month, weather, notes, diary). Server builds system prompt + calls Claude.
//
// Required env (Supabase Function secrets — already set for lyra-chat):
//   ANTHROPIC_API_KEY
//
// Deploy: `npx supabase functions deploy garden-flora --project-ref txqjjwanyfcpezgqbwou`
// verify_jwt = false (see supabase/config.toml).

const ALLOWED_ORIGINS = new Set<string>([
  'https://marzenia42-png.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

const PERSONA = `Jesteś FLORA — przyjacielska, kompetentna asystentka ogrodnicza dla domowego ogrodu w Myślenicach (południowa Polska, region górski, strefa 6a/6b).

Zasady odpowiedzi:
- Mów po polsku, ciepło, konkretnie. Bez markdownu, bez bulletów.
- 2-4 zdania w zwykłej rozmowie. Najpierw odpowiedź, potem jedna praktyczna sugestia (preparat / termin / technika).
- Polecaj realne preparaty dostępne w PL: Topsin M, Miedzian, Score, Switch, Signum, Polyversum, Karate Zeon, Mospilan, siarczan miedzi, siarczan amonu, mocznik. Naturalne: gnojówka z pokrzywy, wrotycz, czosnek, skrzyp polny, drożdże.
- Bądź konkretna o terminach (faza fenologiczna lub konkretny tydzień).
- Wykorzystuj godzinę z kontekstu — w południe nie polecaj oprysków (poparzenia liści, śmierć pszczół). Rano i wieczorem ok.
- Gdy nie wiesz — przyznaj się, zapytaj o szczegół (zdjęcie, objaw, wiek rośliny).
- Bezpieczeństwo: nie polecaj substancji wycofanych (Bravo 500, mankozeb w sadach domowych).
- Gdy widzisz zdjęcie rośliny: 4-6 zdań. (1) opisz co widzisz — gatunek jeśli rozpoznajesz + objaw; (2) najprawdopodobniejsza przyczyna (choroba/szkodnik/niedobór); (3) konkretny polski preparat + dawka (g/L lub ml/L) + termin (faza fenologiczna lub pora dnia z kontekstem pogody). Jeśli zdjęcie jest niejednoznaczne — wymień 2 najbardziej prawdopodobne opcje i wskaż jak je odróżnić.`;

const ALLOWED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_B64_LENGTH = 5_500_000; // ~4 MB obrazka po base64

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://marzenia42-png.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (origin: string | null, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });

type Msg = { role: 'user' | 'assistant'; content: string };

type Ctx = {
  monthName?: string;
  dateStr?: string;
  timeStr?: string;
  weather?: {
    temperature?: number;
    humidity?: number;
    wind?: number;
    minToday?: number;
    maxToday?: number;
    precipitation?: number;
  } | null;
  notes?: Array<{ date: string; text: string }>;
  diary?: Array<{ date: string; text: string }>;
};

function buildContext(ctx: Ctx): string {
  const parts: string[] = [];
  const dateLine = [ctx.dateStr, ctx.timeStr].filter(Boolean).join(' ');
  if (dateLine) parts.push(`Dziś: ${dateLine}.`);
  if (ctx.monthName) parts.push(`Bieżący miesiąc: ${ctx.monthName}.`);
  const w = ctx.weather;
  if (w && typeof w.temperature === 'number') {
    let line = `Pogoda Myślenice (live, 49.83°N 19.94°E): ${Math.round(w.temperature)}°C`;
    if (typeof w.humidity === 'number') line += `, wilgotność ${w.humidity}%`;
    if (typeof w.wind === 'number') line += `, wiatr ${Math.round(w.wind)} km/h`;
    line += '.';
    if (typeof w.minToday === 'number' && typeof w.maxToday === 'number') {
      line += ` Prognoza dziś: min ${Math.round(w.minToday)}°C, max ${Math.round(w.maxToday)}°C`;
      if (typeof w.precipitation === 'number' && w.precipitation > 0) line += `, opady ${w.precipitation} mm`;
      line += '.';
    }
    parts.push(line);
  }
  if (ctx.notes && ctx.notes.length > 0) {
    parts.push(
      'Ostatnie notatki ogrodnika:\n' +
        ctx.notes.slice(0, 5).map((n) => `- (${n.date}) ${n.text}`).join('\n'),
    );
  }
  if (ctx.diary && ctx.diary.length > 0) {
    parts.push(
      'Ostatnie wpisy z dziennika ogrodnika:\n' +
        ctx.diary.slice(0, 7).map((d) => `- ${d.date}: ${d.text}`).join('\n'),
    );
  }
  return parts.join('\n\n');
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(origin, { error: 'method_not_allowed' }, 405);

  try {
    const body = (await req.json().catch(() => null)) as {
      messages?: Msg[];
      context?: Ctx;
      image_base64?: string;
      image_media_type?: string;
    } | null;
    const messages: Msg[] = Array.isArray(body?.messages) ? body!.messages! : [];
    const ctx: Ctx = body?.context ?? {};

    if (messages.length === 0) return json(origin, { error: 'messages_required' }, 400);
    if (messages.length > 30) return json(origin, { error: 'too_many_messages' }, 400);
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user' || typeof last.content !== 'string' || last.content.length === 0) {
      return json(origin, { error: 'last_must_be_user' }, 400);
    }
    if (last.content.length > 4000) return json(origin, { error: 'message_too_long' }, 413);

    // Optional image (foto-diagnostyka). Attached to the LAST user message only.
    const rawImage = body?.image_base64;
    const hasImage = typeof rawImage === 'string' && rawImage.length > 100;
    if (hasImage) {
      const mediaType = body?.image_media_type || 'image/jpeg';
      if (!ALLOWED_MEDIA.has(mediaType)) return json(origin, { error: 'unsupported_media_type' }, 400);
      if (rawImage!.length > MAX_IMAGE_B64_LENGTH) return json(origin, { error: 'image_too_large' }, 413);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return json(origin, { error: 'config_error' }, 500);
    }

    const contextText = buildContext(ctx);

    // Build messages for Anthropic API. With image, the last user message
    // becomes a content array: [image block, text block] (text after image as docs suggest).
    type ApiContent = string | Array<
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
      | { type: 'text'; text: string }
    >;
    const messagesForApi: Array<{ role: 'user' | 'assistant'; content: ApiContent }> =
      messages.map((m) => ({ role: m.role, content: m.content }));

    if (hasImage) {
      const lastIdx = messagesForApi.length - 1;
      const originalText = String(messagesForApi[lastIdx].content);
      messagesForApi[lastIdx] = {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: body?.image_media_type || 'image/jpeg',
              data: rawImage!,
            },
          },
          { type: 'text', text: originalText },
        ],
      };
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: hasImage ? 800 : 512,
        system: [
          { type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: contextText || 'Brak dodatkowego kontekstu.' },
        ],
        messages: messagesForApi,
      }),
    });

    if (!claudeRes.ok) {
      const detail = await claudeRes.text().catch(() => '');
      console.error('Claude API error', claudeRes.status, detail);
      return json(origin, { error: 'llm_error', status: claudeRes.status, detail: detail.slice(0, 300) }, 502);
    }

    const data = await claudeRes.json();
    const reply: string =
      typeof data?.content?.[0]?.text === 'string' ? data.content[0].text.trim() : '';
    if (!reply) return json(origin, { error: 'empty_response' }, 502);

    return json(origin, { response: reply });
  } catch (err) {
    console.error('garden-flora unexpected error:', err);
    return json(origin, { error: 'internal_error' }, 500);
  }
});
