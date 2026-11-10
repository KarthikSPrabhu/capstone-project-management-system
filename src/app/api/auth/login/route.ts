import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  loginSchema,
  authenticateUser,
  signSessionToken,
  attachSessionCookie,
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
  getRoleDashboardPath,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 *
 * Authenticates user credentials against the MySQL Users table.
 * Enforces rate limiting, input validation with Zod, and creates an HttpOnly session cookie on success.
 */
/**
 * Client IP for rate limiting.
 *
 * `X-Forwarded-For` is set by whoever sends the request, so it is only trusted
 * when the app runs behind a reverse proxy you control (TRUST_PROXY=true).
 * The right-most entry is used: it is the one appended by that proxy, while
 * every entry to its left can be forged by the client.
 */
function getClientIp(request: Request): string | null {
  if (process.env.TRUST_PROXY !== "true") {
    return null;
  }
  const entries = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

function tooManyAttempts(retryAfterSeconds?: number) {
  const seconds = retryAfterSeconds || 60;
  return NextResponse.json(
    {
      success: false,
      message: `Too many failed login attempts. Please try again in ${seconds} seconds.`,
    },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  // Failed attempts are counted per IP (when known) and per account email,
  // so changing a header cannot reset the count for a targeted account.
  const rateLimitKeys: string[] = clientIp ? [`ip:${clientIp}`] : [];

  // 1. Rate limiting check (IP), before any work is done
  for (const key of rateLimitKeys) {
    const limit = checkRateLimit(key);
    if (!limit.allowed) return tooManyAttempts(limit.retryAfterSeconds);
  }

  try {
    const rawBody = await request.json();
    const validatedInput = loginSchema.parse(rawBody);

    // 1b. Rate limiting check (account)
    rateLimitKeys.push(`email:${validatedInput.email.trim().toLowerCase()}`);
    const accountLimit = checkRateLimit(rateLimitKeys[rateLimitKeys.length - 1]);
    if (!accountLimit.allowed) return tooManyAttempts(accountLimit.retryAfterSeconds);

    // 2. Authenticate user
    const user = await authenticateUser(validatedInput);

    // 3. Reset rate limiter on successful authentication
    rateLimitKeys.forEach(resetAttempts);

    // 4. Generate signed session token and attach HttpOnly cookie
    const token = await signSessionToken({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful.",
        user,
        redirectTo: getRoleDashboardPath(user.role),
      },
      { status: 200 }
    );

    attachSessionCookie(response, token);
    return response;
  } catch (error: unknown) {
    // Record failed attempt for rate limiting
    rateLimitKeys.forEach(recordFailedAttempt);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || "Invalid input payload.",
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Authentication failed.";

    // If database configuration is missing
    if (message.includes("SESSION_SECRET") || message.includes("Configuration error")) {
      console.error("[Auth Server Error]", message);
      return NextResponse.json(
        {
          success: false,
          message: "Server authentication service is misconfigured.",
        },
        { status: 500 }
      );
    }

    // Generic 401 response for bad credentials or unhashed placeholder accounts
    return NextResponse.json(
      {
        success: false,
        message: "Invalid email or password.",
      },
      { status: 401 }
    );
  }
}
