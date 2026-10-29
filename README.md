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
| **Authentication & Roles** | Authoritative | **MySQL** | Strict uniqueness on email, relational linkage to Students/Mentors, ACID compliance. |
| **User & Role Records** | Authoritative | **MySQL** | Strict foreign keys, unique email/USN constraints, ACID transactional security. |
| **Project & Allocation** | Authoritative | **MySQL** | Enforces relational constraints between students, projects, and faculty mentors. |
| **Official Submissions** | Authoritative | **MySQL** | Authoritative submission timestamps, status, and milestone deadlines. |
| **Official Marks / Rubrics** | Authoritative | **MySQL** | Final evaluations, grade calculations, and transcript records. |
| **Activity Stream & Audit Logs** | Event Log / History | **MongoDB Atlas** | Fast, append-only, flexible metadata payloads that capture polymorphic project events without schema migrations. |
| **Submission Revision History** | Version Archive | **MongoDB Atlas** | Stores multiple file versions, checksums, commit hashes, and changelog diffs per milestone submission. |
| **Mentor Feedback History** | Qualitative Review | **MongoDB Atlas** | Stores iterative comments, qualitative feedback, action checklist items, and review discussions across iterations. |

---

## 2. Authentication & Role-Based Access Control (Phase 1)

CPMS implements secure, server-side authentication and role-based access control (RBAC) backed by the authoritative MySQL `Users` table.

### User Roles
- `Student`: Access to student dashboard (`/dashboard/student`), project proposals, submission uploads.
- `Mentor`: Access to mentor dashboard (`/dashboard/mentor`), project group reviews, feedback recording.
- `Admin`: Access to administration dashboard (`/dashboard/admin`), guide allocation, user management.

### Authoritative MySQL `Users` Schema
```sql
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Student', 'Mentor', 'Admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Security Architecture
1. **Password Verification**: Passwords are verified against bcrypt hashes using `bcryptjs`. Plaintext passwords are never stored or compared.
2. **Session Tokens**: JWT sessions are cryptographically signed using `jose` with the `HS256` algorithm using `SESSION_SECRET`.
3. **Cookie Security**: Sessions are stored in an `HttpOnly`, `SameSite=Lax`, and `Secure` (in production) cookie (`cpms_session`), preventing JavaScript access (XSS mitigation).
4. **Rate Limiting**: Mitigates brute-force credential attacks by limiting failed attempts per IP (max 5 failed attempts per 15-minute sliding window).
5. **Anti-Enumeration**: Authentication returns generic `Invalid email or password` errors to prevent email/username enumeration.
6. **Server-Side RBAC**: Authorization is enforced strictly on the server (`requireRole()`, `requireStudent()`, `requireMentor()`, `requireAdmin()`). Client-supplied role claims are never trusted.

---

## 3. Environment Variables Configuration

Configure your `.env.local` file in the project root. This file is ignored by Git and must **never** be committed.

```env
# ==========================================
# MySQL Database Configuration
# ==========================================
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=<your_mysql_password>
MYSQL_DATABASE=cpms_db

# ==========================================
# Security & Session Configuration
# ==========================================
# Generate a secure 32+ character string (e.g. openssl rand -base64 32)
SESSION_SECRET=<minimum_32_character_cryptographic_secret>

# ==========================================
# MongoDB Atlas Configuration
# ==========================================
# Replace placeholders with your Atlas cluster details
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
MONGODB_DATABASE=cpms_nosql
```

> **Security Note:** Never commit secret values or `.env.local` to source control.

---

## 4. Getting Started

### Prerequisites
- Node.js 18+ or 20+
- MySQL Server 8.0 running locally on port 3306 with database `cpms_db`
- MongoDB Atlas free cluster

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
4. Navigate to `/login` to access the CPMS Portal Login page.

5. Run production build check:
   ```bash
   npm run build
   ```

---

## 5. Authentication API Endpoints

| Endpoint | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public (Rate Limited) | Validates credentials via Zod + bcrypt, returns safe user object, sets HttpOnly session cookie. |
| `/api/auth/logout` | `POST` | Authenticated | Clears the `cpms_session` cookie. |
| `/api/auth/me` | `GET` | Authenticated | Returns current authenticated safe user profile (`user_id`, `email`, `role`). |
| `/api/auth/protected-demo` | `GET` | Authenticated | Diagnostic route demonstrating server-side role validation (`?role=Admin`, `Mentor`, `Student`). |

### Example Login Request
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@pes.edu", "password": "YourPassword123"}' \
  -c cookies.txt
```

### Example Check Current User
```bash
curl http://localhost:3000/api/auth/me -b cookies.txt
```

---

## 6. Testing the MongoDB Health Check

```bash
curl http://localhost:3000/api/mongodb-test
```
Response (HTTP 200):
```json
{
  "success": true,
  "message": "MongoDB Atlas connection successfully established.",
  "database": "cpms_nosql",
  "timestamp": "2026-10-28T16:41:37.754Z"
}
```

---

## 7. MongoDB NoSQL Collections

The application module at `src/lib/nosql` provides type-safe, validated data access for three collections:

1. `project_activity`: Real-time activity audit trail and project event log.
2. `submission_history`: Multi-version milestone submission file snapshots and checksums.
3. `mentor_feedback_history`: Qualitative review commentary, checklist items, and rubric notes.

---

## 8. Student and Group Management (Phase 2)

Phase 2 introduces authoritative student directory management and capstone project group formation.

### Relational Schema Linkage
```
+---------------+       +------------------+       +-------------------+
|     Users     | ----> |     Students     | ----> |   Group_Members   |
|  (Auth Info)  | 1 : 1 |  (USN & Academic)| 1 : N | (Active Membership|
+---------------+       +------------------+       +---------+---------+
                                                             | N : 1
                                                             v
+---------------------+       +------------------------------------+
|  Capstone_Projects  | <---- |           Project_Groups           |
| (Official Project)  | 1 : 1 |    (Team Size, Year, & Leader)     |
+---------------------+       +------------------------------------+
```

### Business Rules & Security Enforcements
1. **Capacity Limit**: Enforces a strict maximum of **4 active members** per capstone group.
2. **Single Active Group Rule**: Prevents any student from belonging to multiple active, non-disbanded groups simultaneously.
3. **Team Leader Integrity**: The designated team leader must be an active member of the created group.
4. **ACID Transactions**: Group creation, member additions, and project linkage are executed atomically within managed MySQL transactions (`withTransaction`), guaranteeing clean rollbacks on failure.
5. **Role-Based Authorization**: All student management, directory queries, and group formation APIs require verified `Admin` role privileges (`requireAdmin()`).
6. **Data Privacy**: Student records, directory views, and group detail queries never expose `password_hash` or sensitive authentication tokens.

### Phase 2 Admin API Endpoints

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/admin/students` | `GET` | `Admin` | Searchable student directory with filtering by USN, name, department, batch, semester, and allocation status. |
| `/api/admin/students` | `POST` | `Admin` | Provisions a new student and associated user account. |
| `/api/admin/students/[id]` | `GET` | `Admin` | Retrieves detailed student profile, current active group, team roster, and past group history. |
| `/api/admin/students/[id]` | `PATCH` | `Admin` | Updates student academic status, section, semester, or contact details. |
| `/api/admin/students/available` | `GET` | `Admin` | Returns active students who are unassigned to any active capstone group. |
| `/api/admin/groups` | `GET` | `Admin` | Lists capstone groups with leader information, active member count, and linked project status. |
| `/api/admin/groups` | `POST` | `Admin` | Atomically creates a capstone project group, assigns members, and optionally links project synopsis. |
| `/api/admin/groups/[id]` | `GET` | `Admin` | Retrieves full group details, complete member roster, and linked Capstone Project specifications. |

### Running Phase 2 Automated Tests
```bash
npm run test:phase2
```
This automated suite verifies RBAC blocking, student search, credential privacy, 4-member limit enforcement, leader validation, duplicate active group prevention, and multi-table transactional creation.

---

## 9. Capstone Project and Mentor Management (Phase 3)

Phase 3 introduces comprehensive capstone project lifecycle tracking, faculty mentor capacity governance, and role-based mentor allocations.

### Relational Schema Linkage
```
+---------------------+       1 : 1 (Unique)       +------------------------------------+
|  Capstone_Projects  | <------------------------- |           Project_Groups           |
| (Title, Domain, etc)|                            |    (Team Size, Year, & Leader)     |
+----------+----------+                            +------------------------------------+
           | 1 : N
           v
+-----------------------+     N : 1                +------------------------------------+
|   Mentor_Allocations  | -----------------------> |          Capstone_Mentors          |
| (Primary / Co-Mentor) |                          | (Capacity, Workload & Availability)|
+-----------------------+                          +-----------------+------------------+
                                                                     | 1 : 1
                                                                     v
                                                           +-------------------+
                                                           |       Users       |
                                                           |    (Mentor Auth)  |
                                                           +-------------------+
```

### Business Rules & Core Invariants
1. **1-to-1 Group-to-Project Integrity**: Enforces MySQL `UNIQUE KEY` constraint on `Capstone_Projects.group_id`. A capstone group can be associated with at most one capstone project.
2. **Mentor Capacity & Workload Governance**: A faculty mentor's workload is tracked via their active allocations count (`allocation_status = 'Active'`). Allocations are strictly rejected if a mentor has reached their maximum quota (`max_projects`) or if their availability status is set to `Unavailable`.
3. **Primary Mentor Mutual Exclusivity**: A capstone project can have at most one active `Primary` mentor at any given time. When an administrator allocates a new Primary mentor, any existing active Primary mentor allocation is atomically transitioned to `Ended` (`end_date = CURDATE()`) inside a managed transaction.
4. **Duplicate Allocation Prevention**: Enforces the composite unique constraint `uq_project_mentor (project_id, mentor_id)` in `mentor_allocations`. An active mentor cannot be re-allocated to the same project. If an allocation previously ended, the system safely reactivates the record.
5. **ACID Transactional Guarantees**: Multi-step project creation, mentor workload evaluation, and atomic primary mentor reassignments are executed inside `withTransaction()` with row-level locks (`FOR UPDATE`).
6. **Data Confidentiality & RBAC**: All project and mentor management APIs and dashboard views are restricted to administrators (`requireAdmin()`). Sensitive credentials (`password_hash`, session keys) are never exposed.

### Phase 3 Admin API Endpoints

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/admin/projects` | `GET` | `Admin` | Lists capstone projects with search, domain, phase, and status filters, plus aggregate project metrics. |
| `/api/admin/projects` | `POST` | `Admin` | Registers a new capstone project linked to an existing group, validating uniqueness and title rules. |
| `/api/admin/projects/[id]` | `GET` | `Admin` | Retrieves project specifications, student team roster, and full mentor allocation history. |
| `/api/admin/projects/[id]` | `PATCH` | `Admin` | Updates project attributes (status, phase, problem statement, technology stack, repository URL). |
| `/api/admin/projects/available-groups` | `GET` | `Admin` | Lists active groups that do not yet have an assigned project. |
| `/api/admin/mentors` | `GET` | `Admin` | Lists faculty mentors with active workload count, max project capacity, availability, and assigned projects. |
| `/api/admin/mentors/[id]` | `GET` | `Admin` | Retrieves complete mentor profile with past and active project allocation records. |
| `/api/admin/mentors/[id]` | `PATCH` | `Admin` | Updates mentor guidance capacity (`max_projects`), availability status, specialization, or office. |
| `/api/admin/mentors/allocations` | `POST` | `Admin` | Assigns a Primary or Co-Mentor to a project with capacity checks and atomic Primary transition. |
| `/api/admin/mentors/allocations` | `DELETE` | `Admin` | Ends an active mentor allocation, setting `end_date = CURDATE()` and archiving allocation remarks. |

### Running Phase 3 Automated Tests
```bash
npm run test:phase3
```
This automated suite validates:
- Unauthenticated (401) and Non-Admin (403) RBAC enforcement across project and mentor endpoints.
- Project directory queries and aggregate project statistics.
- Full project details, team roster, mentor allocation history, and credential confidentiality.
- 1-to-1 group-to-project unique constraint enforcement (HTTP 409 Conflict).
- Mentor directory workload calculation and department statistics.
- Mentor capacity limits (`max_projects`) and `Unavailable` status blocking.
- Duplicate active assignment rejection and atomic Primary mentor transitions.
- Ending mentor allocations via `DELETE /api/admin/mentors/allocations` and database state verification.


