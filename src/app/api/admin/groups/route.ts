import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth/session";
import {
  getGroups,
  getGroupStats,
  createGroup,
  groupFilterSchema,
  createGroupSchema,
} from "@/lib/groups";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/groups
 * Lists capstone groups with leader details, member counts, and project titles.
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
    const parsedParams = groupFilterSchema.parse({
      search: searchParams.get("search") || undefined,
      department: searchParams.get("department") || undefined,
      batch: searchParams.get("batch") || undefined,
      academic_year: searchParams.get("academic_year") || undefined,
      status: searchParams.get("status") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const [result, stats] = await Promise.all([
      getGroups(parsedParams),
      getGroupStats(),
    ]);

    return NextResponse.json({
      success: true,
      groups: result.groups,
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
 * POST /api/admin/groups
 * Atomically creates a capstone project group and assigns members within a transaction.
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
    const validated = createGroupSchema.parse(body);
    const result = await createGroup(validated);

    return NextResponse.json(
      {
        success: true,
        message: `Capstone Group "${result.group_name}" created successfully.`,
        group: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || "Validation failed." },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to create group.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

