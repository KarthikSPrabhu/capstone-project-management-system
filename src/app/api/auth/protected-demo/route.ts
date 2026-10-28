import { NextResponse } from "next/server";
import {
  getSessionFromRequest,
  getSession,
  UserRole,
  AuthenticationError,
  AuthorizationError,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Example protected API endpoint demonstrating server-side role enforcement.
 * Query parameter `role`: "Admin", "Mentor", "Student", or omitted (any authenticated user).
 */
export async function GET(request: Request) {
  try {
    const session =
      (await getSessionFromRequest(request)) || (await getSession());

    if (!session) {
      throw new AuthenticationError();
    }

    const { searchParams } = new URL(request.url);
    const requiredRole = searchParams.get("role") as UserRole | null;

    if (requiredRole && session.role !== requiredRole && session.role !== "Admin") {
      throw new AuthorizationError(
        `Access denied. Required role: ${requiredRole}. Your role: ${session.role}.`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Access granted for role ${session.role}.`,
      session: {
        userId: session.userId,
        email: session.email,
        role: session.role,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
