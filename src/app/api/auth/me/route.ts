import { NextResponse } from "next/server";
import { getSessionFromRequest, getSession, findUserById } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's safe profile.
 * Never exposes passwords, hashes, or session tokens.
 */
export async function GET(request: Request) {
  try {
    const session =
      (await getSessionFromRequest(request)) || (await getSession());
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    // Attempt to fetch fresh database state, falling back to verified session claims
    let safeUser = null;
    try {
      safeUser = await findUserById(session.userId);
    } catch {
      // Fallback to verified JWT payload claims if database is unreachable
      safeUser = {
        user_id: session.userId,
        email: session.email,
        role: session.role,
      };
    }

    if (!safeUser) {
      safeUser = {
        user_id: session.userId,
        email: session.email,
        role: session.role,
      };
    }

    return NextResponse.json(
      {
        success: true,
        user: safeUser,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Authentication check failed.";
    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
