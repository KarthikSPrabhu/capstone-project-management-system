import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { AdminNav } from "@/components/admin/AdminNav";
import { StudentDirectoryTable } from "@/components/admin/StudentDirectoryTable";
import { GroupListingTable } from "@/components/admin/GroupListingTable";
import { getStudents, getStudentStats } from "@/lib/students";
import { getGroups, getGroupStats } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    redirect("/login");
  }

  // Fetch initial student and group metrics directly from MySQL
  const [studentStats, groupStats, studentsResult, groupsResult] = await Promise.all([
    getStudentStats(),
    getGroupStats(),
    getStudents({ limit: 50 }),
    getGroups({ limit: 20 }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                Departmental Coordinator
              </span>
              <span className="text-xs text-zinc-400">|</span>
              <span className="text-xs text-zinc-500 font-mono">User ID: #{session.userId}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Admin & Coordinator Portal
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Logged in as <strong className="text-zinc-700 dark:text-zinc-300">{session.email}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin/groups/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Create Capstone Group
            </Link>
            <LogoutButton />
          </div>
        </header>

        {/* Admin Navigation Tabs */}
        <AdminNav />

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Students
            </span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {studentStats.totalStudents}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {studentStats.activeStudents} active enrolled
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Capstone Groups
            </span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {groupStats.totalGroups}
            </div>
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {groupStats.activeGroups} active groups
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Allocated Students
            </span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {studentStats.assignedStudents}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {studentStats.unassignedStudents} unassigned
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Avg. Team Size
            </span>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {groupStats.averageTeamSize} <span className="text-xs font-normal text-zinc-500">/ 4 max</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              4 members maximum limit
            </p>
          </div>
        </div>

        {/* Capstone Groups Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Capstone Project Groups
              </h2>
              <p className="text-xs text-zinc-500">
                Managed project teams, team leaders, and active member limits.
              </p>
            </div>
            <Link
              href="/dashboard/admin/groups"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              View All Groups ({groupsResult.total}) →
            </Link>
          </div>

          <GroupListingTable
            initialGroups={groupsResult.groups}
            total={groupsResult.total}
          />
        </section>

        {/* Student Directory Section */}
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Student Enrollment Directory
              </h2>
              <p className="text-xs text-zinc-500">
                Searchable directory with USN, academic status, and group allocations.
              </p>
            </div>
            <Link
              href="/dashboard/admin/students"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Full Directory ({studentsResult.total}) →
            </Link>
          </div>

          <StudentDirectoryTable
            initialStudents={studentsResult.students}
            total={studentsResult.total}
          />
        </section>
      </div>
    </div>
  );
}
