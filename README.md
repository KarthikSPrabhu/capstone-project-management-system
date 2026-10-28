# Capstone Project Management System (CPMS)

A DBMS Level 3 mini-project built with **Next.js (App Router)**, **TypeScript**, **MySQL**, and **MongoDB Atlas**.

---

## 1. System Architecture: MySQL vs. MongoDB Atlas

CPMS uses a **polyglot persistence** architecture to separate authoritative relational business transactions from flexible, append-only history and activity streams.

```
+--------------------------------------------------------------------------+
|                  Capstone Project Management System (CPMS)               |
|                                Next.js App Router                        |
+-------------------------------------+------------------------------------+
                                      |
       +------------------------------+------------------------------+
       |                                                             |
       v                                                             v
+-------------------------------+             +-------------------------------+
|      MySQL (Relational)       |             |     MongoDB Atlas (NoSQL)     |
|   `cpms_db` (Authoritative)   |             |   `cpms_nosql` (Audit & Doc)  |
+-------------------------------+             +-------------------------------+
| • Users, Students & Faculty   |             | • `project_activity`          |
| • Official Projects & Teams   |             |   (Audit trails & events)     |
| • Official Submissions table  |             | • `submission_history`        |
| • Official Evaluation Grades  |             |   (File versions & checksums) |
| • Strict Foreign Keys & ACID  |             | • `mentor_feedback_history`   |
|                               |             |   (Iterative reviews & notes) |
+-------------------------------+             +-------------------------------+
```

### Division of Responsibilities

| Responsibility | Authoritative Store | Database Engine | Rationale |
| :--- | :--- | :--- | :--- |
| **User & Role Records** | Authoritative | **MySQL** | Strict foreign keys, unique email/USN constraints, ACID transactional security. |
| **Project & Allocation** | Authoritative | **MySQL** | Enforces relational constraints between students, projects, and faculty mentors. |
| **Official Submissions** | Authoritative | **MySQL** | Authoritative submission timestamps, status, and milestone deadlines. |
| **Official Marks / Rubrics** | Authoritative | **MySQL** | Final evaluations, grade calculations, and transcript records. |
| **Activity Stream & Audit Logs** | Event Log / History | **MongoDB Atlas** | Fast, append-only, flexible metadata payloads that capture polymorphic project events without schema migrations. |
| **Submission Revision History** | Version Archive | **MongoDB Atlas** | Stores multiple file versions, checksums, commit hashes, and changelog diffs per milestone submission. |
| **Mentor Feedback History** | Qualitative Review | **MongoDB Atlas** | Stores iterative comments, qualitative feedback, action checklist items, and review discussions across iterations. |

---

## 2. MongoDB Atlas Setup Requirements

To connect the application to MongoDB Atlas:

1. **MongoDB Atlas Account & Project**:
   - Create an account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
   - Create a project (e.g. `CPMS`).
2. **Cluster Deployment**:
   - Deploy a free-tier cluster (e.g. `CPMSCluster` on M0).
3. **Database User Credentials**:
   - Under **Database Access**, create a user (e.g., `cpms_admin`) with **Read and Write to any database** privileges.
   - Securely save the password.
4. **Network Access (IP Whitelist)**:
   - Under **Network Access**, add your current IP address (or `0.0.0.0/0` for development and testing environments).
5. **Connection String**:
   - In Atlas, click **Connect** -> **Drivers** (Node.js) -> copy the connection string.

---

## 3. Environment Variables Configuration

Create a `.env.local` file in the project root. This file is ignored by Git and must **never** be committed to version control.

Required variables:

```env
# MongoDB Atlas Connection String
# Replace <username>, <password>, and <cluster-url> with your Atlas cluster details
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority

# Target MongoDB Database Name for CPMS NoSQL collections
MONGODB_DATABASE=cpms_nosql
```

> **Security Note:** Never commit `.env.local` to Git. Connection strings and credentials must always remain confidential.

---

## 4. Getting Started

### Prerequisites
- Node.js 18+ or 20+ installed
- npm, pnpm, or yarn

### Installation & Execution

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Run production build check:
   ```bash
   npm run build
   ```

---

## 5. Testing the MongoDB Health Check

The application provides a diagnostic health-check endpoint at:

```
GET /api/mongodb-test
```

### Testing with Browser or cURL

Run while `npm run dev` is running:

```bash
curl http://localhost:3000/api/mongodb-test
```

### Successful Response (HTTP 200)

```json
{
  "success": true,
  "message": "MongoDB Atlas connection successfully established.",
  "database": "cpms_nosql",
  "timestamp": "2026-10-28T16:41:37.754Z"
}
```

### Safe Error Handling (HTTP 500)

If network access or credentials fail, the endpoint returns safe diagnostic feedback without exposing credentials or internal URI strings:

```json
{
  "success": false,
  "message": "Failed to connect to MongoDB Atlas. Verify cluster status, network access whitelist, and credentials in .env.local.",
  "error": "MongoServerSelectionError"
}
```

> **Environment Restriction:** The `/api/mongodb-test` route is restricted to development and returns HTTP 403 Forbidden in production environments.

---

## 6. MongoDB NoSQL Collections

The application module at `src/lib/nosql` provides type-safe, validated data access for three collections:

### Collection 1: `project_activity`
- **Purpose**: Append-only audit trail and activity log capturing events across the capstone project lifecycle.
- **Relational References**: `projectId` (MySQL `projects.project_id`), `actorId` (MySQL `users.user_id`).
- **Example Document**:
  ```json
  {
    "_id": { "$oid": "6ae225c1acc7140b5ede1eca" },
    "projectId": 101,
    "actorId": 14,
    "actorRole": "student",
    "action": "PROPOSAL_UPLOAD",
    "description": "Uploaded initial capstone proposal document.",
    "metadata": {
      "fileFormat": "PDF",
      "wordCount": 2450,
      "ipAddress": "192.168.1.5"
    },
    "timestamp": "2026-10-28T16:41:37.833Z"
  }
  ```

### Collection 2: `submission_history`
- **Purpose**: Versioned archive of milestone submissions, file metadata, Git commit hashes, and changelog diffs without cluttering the authoritative MySQL submissions table.
- **Relational References**: `submissionId` (MySQL `submissions.submission_id`), `projectId` (MySQL `projects.project_id`), `studentId` (MySQL `students.student_id`).
- **Example Document**:
  ```json
  {
    "_id": { "$oid": "6ae226d2acc7140b5ede1ecb" },
    "submissionId": 45,
    "projectId": 101,
    "studentId": 14,
    "versionNumber": 2,
    "fileName": "cpms_architecture_v2.pdf",
    "fileSizeBytes": 524288,
    "mimeType": "application/pdf",
    "storagePath": "milestones/project_101/v2_architecture.pdf",
    "commitHash": "9a3f12c8b74e2d",
    "changeNotes": "Addressed mentor comments: added ER diagram and MongoDB collections schema.",
    "metadata": {
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "pageCount": 18
    },
    "submittedAt": "2026-10-28T16:41:37.833Z"
  }
  ```

### Collection 3: `mentor_feedback_history`
- **Purpose**: Iterative qualitative feedback stream, checklist reviews, and rubric criteria notes provided by faculty mentors over multiple review rounds.
- **Relational References**: `projectId` (MySQL `projects.project_id`), `mentorId` (MySQL `faculty.faculty_id`), optional `submissionId`.
- **Example Document**:
  ```json
  {
    "_id": { "$oid": "6ae227e3acc7140b5ede1ecc" },
    "projectId": 101,
    "mentorId": 5,
    "submissionId": 45,
    "milestoneTitle": "Architecture & Schema Review",
    "feedbackType": "suggestion",
    "comments": "The dual-database architecture separating MySQL relational data from MongoDB audit logs is well designed. Proceed to milestone 2.",
    "actionItems": [
      "Ensure MongoDB indexes on (projectId, timestamp) are documented",
      "Prepare presentation slides for phase review"
    ],
    "ratings": {
      "technicalClarity": 5,
      "schemaDesign": 5,
      "feasibility": 4
    },
    "metadata": {
      "reviewDurationMinutes": 25
    },
    "createdAt": "2026-10-28T16:41:37.833Z"
  }
  ```

---

## 7. Development Demo Endpoint

For local testing and verification of the NoSQL collections, a demo route is available at `/api/nosql-demo`.

> **Notice:** This endpoint is strictly for local development testing (`NODE_ENV !== "production"`). In production, it returns `403 Forbidden`. Official writes in the application require authentication and authorization.

### Read Demo Records
```bash
GET /api/nosql-demo?collection=project_activity&projectId=101
```

### Write Demo Record
```bash
POST /api/nosql-demo
Content-Type: application/json

{
  "collection": "project_activity",
  "data": {
    "projectId": 101,
    "actorId": 14,
    "actorRole": "student",
    "action": "PROPOSAL_UPLOAD",
    "description": "Uploaded proposal draft.",
    "metadata": { "wordCount": 2400 }
  }
}
```
Supported collections for this endpoint: `project_activity`, `submission_history`, and `mentor_feedback_history`. Arbitrary collection names are rejected with `400 Bad Request`.
