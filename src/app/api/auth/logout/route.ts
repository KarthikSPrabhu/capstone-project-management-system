import { NextResponse } from "next/server";
import { clearSessionCookieOnResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 *
 * Clears the HttpOnly session cookie to terminate the user session.
 */
export async function POST() {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully.",
      },
      { status: 200 }
    );

    clearSessionCookieOnResponse(response);
    return response;
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Logout encountered an error.";
    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
