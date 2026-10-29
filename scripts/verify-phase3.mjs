/**
 * CPMS Phase 3 Verification Test Suite
 *
 * Validates:
 * 1. Role-Based Access Control (RBAC): Unauthenticated (401) and Non-Admin (403) blocking
 *    for both Project and Mentor administration APIs.
 * 2. Capstone Project Directory and filtering (status, search, domains).
 * 3. Project details retrieval, team roster, mentor allocations, and password hash security.
 * 4. Unique group constraint enforcement (1-to-1 group-to-project integrity).
 * 5. Mentor directory, workload calculation (active allocations vs max_projects), and availability.
 * 6. Mentor capacity enforcement (prevent allocations beyond max_projects or when Unavailable).
 * 7. Duplicate active assignment prevention and atomic Primary mentor transition.
 * 8. Ending mentor allocations and transaction rollback/cleanup.
 *
 * Usage:
 *   node scripts/verify-phase3.mjs
 */

import nextEnv from "@next/env";
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
  console.log(`\n================================================================`);
  console.log(`CPMS Phase 3: Capstone Project & Mentor Management Verification`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`================================================================\n`);

  // Dynamically import database module
  const { query } = await import("../src/lib/mysql.ts");

  let passed = 0;
  let total = 8;

  // Generate test session tokens
  const adminToken = await signTestToken({
    userId: 1,
    email: "admin@cpms.demo",
    role: "Admin",
  });

  const studentToken = await signTestToken({
    userId: 2,
    email: "aarav@cpms.demo",
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

  // TEST 1: RBAC verification on Projects and Mentors APIs
  console.log("[Test 1/8] Verifying Security & Role-Based Access Control...");
  try {
    const unauthProjects = await fetch(`${BASE_URL}/api/admin/projects`);
    const studentProjects = await fetch(`${BASE_URL}/api/admin/projects`, {
      headers: studentHeaders,
    });
    const unauthMentors = await fetch(`${BASE_URL}/api/admin/mentors`);
    const studentMentors = await fetch(`${BASE_URL}/api/admin/mentors`, {
      headers: studentHeaders,
    });

    if (
      unauthProjects.status === 401 &&
      studentProjects.status === 403 &&
      unauthMentors.status === 401 &&
      studentMentors.status === 403
    ) {
      console.log("  ✓ Unauthenticated requests rejected with HTTP 401.");
      console.log("  ✓ Non-Admin (Student) role rejected with HTTP 403.");
      passed++;
    } else {
      console.error(
        `  ✗ RBAC failure. unauthProjects=${unauthProjects.status}, studentProjects=${studentProjects.status}, unauthMentors=${unauthMentors.status}, studentMentors=${studentMentors.status}`
      );
    }
  } catch (err) {
    console.error("  ✗ Test 1 failed with error:", err.message);
  }

  // TEST 2: Project directory listing and stats
  console.log("\n[Test 2/8] Testing Project Directory and Statistics...");
  try {
    const res = await fetch(`${BASE_URL}/api/admin/projects`, { headers: adminHeaders });
    const json = await res.json();

    if (
      res.ok &&
      json.success &&
      Array.isArray(json.projects) &&
      json.stats &&
      typeof json.stats.totalProjects === "number"
    ) {
      console.log(`  ✓ Successfully fetched ${json.projects.length} project(s).`);
      console.log(
        `  ✓ Stats: Total=${json.stats.totalProjects}, InProgress=${json.stats.inProgressCount}, WithMentor=${json.stats.withPrimaryMentorCount}`
      );
      passed++;
    } else {
      console.error("  ✗ Project directory response invalid:", json);
    }
  } catch (err) {
    console.error("  ✗ Test 2 failed with error:", err.message);
  }

  // TEST 3: Project details, team roster, mentor allocations, and password hash security
  console.log("\n[Test 3/8] Testing Project Details & Data Confidentiality...");
  try {
    // Project 1 exists from sample data
    const res = await fetch(`${BASE_URL}/api/admin/projects/1`, { headers: adminHeaders });
    const json = await res.json();

    if (res.ok && json.success && json.project) {
      const p = json.project;
      const rawText = JSON.stringify(json);
      const leaksHash =
        rawText.includes("$2b$") ||
        rawText.includes("$2a$") ||
        rawText.includes("password_hash");

      if (
        p.project_id === 1 &&
        Array.isArray(p.team_members) &&
        Array.isArray(p.mentor_allocations) &&
        !leaksHash
      ) {
        console.log(`  ✓ Loaded project #${p.project_id}: "${p.project_title}".`);
        console.log(`  ✓ Team members count: ${p.team_members.length}`);
        console.log(`  ✓ Mentor allocations count: ${p.mentor_allocations.length}`);
        console.log("  ✓ Password hash security verified: No password hash or secrets exposed.");
        passed++;
      } else {
        console.error("  ✗ Project details verification failed or leaked hash:", {
          hasMembers: Array.isArray(p.team_members),
          hasMentors: Array.isArray(p.mentor_allocations),
          leaksHash,
        });
      }
    } else {
      console.error("  ✗ Failed to fetch project 1 details:", json);
    }
  } catch (err) {
    console.error("  ✗ Test 3 failed with error:", err.message);
  }

  // TEST 4: Unique group constraint enforcement (1 project per group)
  console.log("\n[Test 4/8] Testing Unique Group-to-Project Constraint Enforcement...");
  try {
    // Group 1 already has Project 1
    const res = await fetch(`${BASE_URL}/api/admin/projects`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        group_id: 1,
        project_title: "Duplicate Group Project Test",
      }),
    });
    const json = await res.json();

    if (res.status === 409 && !json.success) {
      console.log(
        "  ✓ Rejected duplicate project assignment to group #1 with HTTP 409 Conflict."
      );
      console.log(`  ✓ Response message: "${json.message}"`);
      passed++;
    } else {
      console.error(
        `  ✗ Expected HTTP 409 Conflict for duplicate group assignment, got ${res.status}:`,
        json
      );
    }
  } catch (err) {
    console.error("  ✗ Test 4 failed with error:", err.message);
  }

  // TEST 5: Mentor directory and workload metrics
  console.log("\n[Test 5/8] Testing Mentor Directory & Workload Calculation...");
  try {
    const res = await fetch(`${BASE_URL}/api/admin/mentors`, { headers: adminHeaders });
    const json = await res.json();

    if (
      res.ok &&
      json.success &&
      Array.isArray(json.mentors) &&
      json.mentors.length > 0 &&
      json.stats
    ) {
      const m1 = json.mentors[0];
      const hasWorkloadFields =
        typeof m1.active_projects_count === "number" &&
        typeof m1.max_projects === "number" &&
        typeof m1.availability_status === "string";

      if (hasWorkloadFields) {
        console.log(`  ✓ Retrieved ${json.mentors.length} faculty mentors.`);
        console.log(
          `  ✓ Mentor #${m1.mentor_id} (${m1.full_name}): ${m1.active_projects_count}/${m1.max_projects} active, Status=${m1.availability_status}`
        );
        console.log(
          `  ✓ Stats: Total=${json.stats.totalMentors}, ActiveAllocations=${json.stats.activeAllocationsCount}, AvgWorkload=${json.stats.avgWorkload}`
        );
        passed++;
      } else {
        console.error("  ✗ Mentor workload attributes missing:", m1);
      }
    } else {
      console.error("  ✗ Mentor directory fetch failed:", json);
    }
  } catch (err) {
    console.error("  ✗ Test 5 failed with error:", err.message);
  }

  // TEST 6: Mentor capacity and availability enforcement
  console.log("\n[Test 6/8] Testing Mentor Capacity & Availability Constraints...");
  let tempMentorUserId = null;
  let tempMentorId = null;
  try {
    // Create a temporary mentor with max_projects = 1 to test capacity rejection
    const insertUser = await query(
      `INSERT INTO users (email, password_hash, full_name, role, account_status)
       VALUES ('test.mentor.cap@cpms.demo', 'hash', 'Test Capacity Mentor', 'Mentor', 'Active')`
    );
    tempMentorUserId = insertUser.insertId;

    const insertMentor = await query(
      `INSERT INTO capstone_mentors (user_id, employee_id, department, max_projects, availability_status)
       VALUES (?, 'TEST-M-CAP', 'CSE', 1, 'Unavailable')`,
      [tempMentorUserId]
    );
    tempMentorId = insertMentor.insertId;

    // Test 6a: Reject allocation when mentor is Unavailable
    const unavailRes = await fetch(`${BASE_URL}/api/admin/mentors/allocations`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        project_id: 1,
        mentor_id: tempMentorId,
        mentor_role: "Co-Mentor",
      }),
    });
    const unavailJson = await unavailRes.json();

    const blockedUnavailable = unavailRes.status === 409 && !unavailJson.success;

    // Now make available, allocate 1 project (reaches capacity)
    await query(`UPDATE capstone_mentors SET availability_status = 'Available' WHERE mentor_id = ?`, [
      tempMentorId,
    ]);

    // Create a temporary project for the first allocation
    // First create a temporary group
    const tempGroupRes = await query(
      `INSERT INTO project_groups (group_name, department, batch, academic_year, formation_date, team_leader_id, group_status)
       VALUES ('Temp Cap Group', 'CSE', '2024-2028', '2026-2027', CURDATE(), 1, 'Active')`
    );
    const tempGroupId = tempGroupRes.insertId;

    const tempProjRes = await query(
      `INSERT INTO capstone_projects (group_id, project_title, project_status)
       VALUES (?, 'Temp Capstone Project For Mentor Test', 'In Progress')`,
      [tempGroupId]
    );
    const tempProjId = tempProjRes.insertId;

    // First allocation: should succeed
    const firstAlloc = await fetch(`${BASE_URL}/api/admin/mentors/allocations`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        project_id: tempProjId,
        mentor_id: tempMentorId,
        mentor_role: "Primary",
      }),
    });

    // Second allocation: should fail because max_projects = 1
    const secondAlloc = await fetch(`${BASE_URL}/api/admin/mentors/allocations`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        project_id: 1,
        mentor_id: tempMentorId,
        mentor_role: "Co-Mentor",
      }),
    });
    const secondJson = await secondAlloc.json();

    const blockedCapacity = secondAlloc.status === 409 && !secondJson.success;

    // Clean up temporary allocations and project
    await query(`DELETE FROM mentor_allocations WHERE mentor_id = ?`, [tempMentorId]);
    await query(`DELETE FROM capstone_projects WHERE project_id = ?`, [tempProjId]);
    await query(`DELETE FROM project_groups WHERE group_id = ?`, [tempGroupId]);

    if (blockedUnavailable && firstAlloc.status === 201 && blockedCapacity) {
      console.log("  ✓ Correctly rejected assignment when mentor status is 'Unavailable'.");
      console.log("  ✓ Successfully assigned when available and within capacity.");
      console.log(
        `  ✓ Correctly rejected assignment exceeding capacity (1/1 active): "${secondJson.message}"`
      );
      passed++;
    } else {
      console.error("  ✗ Capacity/availability test failed:", {
        blockedUnavailable,
        firstStatus: firstAlloc.status,
        blockedCapacity,
        secondJson,
      });
    }
  } catch (err) {
    console.error("  ✗ Test 6 failed with error:", err.message);
  } finally {
    if (tempMentorId) {
      await query(`DELETE FROM capstone_mentors WHERE mentor_id = ?`, [tempMentorId]);
    }
    if (tempMentorUserId) {
      await query(`DELETE FROM users WHERE user_id = ?`, [tempMentorUserId]);
    }
  }

  // TEST 7: Duplicate assignment prevention & Primary mentor atomic transition
  console.log("\n[Test 7/8] Testing Duplicate Prevention & Atomic Primary Mentor Transition...");
  let testGroupId = null;
  let testProjectId = null;
  try {
    // Create isolated test group & project
    const groupRes = await query(
      `INSERT INTO project_groups (group_name, department, batch, academic_year, formation_date, team_leader_id, group_status)
       VALUES ('Phase3 Test Group', 'CSE', '2024-2028', '2026-2027', CURDATE(), 1, 'Active')`
    );
    testGroupId = groupRes.insertId;

    const projRes = await query(
      `INSERT INTO capstone_projects (group_id, project_title, project_status)
       VALUES (?, 'Phase 3 Verification Capstone System', 'In Progress')`,
      [testGroupId]
    );
    testProjectId = projRes.insertId;

    // Mentor 1 (Dr. Ananya Rao) and Mentor 2 (Dr. Vikram Shah)
    // 7a. Assign Mentor 1 as Primary
    const assign1 = await fetch(`${BASE_URL}/api/admin/mentors/allocations`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        project_id: testProjectId,
        mentor_id: 1,
        mentor_role: "Primary",
        remarks: "Initial Primary Mentor",
      }),
    });

    // 7b. Attempt to assign Mentor 1 AGAIN while already active -> Should reject with 409
    const dupAssign = await fetch(`${BASE_URL}/api/admin/mentors/allocations`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        project_id: testProjectId,
        mentor_id: 1,
        mentor_role: "Co-Mentor",
      }),
    });
    const dupJson = await dupAssign.json();

    // 7c. Assign Mentor 2 as new Primary -> Mentor 1's allocation should atomically transition to 'Ended'
    const assign2 = await fetch(`${BASE_URL}/api/admin/mentors/allocations`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        project_id: testProjectId,
        mentor_id: 2,
        mentor_role: "Primary",
        remarks: "New Primary Mentor taking over",
      }),
    });

    // Verify DB states
    const [mentor1Alloc] = await query(
      `SELECT allocation_status, mentor_role FROM mentor_allocations WHERE project_id = ? AND mentor_id = 1`,
      [testProjectId]
    );
    const [mentor2Alloc] = await query(
      `SELECT allocation_status, mentor_role FROM mentor_allocations WHERE project_id = ? AND mentor_id = 2`,
      [testProjectId]
    );

    const dupBlocked = dupAssign.status === 409 && !dupJson.success;
    const mentor1Ended = mentor1Alloc && mentor1Alloc.allocation_status === "Ended";
    const mentor2Active =
      mentor2Alloc &&
      mentor2Alloc.allocation_status === "Active" &&
      mentor2Alloc.mentor_role === "Primary";

    if (assign1.status === 201 && dupBlocked && assign2.status === 201 && mentor1Ended && mentor2Active) {
      console.log("  ✓ Assigned Mentor 1 as Primary.");
      console.log("  ✓ Blocked duplicate assignment of active mentor with HTTP 409.");
      console.log("  ✓ Assigned Mentor 2 as new Primary.");
      console.log("  ✓ Atomically transitioned previous Primary mentor allocation to 'Ended'.");
      passed++;
    } else {
      console.error("  ✗ Primary mentor transition or duplicate check failed:", {
        assign1Status: assign1.status,
        dupBlocked,
        assign2Status: assign2.status,
        mentor1Ended,
        mentor2Active,
      });
    }
  } catch (err) {
    console.error("  ✗ Test 7 failed with error:", err.message);
  }

  // TEST 8: End allocation endpoint & Cleanup
  console.log("\n[Test 8/8] Testing End Allocation Endpoint & State Management...");
  try {
    // Find active allocation for Mentor 2 on testProjectId
    const [activeRow] = await query(
      `SELECT allocation_id FROM mentor_allocations WHERE project_id = ? AND mentor_id = 2 AND allocation_status = 'Active'`,
      [testProjectId]
    );

    if (!activeRow) {
      throw new Error("Could not find active allocation for Mentor 2");
    }

    const endRes = await fetch(`${BASE_URL}/api/admin/mentors/allocations`, {
      method: "DELETE",
      headers: adminHeaders,
      body: JSON.stringify({
        allocation_id: activeRow.allocation_id,
        remarks: "Project completed successfully",
      }),
    });
    const endJson = await endRes.json();

    // Verify status in DB
    const [endedRow] = await query(
      `SELECT allocation_status, end_date, remarks FROM mentor_allocations WHERE allocation_id = ?`,
      [activeRow.allocation_id]
    );

    const isEnded = endedRow && endedRow.allocation_status === "Ended" && endedRow.end_date !== null;

    if (endRes.ok && endJson.success && isEnded) {
      console.log("  ✓ Successfully ended allocation via DELETE /api/admin/mentors/allocations.");
      console.log(`  ✓ Database updated: allocation_status = 'Ended', end_date set.`);
      passed++;
    } else {
      console.error("  ✗ End allocation test failed:", { endRes: endRes.status, endJson, endedRow });
    }
  } catch (err) {
    console.error("  ✗ Test 8 failed with error:", err.message);
  } finally {
    // Clean up test group and project
    if (testProjectId) {
      await query(`DELETE FROM mentor_allocations WHERE project_id = ?`, [testProjectId]);
      await query(`DELETE FROM capstone_projects WHERE project_id = ?`, [testProjectId]);
    }
    if (testGroupId) {
      await query(`DELETE FROM project_groups WHERE group_id = ?`, [testGroupId]);
    }
    console.log("  ✓ Test artifacts cleaned up from database.");
  }

  console.log(`\n======================================================`);
  console.log(`Verification Summary: ${passed}/${total} test suites passed.`);
  console.log(`======================================================\n`);

  if (passed === total) {
    console.log("ALL PHASE 3 CAPSTONE & MENTOR TESTS PASSED! 🎉\n");
    process.exit(0);
  } else {
    console.error(`FAILURE: ${total - passed} test suite(s) failed.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error during verification:", err);
  process.exit(1);
});
