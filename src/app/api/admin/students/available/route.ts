import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAvailableStudents } from "@/lib/students";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/students/available
 * Returns active students who are not assigned to any active capstone group.
 */
export async function GET(request: Request) {
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

  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department") || undefined;
    const batch = searchParams.get("batch") || undefined;

    const available = await getAvailableStudents(department, batch);

    return NextResponse.json({
      success: true,
      students: available,
      count: available.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

