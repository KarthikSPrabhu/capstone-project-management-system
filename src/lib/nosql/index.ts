import { Collection, Document } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import {
  NOSQL_COLLECTIONS,
  NoSqlCollectionName,
  ProjectActivityDocument,
  CreateProjectActivityInput,
  SubmissionHistoryDocument,
  CreateSubmissionHistoryInput,
  MentorFeedbackHistoryDocument,
  CreateMentorFeedbackInput,
} from "./types";
import {
  validateProjectActivityInput,
  validateSubmissionHistoryInput,
  validateMentorFeedbackInput,
} from "./validators";

export * from "./types";
export * from "./validators";

/**
 * Type-safe, whitelisted collection getter.
 * Strictly prevents dynamic / arbitrary collection name injection from client requests.
 */
export async function getNoSqlCollection<T extends Document>(
  collectionName: NoSqlCollectionName
): Promise<Collection<T>> {
  const allowedNames = Object.values(NOSQL_COLLECTIONS) as string[];
  if (!allowedNames.includes(collectionName)) {
    throw new Error(
      `Access Denied: Collection '${collectionName}' is not a recognized CPMS NoSQL collection.`
    );
  }

  const db = await getMongoDb();
  return db.collection<T>(collectionName);
}

// =========================================================================
// 1. project_activity Data Access
// =========================================================================

/**
 * Logs an append-only timeline activity for a CPMS project.
 * Validates all required relational foreign keys and inputs before inserting.
 */
export async function logProjectActivity(
  input: CreateProjectActivityInput | unknown
): Promise<ProjectActivityDocument> {
  const validated = validateProjectActivityInput(input);
  const collection = await getNoSqlCollection<ProjectActivityDocument>(
    NOSQL_COLLECTIONS.PROJECT_ACTIVITY
  );

  const document: ProjectActivityDocument = {
    projectId: validated.projectId,
    actorId: validated.actorId,
    actorRole: validated.actorRole,
    action: validated.action,
    description: validated.description,
    metadata: validated.metadata,
    timestamp: validated.timestamp || new Date(),
  };

  const result = await collection.insertOne(document);
  return { ...document, _id: result.insertedId };
}

/**
 * Retrieves recent activity stream events for a specific project.
 */
export async function getProjectActivities(
  projectId: number,
  limit = 50
): Promise<ProjectActivityDocument[]> {
  if (typeof projectId !== "number" || projectId <= 0) {
    throw new Error("Invalid projectId: must be a positive integer.");
  }

  const safeLimit = Math.min(Math.max(1, limit), 100);
  const collection = await getNoSqlCollection<ProjectActivityDocument>(
    NOSQL_COLLECTIONS.PROJECT_ACTIVITY
  );

  return collection
    .find({ projectId })
    .sort({ timestamp: -1 })
    .limit(safeLimit)
    .toArray();
}

// =========================================================================
// 2. submission_history Data Access
// =========================================================================

/**
 * Records an immutable versioned file snapshot for a student milestone submission.
 * Official active submission state remains authoritative in MySQL.
 */
export async function recordSubmissionHistory(
  input: CreateSubmissionHistoryInput | unknown
): Promise<SubmissionHistoryDocument> {
  const validated = validateSubmissionHistoryInput(input);
  const collection = await getNoSqlCollection<SubmissionHistoryDocument>(
    NOSQL_COLLECTIONS.SUBMISSION_HISTORY
  );

  const document: SubmissionHistoryDocument = {
    submissionId: validated.submissionId,
    projectId: validated.projectId,
    studentId: validated.studentId,
    versionNumber: validated.versionNumber,
    fileName: validated.fileName,
    fileSizeBytes: validated.fileSizeBytes,
    mimeType: validated.mimeType,
    storagePath: validated.storagePath,
    commitHash: validated.commitHash,
    changeNotes: validated.changeNotes,
    metadata: validated.metadata,
    submittedAt: validated.submittedAt || new Date(),
  };

  const result = await collection.insertOne(document);
  return { ...document, _id: result.insertedId };
}

/**
 * Retrieves full version revision history for a specific submission ID.
 */
export async function getSubmissionHistory(
  submissionId: number
): Promise<SubmissionHistoryDocument[]> {
  if (typeof submissionId !== "number" || submissionId <= 0) {
    throw new Error("Invalid submissionId: must be a positive integer.");
  }

  const collection = await getNoSqlCollection<SubmissionHistoryDocument>(
    NOSQL_COLLECTIONS.SUBMISSION_HISTORY
  );

  return collection
    .find({ submissionId })
    .sort({ versionNumber: -1 })
    .toArray();
}

/**
 * Retrieves all submission revisions for a project.
 */
export async function getProjectSubmissionHistory(
  projectId: number
): Promise<SubmissionHistoryDocument[]> {
  if (typeof projectId !== "number" || projectId <= 0) {
    throw new Error("Invalid projectId: must be a positive integer.");
  }

  const collection = await getNoSqlCollection<SubmissionHistoryDocument>(
    NOSQL_COLLECTIONS.SUBMISSION_HISTORY
  );

  return collection
    .find({ projectId })
    .sort({ submittedAt: -1 })
    .toArray();
}

// =========================================================================
// 3. mentor_feedback_history Data Access
// =========================================================================

/**
 * Records qualitative review commentary and action checklist items from a mentor.
 * Official rubric scores and final evaluations remain authoritative in MySQL.
 */
export async function recordMentorFeedback(
  input: CreateMentorFeedbackInput | unknown
): Promise<MentorFeedbackHistoryDocument> {
  const validated = validateMentorFeedbackInput(input);
  const collection = await getNoSqlCollection<MentorFeedbackHistoryDocument>(
    NOSQL_COLLECTIONS.MENTOR_FEEDBACK_HISTORY
  );

  const document: MentorFeedbackHistoryDocument = {
    projectId: validated.projectId,
    mentorId: validated.mentorId,
    submissionId: validated.submissionId,
    studentId: validated.studentId,
    milestoneTitle: validated.milestoneTitle,
    feedbackType: validated.feedbackType,
    comments: validated.comments,
    actionItems: validated.actionItems,
    ratings: validated.ratings,
    metadata: validated.metadata,
    createdAt: validated.createdAt || new Date(),
  };

  const result = await collection.insertOne(document);
  return { ...document, _id: result.insertedId };
}

/**
 * Retrieves all qualitative feedback records for a given project.
 */
export async function getMentorFeedbackForProject(
  projectId: number
): Promise<MentorFeedbackHistoryDocument[]> {
  if (typeof projectId !== "number" || projectId <= 0) {
    throw new Error("Invalid projectId: must be a positive integer.");
  }

  const collection = await getNoSqlCollection<MentorFeedbackHistoryDocument>(
    NOSQL_COLLECTIONS.MENTOR_FEEDBACK_HISTORY
  );

  return collection
    .find({ projectId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Retrieves all mentor feedback notes attached to a specific submission.
 */
export async function getMentorFeedbackForSubmission(
  submissionId: number
): Promise<MentorFeedbackHistoryDocument[]> {
  if (typeof submissionId !== "number" || submissionId <= 0) {
    throw new Error("Invalid submissionId: must be a positive integer.");
  }

  const collection = await getNoSqlCollection<MentorFeedbackHistoryDocument>(
    NOSQL_COLLECTIONS.MENTOR_FEEDBACK_HISTORY
  );

  return collection
    .find({ submissionId })
    .sort({ createdAt: -1 })
    .toArray();
}

