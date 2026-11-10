/**
 * CPMS Phase 2 Verification Test Suite
 *
 * Validates:
 * 1. Role-Based Access Control (RBAC): Unauthenticated (401) and Non-Admin (403) blocking.
 * 2. Searchable student directory and filtering.
 * 3. Student details retrieval and verification that password_hash is never exposed.
 * 4. Maximum group size limit enforcement (max 4 members).
 * 5. Team leader selection enforcement (must be one of the members).
 * 6. Duplicate active group membership prevention.
 * 7. Multi-table group creation within a transaction and linking to Capstone_Projects.
 * 8. Automatic cleanup of test artifacts.
 *
 * Usage:
 *   node scripts/verify-phase2.mjs
 */

import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const loadEnv = nextEnv.loadEnvConfig || nextEnv.default?.loadEnvConfig;
if (loadEnv) {
  loadEnv(process.cwd());
}

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SESSION_COOKIE_NAME = "cpms_session";

async function signTestToken(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET in environment.");
  }
  const key = new TextEncoder().encode(secret.trim());
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`CPMS Phase 2: Student & Group Management Verification`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  // Dynamically import database module
  const { query, pool } = await import("../src/lib/mysql.ts");

  let passed = 0;
  let total = 8;

  // Generate test session tokens
  const adminToken = await signTestToken({
    userId: 1,
    email: "admin@cpms.demo",
    role: "Admin",
  });

  const studentToken = await signTestToken({
    userId: 11,
    email: "aarav@student.cpms.demo",
    role: "Student",
  });

  const adminHeaders = {
    "Content-Type": "application/json",
    Cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
  };

  const studentHeaders = {
    "Content-Type": "application/json",
    Cookie: `${SESSION_COOKIE_NAME}=${studentToken}`,
  };

  // TEST 1: Unauthenticated and Student role rejection
  console.log("[Test 1/8] Verifying Security & Role-Based Access Control...");
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/admin/students`);
    const studentRes = await fetch(`${BASE_URL}/api/admin/students`, {
      headers: studentHeaders,
    });

    if (unauthRes.status === 401 && studentRes.status === 403) {
      console.log("  ✓ Unauthenticated requests blocked with HTTP 401.");
      console.log("  ✓ Student role blocked from Admin API with HTTP 403.");
      passed++;
    } else {
      console.error(`  ✗ RBAC check failed. Unauth=${unauthRes.status}, Student=${studentRes.status}`);
    }
  } catch (err) {
    console.error("  ✗ Test 1 failed with error:", err.message);
  }

  // TEST 2: Student Directory Listing & Search Filter
  console.log("\n[Test 2/8] Testing Student Directory and Search Filters...");
  try {
    const listRes = await fetch(`${BASE_URL}/api/admin/students?search=Aarav`, {
      headers: adminHeaders,
    });
    const listJson = await listRes.json();

    if (
      listRes.status === 200 &&
      listJson.success === true &&
      Array.isArray(listJson.students) &&
      listJson.students.some((s) => s.usn === "DEMO001" && s.full_name === "Aarav Sharma")
    ) {
      console.log("  ✓ Directory listing succeeded with HTTP 200.");
      console.log(`  ✓ Search matched: ${listJson.students[0].full_name} (${listJson.students[0].usn})`);
      passed++;
    } else {
      console.error("  ✗ Directory listing failed:", listJson);
    }
  } catch (err) {
    console.error("  ✗ Test 2 failed with error:", err.message);
  }

  // TEST 3: Student Details & Credential Protection
  console.log("\n[Test 3/8] Testing Student Details page & Credential Privacy...");
  try {
    const detailRes = await fetch(`${BASE_URL}/api/admin/students/1`, {
      headers: adminHeaders,
    });
    const detailJson = await detailRes.json();

    if (
      detailRes.status === 200 &&
      detailJson.success === true &&
      detailJson.student?.usn === "DEMO001" &&
      detailJson.student?.password_hash === undefined &&
      detailJson.student?.active_group?.group_name === "Team Alpha"
    ) {
      console.log("  ✓ Student details retrieved successfully.");
      console.log(`  ✓ Verified active group affiliation: "${detailJson.student.active_group.group_name}"`);
      console.log("  ✓ Verified: password_hash is never exposed in API responses.");
      passed++;
    } else {
      console.error("  ✗ Student details check failed:", detailJson);
    }
  } catch (err) {
    console.error("  ✗ Test 3 failed with error:", err.message);
  }

  // TEST 4: Group Size Limit Enforcement (Max 4 Members)
  console.log("\n[Test 4/8] Testing Maximum Group Size Limit Enforcement (Max 4)...");
  try {
    const oversizeRes = await fetch(`${BASE_URL}/api/admin/groups`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        group_name: "Oversized Group",
        department: "CSE",
        batch: "2024-2028",
        academic_year: "2026-2027",
        team_leader_id: 1,
        member_ids: [1, 2, 3, 4, 5], // 5 members exceeds limit of 4
      }),
    });
    const oversizeJson = await oversizeRes.json();

    if (oversizeRes.status === 400 && oversizeJson.success === false) {
      console.log("  ✓ Oversized group (> 4 members) rejected with HTTP 400.");
      console.log(`  ✓ Validation message: "${oversizeJson.message}"`);
      passed++;
    } else {
      console.error("  ✗ Oversized group validation failed:", oversizeJson);
    }
  } catch (err) {
    console.error("  ✗ Test 4 failed with error:", err.message);
  }

  // TEST 5: Team Leader Selection Validation
  console.log("\n[Test 5/8] Testing Team Leader Selection Enforcement...");
  try {
    const leaderRes = await fetch(`${BASE_URL}/api/admin/groups`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        group_name: "Invalid Leader Group",
        department: "CSE",
        batch: "2024-2028",
        academic_year: "2026-2027",
        team_leader_id: 9999, // Leader not in member list
        member_ids: [1, 2],
      }),
    });
    const leaderJson = await leaderRes.json();

    if (leaderRes.status === 400 && leaderJson.success === false) {
      console.log("  ✓ Unlisted team leader rejected with HTTP 400.");
      console.log(`  ✓ Validation message: "${leaderJson.message}"`);
      passed++;
    } else {
      console.error("  ✗ Leader validation failed:", leaderJson);
    }
  } catch (err) {
    console.error("  ✗ Test 5 failed with error:", err.message);
  }

  // TEST 6: Duplicate Active Group Membership Prevention
  console.log("\n[Test 6/8] Testing Duplicate Active Group Membership Prevention...");
  try {
    // Student 1 (Aarav) is already an active member of Team Alpha
    const dupRes = await fetch(`${BASE_URL}/api/admin/groups`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        group_name: "Double Booked Group",
        department: "CSE",
        batch: "2024-2028",
        academic_year: "2026-2027",
        team_leader_id: 1,
        member_ids: [1],
      }),
    });
    const dupJson = await dupRes.json();

    if (
      dupRes.status === 400 &&
      dupJson.success === false &&
      dupJson.message.includes("already an active member")
    ) {
      console.log("  ✓ Duplicate active membership correctly rejected with HTTP 400.");
      console.log(`  ✓ Message: "${dupJson.message}"`);
      passed++;
    } else {
      console.error("  ✗ Duplicate membership check failed:", dupJson);
    }
  } catch (err) {
    console.error("  ✗ Test 6 failed with error:", err.message);
  }

  // TEST 7: Multi-Table Group Creation with Transaction & Capstone Project Link
  console.log("\n[Test 7/8] Testing Transactional Group Creation and Project Linking...");
  let createdGroupId = null;
  let testUserIds = [];
  let testStudentIds = [];

  try {
    // 1. Provision 2 fresh test students with timestamped emails/USNs
    const dummyHash = await bcrypt.hash("TestPass123!", 10);
    const ts = Date.now().toString().slice(-5);
    const email1 = `test.stu1.${ts}@cpms.demo`;
    const email2 = `test.stu2.${ts}@cpms.demo`;
    const usn1 = `T${ts}A`;
    const usn2 = `T${ts}B`;
    const groupName = `Team Beta ${ts}`;

    const u1 = await query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Test Student One', ?, ?, 'Student')",
      [email1, dummyHash]
    );
    testUserIds.push(u1.insertId);

    const u2 = await query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Test Student Two', ?, ?, 'Student')",
      [email2, dummyHash]
    );
    testUserIds.push(u2.insertId);

    const s1 = await query(
      "INSERT INTO students (user_id, usn, department, batch, current_semester, section, academic_status) VALUES (?, ?, 'CSE', '2024-2028', 5, 'B', 'Active')",
      [u1.insertId, usn1]
    );
    testStudentIds.push(s1.insertId);

    const s2 = await query(
      "INSERT INTO students (user_id, usn, department, batch, current_semester, section, academic_status) VALUES (?, ?, 'CSE', '2024-2028', 5, 'B', 'Active')",
      [u2.insertId, usn2]
    );
    testStudentIds.push(s2.insertId);

    // 2. Create Group via API
    const createRes = await fetch(`${BASE_URL}/api/admin/groups`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        group_name: groupName,
        department: "CSE",
        batch: "2024-2028",
        academic_year: "2026-2027",
        team_leader_id: s1.insertId,
        member_ids: [s1.insertId, s2.insertId],
        project_title: "Automated Traffic Surveillance System",
        project_domain: "Computer Vision & Edge Computing",
      }),
    });
    const createJson = await createRes.json();

    if (createRes.status === 201 && createJson.success === true && createJson.group?.group_id) {
      createdGroupId = createJson.group.group_id;
      console.log(`  ✓ Group created atomically. Group ID: #${createdGroupId}`);
      console.log(`  ✓ Linked project created with Project ID: #${createJson.group.project_id}`);

      // Verify in database: group_members should have 2 records
      const members = await query(
        "SELECT student_id, member_role FROM group_members WHERE group_id = ?",
        [createdGroupId]
      );

      const hasLeader = members.some((m) => m.student_id === s1.insertId && m.member_role === "Leader");
      const hasMember = members.some((m) => m.student_id === s2.insertId && m.member_role === "Member");

      if (members.length === 2 && hasLeader && hasMember) {
        console.log("  ✓ Verified member roles in MySQL: Leader and Member assigned correctly.");
        passed++;
      } else {
        console.error("  ✗ Member roles mismatch in DB:", members);
      }
    } else {
      console.error("  ✗ Group creation API failed:", createJson);
    }
  } catch (err) {
    console.error("  ✗ Test 7 failed with error:", err.message);
  }

  // TEST 8: Group Details API & Verification
  console.log("\n[Test 8/8] Testing Group Details API (/api/admin/groups/[id])...");
  try {
    if (createdGroupId) {
      const gRes = await fetch(`${BASE_URL}/api/admin/groups/${createdGroupId}`, {
        headers: adminHeaders,
      });
      const gJson = await gRes.json();

      if (
        gRes.status === 200 &&
        gJson.success === true &&
        gJson.group?.group_name?.startsWith("Team Beta") &&
        gJson.group?.members.length === 2 &&
        gJson.group?.capstone_project?.project_title === "Automated Traffic Surveillance System"
      ) {
        console.log("  ✓ Group details and linked project verified via API.");
        passed++;
      } else {
        console.error("  ✗ Group details retrieval failed:", gJson);
      }
    } else {
      console.error("  ✗ Skipped: Group was not created in Test 7.");
    }
  } catch (err) {
    console.error("  ✗ Test 8 failed with error:", err.message);
  }

  // CLEANUP: Clean up test artifacts cleanly
  console.log("\n[Cleanup] Cleaning up test records from MySQL...");
  try {
    if (createdGroupId) {
      await query("DELETE FROM capstone_projects WHERE group_id = ?", [createdGroupId]);
      await query("DELETE FROM group_members WHERE group_id = ?", [createdGroupId]);
      await query("DELETE FROM project_groups WHERE group_id = ?", [createdGroupId]);
    }
    for (const sid of testStudentIds) {
      await query("DELETE FROM students WHERE student_id = ?", [sid]);
    }
    for (const uid of testUserIds) {
      await query("DELETE FROM users WHERE user_id = ?", [uid]);
    }
    console.log("  ✓ Database cleaned up cleanly to original state.");
  } catch (err) {
    console.error("  ✗ Cleanup warning:", err.message);
  }

  console.log(`\n======================================================`);
  console.log(`Phase 2 Verification Summary: ${passed}/${total} tests passed.`);
  console.log(`======================================================\n`);

  if (pool && typeof pool.end === "function") {
    await pool.end();
  }

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();
