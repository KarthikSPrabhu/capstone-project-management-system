import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  getStudents,
  getStudentStats,
  createStudent,
  studentFilterSchema,
  createStudentSchema,
} from "@/lib/students";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/students
 * Searchable, filterable student directory for Admin role.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Authentication required. Please log in." },
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
    const parsedParams = studentFilterSchema.parse({
      search: searchParams.get("search") || undefined,
      department: searchParams.get("department") || undefined,
      batch: searchParams.get("batch") || undefined,
      semester: searchParams.get("semester") || undefined,
      section: searchParams.get("section") || undefined,
      status: searchParams.get("status") || undefined,
      groupStatus: searchParams.get("groupStatus") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const [result, stats] = await Promise.all([
      getStudents(parsedParams),
      getStudentStats(),
    ]);

    return NextResponse.json({
      success: true,
      students: result.students,
      total: result.total,
      page: parsedParams.page,
      limit: parsedParams.limit,
      stats,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || "Invalid query parameters." },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * POST /api/admin/students
 * Provisions a new student record and user account.
 */
export async function POST(request: Request) {
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
    const body = await request.json();
    const validated = createStudentSchema.parse(body);
    const newStudent = await createStudent(validated);

    return NextResponse.json(
      {
        success: true,
        message: `Student "${validated.full_name}" (${newStudent.usn}) provisioned successfully.`,
        student: newStudent,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || "Invalid input payload." },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to create student.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

