import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "cf_admin_gate";
const SESSION_SECONDS = 60 * 60 * 8;

function signature(timestamp: string, secret: string) {
  return createHmac("sha256", secret).update("counterflame-admin:" + timestamp).digest("hex");
}

export function createAdminCookieValue(secret: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return timestamp + "." + signature(timestamp, secret);
}

export function verifyAdminCookie(request: Request) {
  const secret = process.env.CF_ADMIN_PASSWORD;
  if (!secret) return false;
  const cookieHeader = request.headers.get("cookie") || "";
  const entry = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(COOKIE_NAME + "="));
  if (!entry) return false;
  const value = entry.slice(COOKIE_NAME.length + 1);
  const [timestamp, suppliedSignature, extra] = value.split(".");
  if (!timestamp || !suppliedSignature || extra !== undefined || !/^\d+$/.test(timestamp)) return false;
  const issuedAt = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60 || now - issuedAt > SESSION_SECONDS) return false;
  const expected = signature(timestamp, secret);
  const left = Buffer.from(suppliedSignature, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_SECONDS = SESSION_SECONDS;
