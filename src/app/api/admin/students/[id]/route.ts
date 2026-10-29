import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  getStudentById,
  updateStudent,
  updateStudentSchema,
} from "@/lib/students";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/students/[id]
 * Retrieves complete student profile and group history.
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
  const studentId = parseInt(id, 10);
  if (isNaN(studentId) || studentId <= 0) {
    return NextResponse.json(
      { success: false, message: "Invalid student ID." },
      { status: 400 }
    );
  }

  try {
    const student = await getStudentById(studentId);
    if (!student) {
      return NextResponse.json(
        { success: false, message: `Student #${studentId} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, student });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/students/[id]
 * Updates academic details or profile for a student.
 */
export async function PATCH(request: Request, context: RouteContext) {
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
  const studentId = parseInt(id, 10);
  if (isNaN(studentId) || studentId <= 0) {
    return NextResponse.json(
      { success: false, message: "Invalid student ID." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const validated = updateStudentSchema.parse(body);
    await updateStudent(studentId, validated);

    return NextResponse.json({
      success: true,
      message: "Student updated successfully.",
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || "Invalid update payload." },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to update student.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

