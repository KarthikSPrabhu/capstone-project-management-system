import type { ObjectId } from "mongodb";

/**
 * Whitelisted NoSQL collection names for CPMS.
 * Enforces strict collection boundaries and prevents arbitrary collection access.
 */
export const NOSQL_COLLECTIONS = {
  PROJECT_ACTIVITY: "project_activity",
  SUBMISSION_HISTORY: "submission_history",
  MENTOR_FEEDBACK_HISTORY: "mentor_feedback_history",
} as const;

export type NoSqlCollectionName =
  (typeof NOSQL_COLLECTIONS)[keyof typeof NOSQL_COLLECTIONS];

/**
 * Roles allowed to perform and log actions in the project activity stream.
 */
export type ActorRole = "student" | "mentor" | "coordinator" | "admin" | "system";

/**
 * Types of feedback recorded in mentor reviews.
 */
export type FeedbackType =
  | "suggestion"
  | "correction"
  | "approval"
  | "revision_required"
  | "general";

// ==========================================
// 1. project_activity
// ==========================================

/**
 * Document shape stored in MongoDB `project_activity`.
 * Stores flexible append-only timeline events without duplicating MySQL project records.
 */
export interface ProjectActivityDocument {
  _id?: ObjectId;
  /** References MySQL `projects.project_id` (authoritative) */
  projectId: number;
  /** References MySQL `users.user_id` / `students.student_id` / `faculty.faculty_id` */
  actorId: number;
  actorRole: ActorRole;
  /** Verb or action code, e.g. "PROJECT_CREATED", "STATUS_UPDATED", "SUBMISSION_UPLOADED" */
  action: string;
  /** Human-readable event description */
  description: string;
  /** Flexible contextual payload (e.g., status diffs, changed fields, IP address) */
  metadata?: Record<string, unknown>;
  /** Timestamp when event was recorded */
  timestamp: Date;
}

export interface CreateProjectActivityInput {
  projectId: number;
  actorId: number;
  actorRole: ActorRole;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

// ==========================================
// 2. submission_history
// ==========================================

/**
 * Document shape stored in MongoDB `submission_history`.
 * Stores versioned file metadata, checksums, and revision notes.
 * Official submission status and marks remain authoritative in MySQL.
 */
export interface SubmissionHistoryDocument {
  _id?: ObjectId;
  /** References MySQL `submissions.submission_id` (authoritative) */
  submissionId: number;
  /** References MySQL `projects.project_id` */
  projectId: number;
  /** References MySQL `students.student_id` */
  studentId: number;
  /** Sequential revision version number (1, 2, 3...) */
  versionNumber: number;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  /** Storage key or relative URL in object storage */
  storagePath?: string;
  /** Optional Git commit hash or repository link */
  commitHash?: string;
  /** Student's revision changelog or notes */
  changeNotes?: string;
  /** Flexible metadata (e.g. sha256 checksum, page count, diff summary) */
  metadata?: Record<string, unknown>;
  /** Timestamp of this specific submission attempt */
  submittedAt: Date;
}

export interface CreateSubmissionHistoryInput {
  submissionId: number;
  projectId: number;
  studentId: number;
  versionNumber: number;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storagePath?: string;
  commitHash?: string;
  changeNotes?: string;
  metadata?: Record<string, unknown>;
  submittedAt?: Date;
}

// ==========================================
// 3. mentor_feedback_history
// ==========================================

/**
 * Document shape stored in MongoDB `mentor_feedback_history`.
 * Stores rich qualitative reviews, line comments, and checklists across iterations.
 * Official rubric scores and final evaluations remain authoritative in MySQL.
 */
export interface MentorFeedbackHistoryDocument {
  _id?: ObjectId;
  /** References MySQL `projects.project_id` (authoritative) */
  projectId: number;
  /** References MySQL `faculty.faculty_id` */
  mentorId: number;
  /** Optional reference to MySQL `submissions.submission_id` */
  submissionId?: number;
  /** Optional reference to specific student for targeted feedback */
  studentId?: number;
  /** Title of milestone or deliverable reviewed */
  milestoneTitle: string;
  feedbackType: FeedbackType;
  /** Qualitative comments / markdown review text */
  comments: string;
  /** Actionable checklist items for student revision */
  actionItems?: string[];
  /** Optional rubric criteria scores (e.g. { clarity: 4, technicalDepth: 5 }) */
  ratings?: Record<string, number>;
  /** Flexible metadata */
  metadata?: Record<string, unknown>;
  /** Timestamp when feedback was submitted */
  createdAt: Date;
}

export interface CreateMentorFeedbackInput {
  projectId: number;
  mentorId: number;
  submissionId?: number;
  studentId?: number;
  milestoneTitle: string;
  feedbackType: FeedbackType;
  comments: string;
  actionItems?: string[];
  ratings?: Record<string, number>;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

