import {
  ActorRole,
  FeedbackType,
  CreateProjectActivityInput,
  CreateSubmissionHistoryInput,
  CreateMentorFeedbackInput,
} from "./types";

const VALID_ACTOR_ROLES: ReadonlySet<ActorRole> = new Set([
  "student",
  "mentor",
  "coordinator",
  "admin",
  "system",
]);

const VALID_FEEDBACK_TYPES: ReadonlySet<FeedbackType> = new Set([
  "suggestion",
  "correction",
  "approval",
  "revision_required",
  "general",
]);

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates payload for creating a project_activity document.
 * Throws an Error with a descriptive message if invalid.
 */
export function validateProjectActivityInput(
  raw: unknown
): CreateProjectActivityInput {
  if (!isPlainObject(raw)) {
    throw new Error("Project activity input must be an object.");
  }

  if (!isPositiveInteger(raw.projectId)) {
    throw new Error("Validation Error: 'projectId' must be a positive integer.");
  }

  if (!isPositiveInteger(raw.actorId)) {
    throw new Error("Validation Error: 'actorId' must be a positive integer.");
  }

  if (
    typeof raw.actorRole !== "string" ||
    !VALID_ACTOR_ROLES.has(raw.actorRole as ActorRole)
  ) {
    throw new Error(
      `Validation Error: 'actorRole' must be one of: ${Array.from(VALID_ACTOR_ROLES).join(", ")}.`
    );
  }

  if (!isNonEmptyString(raw.action)) {
    throw new Error("Validation Error: 'action' must be a non-empty string.");
  }

  if (!isNonEmptyString(raw.description)) {
    throw new Error("Validation Error: 'description' must be a non-empty string.");
  }

  if (raw.metadata !== undefined && !isPlainObject(raw.metadata)) {
    throw new Error("Validation Error: 'metadata', if provided, must be a key-value object.");
  }

  let timestamp = new Date();
  if (raw.timestamp !== undefined) {
    const parsed = new Date(raw.timestamp as string | number | Date);
    if (isNaN(parsed.getTime())) {
      throw new Error("Validation Error: 'timestamp' must be a valid date.");
    }
    timestamp = parsed;
  }

  return {
    projectId: raw.projectId,
    actorId: raw.actorId,
    actorRole: raw.actorRole as ActorRole,
    action: (raw.action as string).trim(),
    description: (raw.description as string).trim(),
    metadata: raw.metadata as Record<string, unknown> | undefined,
    timestamp,
  };
}

/**
 * Validates payload for creating a submission_history document.
 */
export function validateSubmissionHistoryInput(
  raw: unknown
): CreateSubmissionHistoryInput {
  if (!isPlainObject(raw)) {
    throw new Error("Submission history input must be an object.");
  }

  if (!isPositiveInteger(raw.submissionId)) {
    throw new Error("Validation Error: 'submissionId' must be a positive integer.");
  }

  if (!isPositiveInteger(raw.projectId)) {
    throw new Error("Validation Error: 'projectId' must be a positive integer.");
  }

  if (!isPositiveInteger(raw.studentId)) {
    throw new Error("Validation Error: 'studentId' must be a positive integer.");
  }

  if (!isPositiveInteger(raw.versionNumber)) {
    throw new Error("Validation Error: 'versionNumber' must be a positive integer.");
  }

  if (!isNonEmptyString(raw.fileName)) {
    throw new Error("Validation Error: 'fileName' must be a non-empty string.");
  }

  if (
    typeof raw.fileSizeBytes !== "number" ||
    raw.fileSizeBytes < 0 ||
    !Number.isFinite(raw.fileSizeBytes)
  ) {
    throw new Error("Validation Error: 'fileSizeBytes' must be a non-negative number.");
  }

  if (!isNonEmptyString(raw.mimeType)) {
    throw new Error("Validation Error: 'mimeType' must be a non-empty string.");
  }

  if (raw.metadata !== undefined && !isPlainObject(raw.metadata)) {
    throw new Error("Validation Error: 'metadata', if provided, must be a key-value object.");
  }

  let submittedAt = new Date();
  if (raw.submittedAt !== undefined) {
    const parsed = new Date(raw.submittedAt as string | number | Date);
    if (isNaN(parsed.getTime())) {
      throw new Error("Validation Error: 'submittedAt' must be a valid date.");
    }
    submittedAt = parsed;
  }

  return {
    submissionId: raw.submissionId,
    projectId: raw.projectId,
    studentId: raw.studentId,
    versionNumber: raw.versionNumber,
    fileName: (raw.fileName as string).trim(),
    fileSizeBytes: raw.fileSizeBytes,
    mimeType: (raw.mimeType as string).trim(),
    storagePath: typeof raw.storagePath === "string" ? raw.storagePath.trim() : undefined,
    commitHash: typeof raw.commitHash === "string" ? raw.commitHash.trim() : undefined,
    changeNotes: typeof raw.changeNotes === "string" ? raw.changeNotes.trim() : undefined,
    metadata: raw.metadata as Record<string, unknown> | undefined,
    submittedAt,
  };
}

/**
 * Validates payload for creating a mentor_feedback_history document.
 */
export function validateMentorFeedbackInput(
  raw: unknown
): CreateMentorFeedbackInput {
  if (!isPlainObject(raw)) {
    throw new Error("Mentor feedback input must be an object.");
  }

  if (!isPositiveInteger(raw.projectId)) {
    throw new Error("Validation Error: 'projectId' must be a positive integer.");
  }

  if (!isPositiveInteger(raw.mentorId)) {
    throw new Error("Validation Error: 'mentorId' must be a positive integer.");
  }

  if (raw.submissionId !== undefined && !isPositiveInteger(raw.submissionId)) {
    throw new Error("Validation Error: 'submissionId', if provided, must be a positive integer.");
  }

  if (raw.studentId !== undefined && !isPositiveInteger(raw.studentId)) {
    throw new Error("Validation Error: 'studentId', if provided, must be a positive integer.");
  }

  if (!isNonEmptyString(raw.milestoneTitle)) {
    throw new Error("Validation Error: 'milestoneTitle' must be a non-empty string.");
  }

  if (
    typeof raw.feedbackType !== "string" ||
    !VALID_FEEDBACK_TYPES.has(raw.feedbackType as FeedbackType)
  ) {
    throw new Error(
      `Validation Error: 'feedbackType' must be one of: ${Array.from(VALID_FEEDBACK_TYPES).join(", ")}.`
    );
  }

  if (!isNonEmptyString(raw.comments)) {
    throw new Error("Validation Error: 'comments' must be a non-empty string.");
  }

  if (raw.actionItems !== undefined) {
    if (!Array.isArray(raw.actionItems) || !raw.actionItems.every(isNonEmptyString)) {
      throw new Error("Validation Error: 'actionItems', if provided, must be an array of non-empty strings.");
    }
  }

  if (raw.ratings !== undefined) {
    if (!isPlainObject(raw.ratings)) {
      throw new Error("Validation Error: 'ratings', if provided, must be an object with numeric scores.");
    }
    for (const [k, v] of Object.entries(raw.ratings)) {
      if (typeof v !== "number" || isNaN(v)) {
        throw new Error(`Validation Error: rating for '${k}' must be a number.`);
      }
    }
  }

  if (raw.metadata !== undefined && !isPlainObject(raw.metadata)) {
    throw new Error("Validation Error: 'metadata', if provided, must be a key-value object.");
  }

  let createdAt = new Date();
  if (raw.createdAt !== undefined) {
    const parsed = new Date(raw.createdAt as string | number | Date);
    if (isNaN(parsed.getTime())) {
      throw new Error("Validation Error: 'createdAt' must be a valid date.");
    }
    createdAt = parsed;
  }

  return {
    projectId: raw.projectId,
    mentorId: raw.mentorId,
    submissionId: raw.submissionId as number | undefined,
    studentId: raw.studentId as number | undefined,
    milestoneTitle: (raw.milestoneTitle as string).trim(),
    feedbackType: raw.feedbackType as FeedbackType,
    comments: (raw.comments as string).trim(),
    actionItems: raw.actionItems as string[] | undefined,
    ratings: raw.ratings as Record<string, number> | undefined,
    metadata: raw.metadata as Record<string, unknown> | undefined,
    createdAt,
  };
}

