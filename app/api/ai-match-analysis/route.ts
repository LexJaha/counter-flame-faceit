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
    if (typeof image !== "string" || !/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > 14_000_000) {
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
          { role: "system", content: "You analyze Counter-Strike match result screenshots. STRICT VISUAL SCOPE: inspect ONLY (1) the yellow player stat cards near the bottom and (2) the top match result banner showing the score and Win/Loss. Ignore character poses, player models, background, crates, map scenery, crosshair, and all other visual content. For EACH yellow card extract the visible player name and every readable stat printed on or beside that card, including ADR, K/D/A, HS%, kills, and damage when present. Also extract the top score exactly as shown (for example 3:8) and the result label exactly (WIN or LOSS). Do not confuse ADR with kills or damage. Do not infer missing values. Use null for unreadable fields and include a field-level warning. Return JSON with keys: summary (string), top_score (string or null), result (string or null), player_cards (array of objects with player_name, adr, kda, hs_percent, kills, damage, other_visible_stats; each unavailable field null), confidence (number 0 to 1), warnings (array of strings). Preserve the displayed order of cards. This is evidence extraction, not an official match verdict." },
          { role: "user", content: [{ type: "text", text: "Analyze this screenshot using ONLY the top score/result banner and the yellow player stat cards. Ignore the characters and the rest of the scene. Return exact visible text; do not guess." }, { type: "image_url", image_url: { url: image, detail: "high" } }] }
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
