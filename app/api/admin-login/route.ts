import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_SECONDS, createAdminCookieValue, verifyAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: verifyAdminCookie(request) }, {
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}

export async function POST(request: Request) {
  const expected = process.env.CF_ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Admin login is not configured. Add CF_ADMIN_PASSWORD to Vercel Environment Variables." }, { status: 503 });
  try {
    const body = await request.json();
    const supplied = typeof body?.password === "string" ? body.password : "";
    const left = Buffer.from(supplied);
    const right = Buffer.from(expected);
    const valid = left.length === right.length && timingSafeEqual(left, right);
    if (!valid) return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminCookieValue(expected), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_SECONDS
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
