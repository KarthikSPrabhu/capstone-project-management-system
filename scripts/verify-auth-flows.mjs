/**
 * CPMS Authentication & Authorization End-to-End Verification Test
 *
 * Tests the complete authentication lifecycle:
 * 1. Valid login for admin@cpms.demo
 * 2. Invalid password rejection (401)
 * 3. Session validation via GET /api/auth/me
 * 4. Role-based authorization (Admin access to /dashboard/admin vs /dashboard/student)
 * 5. Logout via POST /api/auth/logout and session invalidation
 *
 * Usage:
 *   PowerShell:
 *     $env:DEMO_ADMIN_PASSWORD="YourPassword"; node scripts/verify-auth-flows.mjs; Remove-Item Env:\DEMO_ADMIN_PASSWORD
 *   Bash:
 *     DEMO_ADMIN_PASSWORD="YourPassword" node scripts/verify-auth-flows.mjs
 */

import nextEnv from "@next/env";

const loadEnv = nextEnv.loadEnvConfig || nextEnv.default?.loadEnvConfig;
if (loadEnv) {
  loadEnv(process.cwd());
}

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const password = process.env.DEMO_ADMIN_PASSWORD;

if (!password) {
  console.error("[ERROR] Please provide DEMO_ADMIN_PASSWORD as an environment variable to run verification.");
  console.error("  Example: $env:DEMO_ADMIN_PASSWORD=\"YourPassword\"; node scripts/verify-auth-flows.mjs");
  process.exit(1);
}

// Clear password from process.env immediately
delete process.env.DEMO_ADMIN_PASSWORD;

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`CPMS Authentication & Authorization Flow Verification`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let sessionCookie = null;
  let passedCount = 0;
  let totalTests = 5;

  // TEST 1: Invalid Login Rejection
  console.log("[Test 1/5] Testing invalid password rejection (POST /api/auth/login)...");
  try {
    const invalidRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@cpms.demo",
        password: "definitely_wrong_password_123",
      }),
    });

    const invalidJson = await invalidRes.json();
    if (invalidRes.status === 401 && invalidJson.success === false) {
      console.log("  ✓ Correctly rejected with HTTP 401 and generic error message.");
      passedCount++;
    } else {
      console.error(`  ✗ Expected 401, received ${invalidRes.status}:`, invalidJson);
    }
  } catch (err) {
    console.error("  ✗ Test 1 failed with network/server error:", err.message);
  }

  // TEST 2: Valid Admin Login
  console.log("\n[Test 2/5] Testing valid Admin login (POST /api/auth/login)...");
  try {
    const validRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@cpms.demo",
        password: password,
      }),
    });

    const validJson = await validRes.json();
    const setCookieHeader = validRes.headers.get("set-cookie") || "";

    if (
      validRes.status === 200 &&
      validJson.success === true &&
      validJson.user?.role === "Admin" &&
      validJson.redirectTo === "/dashboard/admin" &&
      setCookieHeader.includes("cpms_session")
    ) {
      // Extract session cookie value
      const match = setCookieHeader.match(/cpms_session=([^;]+)/);
      sessionCookie = match ? match[1] : null;
      console.log("  ✓ Login succeeded with HTTP 200.");
      console.log(`  ✓ Received valid role: "${validJson.user.role}"`);
      console.log(`  ✓ Redirect target: "${validJson.redirectTo}"`);
      console.log("  ✓ HttpOnly cpms_session cookie attached.");
      passedCount++;
    } else {
      console.error(`  ✗ Login failed. Status: ${validRes.status}, Body:`, validJson);
    }
  } catch (err) {
    console.error("  ✗ Test 2 failed with network/server error:", err.message);
  }

  // TEST 3: Safe Session Verification via GET /api/auth/me
  console.log("\n[Test 3/5] Testing session profile retrieval (GET /api/auth/me)...");
  if (!sessionCookie) {
    console.error("  ✗ Skipped: No session cookie from Test 2.");
  } else {
    try {
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Cookie: `cpms_session=${sessionCookie}` },
      });

      const meJson = await meRes.json();
      if (
        meRes.status === 200 &&
        meJson.success === true &&
        meJson.user?.email === "admin@cpms.demo" &&
        meJson.user?.role === "Admin" &&
        meJson.user?.password_hash === undefined
      ) {
        console.log("  ✓ Session verified with HTTP 200.");
        console.log(`  ✓ Authenticated as: ${meJson.user.email} (ID: ${meJson.user.user_id})`);
        console.log("  ✓ Verified: password_hash is never exposed to client.");
        passedCount++;
      } else {
        console.error(`  ✗ /api/auth/me failed. Status: ${meRes.status}, Body:`, meJson);
      }
    } catch (err) {
      console.error("  ✗ Test 3 failed with network/server error:", err.message);
    }
  }

  // TEST 4: Role-Based Authorization Checks
  console.log("\n[Test 4/5] Testing role authorization on dashboards...");
  if (!sessionCookie) {
    console.error("  ✗ Skipped: No session cookie from Test 2.");
  } else {
    try {
      // A: Admin accessing Admin Dashboard -> should allow (200)
      const adminDashRes = await fetch(`${BASE_URL}/dashboard/admin`, {
        headers: { Cookie: `cpms_session=${sessionCookie}` },
        redirect: "manual",
      });

      // B: Admin accessing Student Dashboard -> should deny and redirect to /login
      const studentDashRes = await fetch(`${BASE_URL}/dashboard/student`, {
        headers: { Cookie: `cpms_session=${sessionCookie}` },
        redirect: "manual",
      });

      const adminAllowed = adminDashRes.status === 200;
      const studentDenied = studentDashRes.status === 307 && studentDashRes.headers.get("location") === "/login";

      if (adminAllowed && studentDenied) {
        console.log("  ✓ Admin dashboard (/dashboard/admin) accessible (HTTP 200).");
        console.log("  ✓ Student dashboard (/dashboard/student) rejected Admin and redirected to /login (HTTP 307).");
        passedCount++;
      } else {
        console.error(`  ✗ RBAC check mismatch: AdminDash=${adminDashRes.status}, StudentDash=${studentDashRes.status} -> ${studentDashRes.headers.get("location")}`);
      }
    } catch (err) {
      console.error("  ✗ Test 4 failed with error:", err.message);
    }
  }

  // TEST 5: Logout and Session Invalidation
  console.log("\n[Test 5/5] Testing logout and session clearing (POST /api/auth/logout)...");
  try {
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: sessionCookie ? `cpms_session=${sessionCookie}` : "" },
    });

    const logoutJson = await logoutRes.json();
    const logoutCookie = logoutRes.headers.get("set-cookie") || "";

    // Test /api/auth/me without cookie (or with cleared cookie)
    const afterLogoutRes = await fetch(`${BASE_URL}/api/auth/me`);
    const afterLogoutJson = await afterLogoutRes.json();

    if (
      logoutRes.status === 200 &&
      logoutJson.success === true &&
      logoutCookie.includes("Max-Age=0") &&
      afterLogoutRes.status === 401 &&
      afterLogoutJson.success === false
    ) {
      console.log("  ✓ Logout endpoint succeeded with HTTP 200.");
      console.log("  ✓ Set-Cookie header cleared session (Max-Age=0).");
      console.log("  ✓ Subsequent /api/auth/me request returned HTTP 401 Unauthorized.");
      passedCount++;
    } else {
      console.error(`  ✗ Logout verification failed: LogoutStatus=${logoutRes.status}, AfterStatus=${afterLogoutRes.status}`);
    }
  } catch (err) {
    console.error("  ✗ Test 5 failed with error:", err.message);
  }

  console.log(`\n======================================================`);
  console.log(`Verification Summary: ${passedCount}/${totalTests} tests passed.`);
  console.log(`======================================================\n`);

  if (passedCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();

