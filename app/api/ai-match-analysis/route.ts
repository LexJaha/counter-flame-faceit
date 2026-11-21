import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
          { role: "system", content: "You analyze Counter-Strike match screenshots. Extract only clearly visible information. Never guess unreadable details. Return JSON with keys summary (string), map (string or null), score (string or null), mode (string or null), players (array of visible player names), confidence (number 0 to 1), warnings (array of strings). This is evidence extraction, not an official match verdict." },
          { role: "user", content: [{ type: "text", text: "Read the match details visible in this screenshot. Use null or empty arrays for anything uncertain." }, { type: "image_url", image_url: { url: image, detail: "high" } }] }
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
