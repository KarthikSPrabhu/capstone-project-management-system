import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getGroupById } from "@/lib/groups";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/groups/[id]
 * Retrieves complete details, member roster, and linked project for a group.
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }
  if (session.role !== "Admin") {
    return NextResponse.json(
      { success: false, message: "Access denied. Administrator privileges required." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const groupId = parseInt(id, 10);
  if (isNaN(groupId) || groupId <= 0) {
    return NextResponse.json(
      { success: false, message: "Invalid group ID." },
      { status: 400 }
    );
  }

  try {
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: `Capstone group #${groupId} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, group });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

