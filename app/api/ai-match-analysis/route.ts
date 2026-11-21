import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }
    const auth = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!auth.ok) return NextResponse.json({ error: "Your session is invalid. Sign in again." }, { status: 401 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI is not configured yet. Add OPENAI_API_KEY as a server-only Vercel environment variable (never NEXT_PUBLIC_)." }, { status: 503 });

    const body = await request.json();
    const image = body?.image;
    if (typeof image !== "string" || !/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > 4_000_000) {
      return NextResponse.json({ error: "Choose a PNG, JPG or WebP image up to 10 MB." }, { status: 400 });
    }

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a strict visual data extractor for Counter-Strike post-match screenshots. Read ONLY the yellow player stat cards near the bottom and the top match score/result banner. Ignore character models, poses, map, scenery, crates and background. Preserve each in-game player nickname EXACTLY as rendered: same spelling, capitalization, punctuation, symbols and spacing. Never translate, autocorrect, normalize or invent a nickname. If a character is ambiguous, return null and explain in warnings. For every yellow card, extract: player_name; ADR; HS% (headshot percentage); K/D/A exactly as printed; and parse K/D/A into kills_from_kda, deaths, assists. Also separately extract any explicit line such as \"Kills: 3\" as card_kills, and any \"Most damage: 919\" as damage. Do not mix card_kills with kills_from_kda. Extract top_score exactly (e.g. \"3 : 8\") and result exactly (\"WIN\" or \"LOSS\"). Return JSON only with keys summary, top_score, result, player_cards (array with player_name, adr, hs_percent, kda, kills_from_kda, deaths, assists, card_kills, damage, other_visible_stats), confidence (0-1), warnings (array). Use null for unreadable or absent values. Do not calculate or guess missing stats. If the screenshot contains two cards, return two cards in left-to-right order. This is OCR-style evidence extraction, not an official match verdict." },
          { role: "user", content: [{ type: "text", text: "Read the in-game nicknames and stats exactly as displayed on the yellow cards, plus the score and WIN/LOSS banner at the top. Preserve spelling and punctuation exactly. Ignore everything else. Never guess unreadable text." }, { type: "image_url", image_url: { url: image, detail: "high" } }] }
        ]
      }),
      cache: "no-store",
    });
    const result = await completion.json();
    if (!completion.ok) {
      return NextResponse.json({ error: result?.error?.message || "AI provider request failed." }, { status: 502 });
    }
    const raw = result?.choices?.[0]?.message?.content;
    if (!raw) return NextResponse.json({ error: "AI returned an empty result." }, { status: 502 });
    return NextResponse.json({ analysis: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ error: "Could not analyze this screenshot. Try another image." }, { status: 500 });
  }
}
