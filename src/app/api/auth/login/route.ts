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
export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : "127.0.0.1";

  // 1. Rate limiting check
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds || 60} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds || 60),
        },
      }
    );
  }

  try {
    const rawBody = await request.json();
    const validatedInput = loginSchema.parse(rawBody);

    // 2. Authenticate user
    const user = await authenticateUser(validatedInput);

    // 3. Reset rate limiter on successful authentication
    resetAttempts(clientIp);

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
    recordFailedAttempt(clientIp);

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
