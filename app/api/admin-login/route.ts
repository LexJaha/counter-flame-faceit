import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

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
    response.cookies.set("cf_admin_gate", "1", {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "strict", path: "/", maxAge: 60 * 60 * 8
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }
}
