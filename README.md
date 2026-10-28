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
