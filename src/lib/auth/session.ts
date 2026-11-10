import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "@/lib/mysql";
import { SessionPayload, UserRole, USER_ROLES } from "./types";

export const SESSION_COOKIE_NAME = "cpms_session";
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Retrieves the cryptographic secret key for JWT session signing.
 * Strictly throws if SESSION_SECRET is missing or insufficiently strong.
 * Refuses to use any hardcoded or insecure fallback secret.
 */
export function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "Configuration error: Missing or insecure SESSION_SECRET environment variable. Please define a secret of at least 32 characters in .env.local."
    );
  }
  return new TextEncoder().encode(secret.trim());
}

/**
 * Signs a JWT session token with HS256.
 */
export async function signSessionToken(
  payload: { userId: number; email: string; role: UserRole },
  expiresIn = "7d"
): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

/**
 * Verifies a JWT session token using jose and validates payload claims.
 * Returns the decoded SessionPayload or null if invalid or expired.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.userId !== "number" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      !USER_ROLES.includes(payload.role as UserRole)
    ) {
      return null;
    }

    return {
      sub: payload.sub as string,
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the active session from a Request object.
 */
export async function getSessionFromRequest(
  request: Request
): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`)
  );
  if (!match) {
    return null;
  }
  return resolveActiveSession(await verifySessionToken(match[1]));
}

/**
 * Re-checks a verified token against the authoritative `users` table.
 *
 * A signed token only proves who the user was when they logged in. This makes
 * suspending / deactivating an account, deleting it, or changing its role take
 * effect on the very next request instead of when the 7-day token expires.
 * The role and email always come from the database, never from the token.
 */
export async function resolveActiveSession(
  payload: SessionPayload | null
): Promise<SessionPayload | null> {
  if (!payload) {
    return null;
  }
  const rows = await query<
    Array<{ email: string; role: string; account_status: string }>
  >(
    "SELECT email, role, account_status FROM users WHERE user_id = ? LIMIT 1",
    [payload.userId]
  );
  const user = rows[0];
  if (
    !user ||
    user.account_status !== "Active" ||
    !USER_ROLES.includes(user.role as UserRole)
  ) {
    return null;
  }
  return { ...payload, email: user.email, role: user.role as UserRole };
}

/**
 * Server-side helper to read and verify the active session in Next.js Server Components.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    return await resolveActiveSession(await verifySessionToken(token));
  } catch {
    return null;
  }
}

/**
 * Attaches the signed session token as an HttpOnly, SameSite=Lax cookie onto a NextResponse.
 */
export function attachSessionCookie(
  response: NextResponse,
  token: string
): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/**
 * Clears the session cookie on a NextResponse during logout.
 */
export function clearSessionCookieOnResponse(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
