import { redirect } from "next/navigation";
import { requireMentor } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function MentorDashboardPage() {
  let session;
  try {
    session = await requireMentor();
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950 sm:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              Mentor Portal
            </span>
            <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Welcome, {session.email}
            </h1>
            <p className="text-xs text-zinc-500">User ID: #{session.userId} | Role: {session.role}</p>
          </div>
          <LogoutButton />
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Mentor Review & Guidance
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            This protected foundation allows authenticated faculty mentors to inspect assigned capstone project groups, evaluate submissions, and record qualitative feedback.
          </p>
        </section>
      </div>
    </div>
  );
}

