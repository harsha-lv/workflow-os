import { cookies } from "next/headers";
import { sign, verifySignature } from "./crypto";

export const SESSION_COOKIE = "wos_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 14;

export type SessionPayload = {
  userId: string;
  orgId: string | null;
  exp: number;
};

function encode(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!verifySignature(body, sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string, orgId: string | null): string {
  return encode({ userId, orgId, exp: Date.now() + TTL_MS });
}

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export async function writeSession(userId: string, orgId: string | null): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId, orgId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "false" ? false : process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
