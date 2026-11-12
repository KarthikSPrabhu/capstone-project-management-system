# CPMS Presentation Guide

Everything needed to set up, demo and defend CPMS in a viva:

1. [Setup checklist](#1-setup-checklist) (the day before, and 30 minutes before)
2. [Demo script](#2-demo-script-about-7-minutes) (about 7 minutes, every step tested on fresh seed data)
3. [Live database demo in MySQL](#3-live-database-demo-in-mysql-optional-2-minutes) (optional, 2 minutes)
4. [Walkthrough: the late-submission trigger](#4-walkthrough-trg_submissions_before_insert-the-late-submission-trigger)
5. [Walkthrough: `sp_calculate_final_marks`](#5-walkthrough-sp_calculate_final_marks)
6. [Likely viva questions](#6-likely-viva-questions)

The ER diagram and normalization notes are in [DATABASE.md](DATABASE.md).

---

## 1. Setup checklist

### The day before, on the presentation laptop

- [ ] Node.js 20+ and MySQL Server 8.0.16+ are installed, and the MySQL service starts.
- [ ] `git pull`, then `npm install`.
- [ ] `.env.local` exists in the project root with the MySQL user and password and a `SESSION_SECRET` of at least 32 characters (README section 3). Generate one with `openssl rand -base64 32`.
- [ ] Optional: `MONGODB_URI` is set if you want the **Activity** panel on project pages to show entries. Without it the panel says "No activity log available". College Wi-Fi often blocks MongoDB Atlas, so test it on the network you will present on, or leave Mongo out and skip that panel.
- [ ] `npm run db:reset` and type `yes` when asked. This drops and rebuilds the database with the demo data.
- [ ] `DEMO_ADMIN_PASSWORD="Cpms@2026" npm run test:all` with `npm run dev` running in another terminal. Every suite should pass. (PowerShell: `$env:DEMO_ADMIN_PASSWORD="Cpms@2026"; npm run test:all`.)
- [ ] Do one full run of the demo script below.
- [ ] Run `npm run db:reset` again. **The demo changes the data, so always reset after a rehearsal.**
- [ ] Record a screen video of one clean demo run as a backup in case the laptop or projector fails.

### 30 minutes before

- [ ] Start MySQL, then `npm run dev`. Use the dev server, not `npm run build`: the production build has to download the Geist font from Google and fails without internet, while the dev server just falls back to a system font.
- [ ] Open http://localhost:3000/login once, so the first page compiles before the audience is watching.
- [ ] Open **three separate browser sessions**, one per role. Each browser keeps one login cookie, so use for example:
  - Chrome normal window: **coordinator@cpms.demo**
  - Chrome incognito window: **priya@student.cpms.demo**
  - Edge or Firefox: **vikram.shetty@cpms.demo**

  All demo accounts use the password `Cpms@2026`.
- [ ] Zoom each browser to 125% so the projector is readable.
- [ ] Open MySQL Workbench (or the `mysql` CLI) with the snippets from section 3 ready, and run `SET time_zone = '+05:30';` first. Otherwise Workbench shows submission times in UTC, 5½ hours off from what the app shows.

---

## 2. Demo script (about 7 minutes)

The story: **Team Orion's proposal goes from "Submitted" to a graded milestone**, touching every main database object along the way. The **DB object** lines are what you say out loud; they are what the examiner is listening for.

### Step 1: Coordinator reviews the proposal (1½ min)

Window: **Coordinator**.

1. Show **Dashboard Overview**. Say: the summary numbers come from the view `v_dashboard_summary`, which is built on `v_project_progress`.
2. Click **Proposals**. Two proposals are awaiting a decision. On **Serverless Log Analytics Pipeline** (Team Orion), leave the comment box empty and click **Reject**.
   - The red message "Review comments are required when rejecting a proposal." appears.
   - **DB object:** that message is raised by `SIGNAL` inside the stored procedure `sp_review_proposal`, not by the web page. The database refuses the rejection.
3. Click **Approve** on the same proposal.
   - **DB object:** `sp_review_proposal` runs in one transaction. It marks the proposal Approved and **inserts the group's row into `capstone_projects`**. The trigger `trg_proposals_after_update` writes a notification for every member of Team Orion.
4. Click **Capstone Projects**. Team Orion's project is now listed as **Approved** with **Needs Mentor**.

### Step 2: Coordinator allocates a guide (1 min)

1. Click **View Project →** on Serverless Log Analytics Pipeline, then **+ Assign Faculty Mentor**.
2. Choose **Prof. Vikram Shetty** (Distributed Systems, Cloud, currently 1/3 active). Leave the role as Primary, type a remark such as "Cloud and distributed systems expertise", and click **Confirm Allocation**.
   - **DB object:** `sp_allocate_guide` locks the mentor row (`SELECT ... FOR UPDATE`), checks availability and capacity (`max_projects`), ends any previous Primary guide, and inserts the allocation, all in one transaction. The trigger `trg_allocations_before_insert` re-checks capacity as a second line of defence.
3. Optional: click **Faculty Mentors** to show Vikram now at 2 of 3 (view `v_mentor_workload`).

### Step 3: Student submits after the deadline (1½ min)

Window: **Student (Priya)**.

1. Refresh the dashboard. Point at the **Notifications** panel: "Proposal approved". Say: a trigger wrote that row; no application code sent it.
2. Point at the milestones: **1. Synopsis & Literature Review** was due 15 Sept 2026 and shows **Overdue**.
3. Click **Submit** on milestone 1. Enter a title such as "Synopsis and literature survey" and a link such as `https://drive.google.com/file/d/orion-synopsis`, then click **Submit document**.
   - The page says "Submitted as version 1. Note: this is after the due date and is marked late." and the milestone shows **Late**.
   - Project status changes from **Approved** to **In Progress**, and completion goes to 25%.
   - **DB object:** `trg_submissions_before_insert` set `version_no = 1` and `is_late = 1`. `trg_submissions_after_insert` moved the project to In Progress and notified the guide. (Section 4 walks through this trigger line by line.)

### Step 4: Mentor reviews and enters marks (2 min)

Window: **Mentor (Vikram)**.

1. Refresh the dashboard. Notification: **Late submission received**. Under **My projects**, Team Orion shows **1** to review.
2. Click **Open** on Serverless Log Analytics Pipeline. The submission shows **Submitted** and **Late**.
3. Type feedback such as "Good survey. Submit on time next milestone." and click **Accept**.
   - **DB object:** `trg_submissions_after_update` notifies the students that the submission was accepted.
4. In **Evaluation**, keep milestone **1. Synopsis & Literature Review (/25)**. Enter marks **22** (Priya), **20** (Nikhil), **18** (Ananya), then click **Save marks**.
5. **Marks so far** now shows:

   | Student | Avg | Weighted | Total /100 | Grade |
   | :--- | :--- | :--- | :--- | :--- |
   | Priya Hegde | 22/25 | 13.20 | 13.20 | In progress |
   | Nikhil Bhat | 20/25 | 12 | 12 | In progress |
   | Ananya Gowda | 18/25 | 10.80 | 10.80 | In progress |

   - **DB object:** saving marks runs `sp_calculate_final_marks`. 22 out of 25, weighted at 15%, is 22 / 25 × 15 = 13.20. The grade is "In progress" (stored as `IP`) because only 1 of the year's 4 milestones has been evaluated. (Section 5 walks through this procedure.)

> **Note:** if you try to type 30 marks, the browser itself blocks it, because the input has `max="25"`. The database trigger that also blocks it never gets a chance to fire from the UI. To show that the database enforces the limit too, use section 3.

### Step 5: Coordinator rules and reports (1 min)

Window: **Coordinator**.

1. Click **Milestones**. Add a milestone with order **5**, title **Bonus Viva**, any due date, max marks **20**, weight **10**, and click **Add milestone**.
   - Message: "Total milestone weightage for 2026-2027 would exceed 100% (currently 100.00%)."
   - **DB object:** `trg_milestones_before_insert` sums the year's weightage and refuses anything over 100%.
2. Click **Reports**, then **Project status & progress**. Team Orion shows 1 of 4 submitted, 1 late, state **Delayed** (milestone 2 is overdue). **DB object:** view `v_project_progress`.
3. Click **Download CSV** to show the export.

**Close with one sentence:** "All of these rules are enforced inside MySQL with triggers, procedures, constraints and views, so they hold no matter which program writes to the database."

---

## 3. Live database demo in MySQL (optional, 2 minutes)

Run these after the demo above (they use Team Orion's project, `project_id = 3`). Statements 1 and 2 are expected to **fail**, and the error message is the point. The SELECT and the CALL succeed.

```sql
USE cpms_db;
SET time_zone = '+05:30';

-- The late flag the trigger stored, next to the due date it compared against
SELECT s.version_no, s.document_title, s.submitted_at, m.due_date, s.is_late
FROM submissions s JOIN milestones m ON m.milestone_id = s.milestone_id
WHERE s.project_id = 3;

-- 1. Marks above the maximum: blocked by trg_student_evaluations_before_update
UPDATE student_evaluations SET marks_awarded = 30
WHERE student_id = 8
  AND evaluation_id = (SELECT evaluation_id FROM evaluations WHERE project_id = 3 AND milestone_id = 1);
-- ERROR 1644 (45000): Marks must be between 0 and 25.00 for this milestone.

-- 2. A mentor who is not allocated to the project tries to evaluate it:
--    blocked by trg_evaluations_before_insert (mentor 1 = Dr. Anita Rao)
INSERT INTO evaluations (project_id, milestone_id, evaluator_id) VALUES (3, 2, 1);
-- ERROR 1644 (45000): Only a mentor allocated to this project can evaluate it.

-- 3. Run the final-marks procedure directly
CALL sp_calculate_final_marks(1);   -- Team Alpha: 2 of 4 milestones evaluated
```

All three were tested on fresh seed data plus the demo steps above.

---

## 4. Walkthrough: `trg_submissions_before_insert` (the late-submission trigger)

Source: `db/004_triggers_procedures.sql`. It runs once for every row inserted into `submissions`, **before** the row is written, which is what allows it to change the row's values.

```sql
CREATE TRIGGER trg_submissions_before_insert
BEFORE INSERT ON submissions
FOR EACH ROW
```
- `BEFORE INSERT`: fires before the row is stored. Only a BEFORE trigger can modify `NEW.*` (the row about to be inserted). An AFTER trigger can only read it.
- `FOR EACH ROW`: a row-level trigger (MySQL has no statement-level triggers).

```sql
BEGIN
  DECLARE v_due        DATETIME;
  DECLARE v_status     VARCHAR(20);
  DECLARE v_group_id   INT;
  DECLARE v_group_year VARCHAR(9);
  DECLARE v_ms_year    VARCHAR(9);
```
- Local variables to hold the values looked up below.

```sql
  SELECT cp.project_status, cp.group_id, pg.academic_year
    INTO v_status, v_group_id, v_group_year
  FROM capstone_projects cp JOIN project_groups pg ON pg.group_id = cp.group_id
  WHERE cp.project_id = NEW.project_id;
```
- Looks up the project being submitted for: its status, its group, and that group's academic year. `NEW.project_id` is the value from the row being inserted.

```sql
  SELECT due_date, academic_year INTO v_due, v_ms_year
  FROM milestones WHERE milestone_id = NEW.milestone_id;
```
- Looks up the milestone's due date and academic year.

```sql
  IF v_status NOT IN ('Approved', 'In Progress') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Submissions are only accepted for Approved or In Progress projects.';
  END IF;
```
- Rule 1: you cannot submit documents for a project that is not approved yet (or is rejected, completed, and so on).
- `SIGNAL SQLSTATE '45000'` raises a user-defined error. The INSERT is cancelled and the message is sent back to the application, which shows it to the user.

```sql
  IF v_ms_year <> v_group_year THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This milestone does not belong to the group''s academic year.';
  END IF;
```
- Rule 2: the milestone must belong to the same academic year as the group. (`''` is an escaped single quote inside the string.)

```sql
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_group_id AND student_id = NEW.submitted_by AND membership_status = 'Active'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an active member of the project group can submit.';
  END IF;
```
- Rule 3: the submitting student must be an **active** member of the project's group. A foreign key can only check that the student exists; this trigger checks that they belong to *this* group. That is something a constraint cannot express.

```sql
  IF NEW.submitted_at IS NULL THEN
    SET NEW.submitted_at = CURRENT_TIMESTAMP;
  END IF;
```
- Makes sure there is a submission time to compare with. The application never sends one, so the database clock decides; the student cannot fake it.

```sql
  SET NEW.version_no = (
    SELECT COALESCE(MAX(version_no), 0) + 1 FROM submissions
    WHERE project_id = NEW.project_id AND milestone_id = NEW.milestone_id
  );
```
- Automatic versioning: the highest existing version for this project and milestone, plus 1. `COALESCE(..., 0)` handles the first submission, where `MAX` returns NULL, giving version 1.

```sql
  SET NEW.is_late = (NEW.submitted_at > v_due);
```
- **The late check.** The comparison evaluates to 1 (true) or 0 (false) and is stored in the BOOLEAN column `is_late`.
- It is stored, not calculated in a view, so that lateness is fixed at the moment of submission. If the coordinator later extends the due date, past submissions keep their original late or on-time status.
- Time zones: `due_date` is a DATETIME entered in Indian time, and the app sets every MySQL connection to `+05:30` (`DB_TIMEZONE` in `src/lib/mysql.ts`), so `CURRENT_TIMESTAMP` is compared in the same zone.

```sql
  SET NEW.submission_status = 'Submitted';
END
```
- Forces the starting status. Even if a request tried to insert a submission as "Accepted", it starts as "Submitted"; only a mentor's review can change it.

**Its partner, `trg_submissions_after_insert`**, runs after the row is stored. It moves an Approved project to **In Progress** (and to at least phase 2), and inserts a notification for every active guide, titled "Late submission received" when `NEW.is_late` is true. It is an AFTER trigger because it changes *other* tables and needs the final values the BEFORE trigger set.

**If asked "what if two students submit at the same moment?"** Both triggers could read the same `MAX(version_no)`. The UNIQUE constraint `uq_submission_version (project_id, milestone_id, version_no)` then rejects the second insert, so duplicate versions can never be stored. The second student gets an error and can simply resubmit.

---

## 5. Walkthrough: `sp_calculate_final_marks`

Source: `db/004_triggers_procedures.sql`. Called by the app every time a mentor saves marks (`recalculateFinalMarks` in `src/lib/workflow/evaluations.ts`), and by the coordinator's recalculate endpoint (`POST /api/admin/projects/[id]/final-marks`).

**The formula:** for each student and each milestone,
> milestone score = average of that student's marks across all evaluators ÷ milestone max marks × milestone weightage

and the final total is the sum of the milestone scores, out of 100.

```sql
CREATE PROCEDURE sp_calculate_final_marks(IN p_project_id INT)
BEGIN
  DECLARE v_group_id INT;
  DECLARE v_total_ms INT;
```
- One input parameter: the project. Two local variables.

```sql
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
```
- Error handling. If any SQL error happens anywhere in the procedure, this handler runs: `ROLLBACK` undoes any partial writes, and `RESIGNAL` re-raises the same error so the application still sees it. `EXIT` means the procedure stops after the handler.

```sql
  SELECT group_id INTO v_group_id FROM capstone_projects WHERE project_id = p_project_id;
  IF v_group_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Project not found.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM evaluations WHERE project_id = p_project_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No evaluations recorded for this project yet.';
  END IF;
```
- Validation: the project must exist and must have at least one evaluation.

```sql
  SELECT COUNT(*) INTO v_total_ms
  FROM milestones m JOIN project_groups pg ON pg.academic_year = m.academic_year
  WHERE pg.group_id = v_group_id;
```
- Counts how many milestones exist for the group's academic year (4 in the demo data). Used below to decide whether the grade is final.

```sql
  START TRANSACTION;

  INSERT INTO final_results (project_id, student_id, weighted_total, grade, milestones_evaluated)
  SELECT
      p_project_id,
      gm.student_id,
```
- `INSERT ... SELECT`: one row per student is computed and inserted in a single statement.

```sql
      LEAST(ROUND(COALESCE(SUM(sm.weighted_marks), 0), 2), 100),
```
- `weighted_total`: the sum of the student's milestone scores. Read from the inside out:
  - `SUM(sm.weighted_marks)`: adds the per-milestone scores. They come from the view `v_student_milestone_marks`, which computes `ROUND(AVG(marks_awarded) / max_marks * weightage, 2)` per student per milestone.
  - `COALESCE(..., 0)`: a student with no marks yet gets 0 instead of NULL.
  - `ROUND(..., 2)`: two decimal places.
  - `LEAST(..., 100)`: caps the total at 100 as a safety net (the milestone weightage trigger already keeps the year's total at 100% or less).

```sql
      CASE WHEN COUNT(sm.milestone_id) < v_total_ms THEN 'IP'
           ELSE fn_grade(LEAST(ROUND(COALESCE(SUM(sm.weighted_marks), 0), 2), 100)) END,
```
- `grade`: if fewer milestones have been evaluated than exist this year, the grade is `IP` (in progress). Otherwise the function `fn_grade` converts the total to a letter: O ≥ 90, A+ ≥ 80, A ≥ 70, B+ ≥ 60, B ≥ 50, C ≥ 40, else F.
- `COUNT(sm.milestone_id)` counts only non-NULL values, so the NULL rows produced by the LEFT JOIN (a student with no marks) count as 0 milestones.

```sql
      COUNT(sm.milestone_id)
  FROM group_members gm
  LEFT JOIN v_student_milestone_marks sm
         ON sm.student_id = gm.student_id AND sm.project_id = p_project_id
  WHERE gm.group_id = v_group_id AND gm.membership_status = 'Active'
  GROUP BY gm.student_id
```
- `milestones_evaluated`: how many milestones this student has marks for.
- Starting `FROM group_members` with a **LEFT JOIN** means every active member gets a row, even one who has not been marked yet. An INNER JOIN would silently drop that student.
- `GROUP BY gm.student_id`: one result row per student.

```sql
  ON DUPLICATE KEY UPDATE
      weighted_total       = VALUES(weighted_total),
      grade                = VALUES(grade),
      milestones_evaluated = VALUES(milestones_evaluated),
      calculated_at        = CURRENT_TIMESTAMP;
```
- An **upsert**. `final_results` has the primary key (`project_id`, `student_id`). The first calculation inserts the row; every later one finds the duplicate key and updates it instead. This is why the procedure can safely be re-run every time marks change.
- `VALUES(col)` means "the value this INSERT tried to put in `col`". (MySQL 8.0.20+ marks this syntax as deprecated in favour of a row alias, but it still works.)

```sql
  COMMIT;

  SELECT * FROM v_final_results WHERE project_id = p_project_id ORDER BY usn;
END
```
- `COMMIT` makes the results permanent.
- The final `SELECT` returns the fresh results, with names from the view `v_final_results`, to whoever called the procedure. The app uses this result set directly.

### Worked example (seed data, Team Alpha, student Aarav Sharma)

| Milestone | Max | Weight | Marks | Average | Score |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1. Synopsis | 25 | 15% | Dr. Anita Rao 22, Dr. Meera Iyer 21 | 21.5 | 21.5 / 25 × 15 = **12.90** |
| 2. Design Review | 50 | 25% | Dr. Anita Rao 44 | 44 | 44 / 50 × 25 = **22.00** |
| 3 and 4 | | | not evaluated yet | | |

Total = 12.90 + 22.00 = **34.90**. Two of the year's 4 milestones are evaluated, so the grade is **IP**. This matches `CALL sp_calculate_final_marks(1);`.

---

## 6. Likely viva questions

**Why use a trigger instead of checking in the application?**
The rule then holds for every program that writes to the database (the web app, MySQL Workbench, an import script), and it cannot be skipped by a bug in one code path. The application still validates input for friendly error messages, but the database is the final authority.

**What is the difference between a trigger and a stored procedure?**
A trigger runs automatically when a row is inserted, updated or deleted on its table; you never call it. A procedure runs only when called (`CALL ...`), can take parameters, and can manage its own transaction. Triggers cannot use `START TRANSACTION`/`COMMIT`; they run inside the transaction of the statement that fired them.

**Why BEFORE vs AFTER triggers?**
BEFORE triggers can validate and change the incoming row (`SET NEW.col = ...`), so they are used for versioning, the late flag and rule checks. AFTER triggers see the final stored row and are used for side effects on other tables, such as notifications and project status changes.

**What does `SIGNAL SQLSTATE '45000'` do?**
It raises a user-defined error. The statement that fired the trigger, or the procedure, is aborted, and the message text is sent to the client. `45000` is the standard SQLSTATE for "unhandled user-defined exception".

**Why are the procedures transactional, and why `FOR UPDATE` in `sp_allocate_guide`?**
Allocation reads a mentor's current workload and then inserts a new allocation. Without locking, two coordinators could both see "2 of 3" at the same time and both allocate, ending at 4 of 3. `SELECT ... FOR UPDATE` locks the mentor row until `COMMIT`, so the second allocation waits and then sees the updated count.

**What is a view, and why use them for reports?**
A view is a stored, named query. The reports page reads views such as `v_project_progress` and `v_mentor_workload`, so the report logic lives in one place in the database, always reflects current data, and nothing derived needs to be stored.

**Why both MySQL and MongoDB?**
MySQL holds the official records (users, projects, submissions, marks) where foreign keys, constraints and transactions matter. MongoDB stores the append-only activity and history logs, where each event can have a different shape. MongoDB is optional: the app works fully without it.

**Which normal form is the schema in?** See [DATABASE.md, section 2](DATABASE.md#2-normalization). In short: the tables holding entered data are in 3NF and BCNF. `final_results` is a computed result table, and the few derived values that are stored on purpose are listed with the reason for each.

**How are passwords stored?**
As bcrypt hashes (cost factor 12) in `users.password_hash`, never as plain text. Login compares the typed password against the hash.

### Small things worth knowing

- Student 1 (Aarav Sharma) has the USN `DEMO001`, unlike the others (`PES1UG23CS0xx`). The automated test `verify-phase2.mjs` checks for that exact value, so leave it, or change both together.
- Seed notifications get the time you ran `db:reset`, not the historical dates of the seed events. That is expected.
- Dates in the demo data assume the presentation is after 20 Oct 2026, so milestones 1 and 2 show as overdue. Milestone 3 becomes overdue after 1 Dec 2026, which only adds more "Delayed" labels; the demo steps still work.
