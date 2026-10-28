import { NextResponse } from "next/server";
import {
  NOSQL_COLLECTIONS,
  NoSqlCollectionName,
  logProjectActivity,
  getProjectActivities,
  recordSubmissionHistory,
  getProjectSubmissionHistory,
  recordMentorFeedback,
  getMentorFeedbackForProject,
} from "@/lib/nosql";

export const dynamic = "force-dynamic";

/**
 * DEVELOPMENT-ONLY DEMO ENDPOINT
 *
 * Demonstrates type-safe write and read operations for CPMS NoSQL collections.
 * - Enforces collection whitelist (never permits arbitrary collections).
 * - Validates input payloads before inserting.
 * - STRICTLY DISABLED IN PRODUCTION (returns 403).
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        message: "This demo endpoint is disabled in production.",
      },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const collection = (searchParams.get("collection") ||
      NOSQL_COLLECTIONS.PROJECT_ACTIVITY) as NoSqlCollectionName;
    const projectIdStr = searchParams.get("projectId") || "1";
    const projectId = parseInt(projectIdStr, 10);

    if (isNaN(projectId) || projectId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Query parameter 'projectId' must be a positive integer.",
        },
        { status: 400 }
      );
    }

    let records: unknown[] = [];

    switch (collection) {
      case NOSQL_COLLECTIONS.PROJECT_ACTIVITY:
        records = await getProjectActivities(projectId);
        break;
      case NOSQL_COLLECTIONS.SUBMISSION_HISTORY:
        records = await getProjectSubmissionHistory(projectId);
        break;
      case NOSQL_COLLECTIONS.MENTOR_FEEDBACK_HISTORY:
        records = await getMentorFeedbackForProject(projectId);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            message: `Unsupported collection '${collection}'. Allowed collections: ${Object.values(
              NOSQL_COLLECTIONS
            ).join(", ")}.`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      developmentNotice:
        "Demo endpoint for development testing only. Not for production use.",
      collection,
      projectId,
      count: records.length,
      data: records,
    });
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        message: "This demo endpoint is disabled in production.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { collection, data } = body;

    if (!collection) {
      return NextResponse.json(
        {
          success: false,
          message: "Field 'collection' is required in request body.",
        },
        { status: 400 }
      );
    }

    let createdRecord: unknown;

    switch (collection) {
      case NOSQL_COLLECTIONS.PROJECT_ACTIVITY:
        createdRecord = await logProjectActivity(data);
        break;
      case NOSQL_COLLECTIONS.SUBMISSION_HISTORY:
        createdRecord = await recordSubmissionHistory(data);
        break;
      case NOSQL_COLLECTIONS.MENTOR_FEEDBACK_HISTORY:
        createdRecord = await recordMentorFeedback(data);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            message: `Access Denied: Collection '${collection}' is not recognized. Whitelisted collections: ${Object.values(
              NOSQL_COLLECTIONS
            ).join(", ")}.`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        developmentNotice:
          "Demo write endpoint for development testing only. Official writes must be authenticated.",
        collection,
        created: createdRecord,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Validation or insertion failed.";
    const isValidationError = errorMsg.startsWith("Validation Error");

    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
