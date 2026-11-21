import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function getAdminDb() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Server database credentials are missing.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET(request: Request) {
  if (!verifyAdminCookie(request)) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  try {
    const db = getAdminDb();
    const { data, error } = await db.from("profiles")
      .select("id,username,elo,wins,losses,matches_played,kills,deaths")
      .order("elo", { ascending: false }).limit(250);
    if (error) throw error;
    return NextResponse.json({ players: data || [] });
  } catch (error) {
    console.error("Admin player list failed:", error);
    return NextResponse.json({ error: "Oyuncu listesi veritabanından alınamadı." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  try {
    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const elo = Number(body?.elo);
    const kills = Number(body?.kills);
    const deaths = Number(body?.deaths);
    if (!userId || ![elo, kills, deaths].every(Number.isInteger) ||
        elo < 0 || elo > 10000 || kills < 0 || kills > 999999 ||
        deaths < 0 || deaths > 999999) {
      return NextResponse.json({ error: "Geçersiz oyuncu istatistikleri." }, { status: 400 });
    }
    const db = getAdminDb();
    const { data, error } = await db.from("profiles")
      .update({ elo, kills, deaths, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("id,username,elo,wins,losses,matches_played,kills,deaths")
      .single();
    if (error) throw error;
    return NextResponse.json({ player: data });
  } catch (error) {
    console.error("Admin stats save failed:", error);
    return NextResponse.json({ error: "İstatistikler veritabanına kaydedilemedi." }, { status: 500 });
  }
}
