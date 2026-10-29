"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MentorDetails, MentorAvailability } from "@/lib/mentors/types";

interface Props {
  initialMentor: MentorDetails;
}

export function MentorDetailsView({ initialMentor }: Props) {
  const router = useRouter();
  const [mentor, setMentor] = useState<MentorDetails>(initialMentor);
  const [maxProjects, setMaxProjects] = useState<number>(initialMentor.max_projects);
  const [availability, setAvailability] = useState<MentorAvailability>(
    initialMentor.availability_status
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/mentors/${mentor.mentor_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_projects: Number(maxProjects),
          availability_status: availability,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update mentor profile.");
      }

      setMentor((prev) => ({
        ...prev,
        max_projects: Number(maxProjects),
        availability_status: availability,
      }));
      setFeedback({ type: "success", message: "Mentor capacity and availability updated." });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsUpdating(false);
    }
  };

  const percent = Math.min(
    100,
    Math.round((mentor.active_projects_count / mentor.max_projects) * 100)
  );

  const activeAllocations = mentor.allocations.filter((a) => a.allocation_status === "Active");
  const pastAllocations = mentor.allocations.filter((a) => a.allocation_status === "Ended");

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 font-bold hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-zinc-500">
                {mentor.employee_id}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-xs text-zinc-500 font-medium">{mentor.department}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  mentor.availability_status === "Available"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                }`}
              >
                {mentor.availability_status}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {mentor.full_name}
            </h1>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {mentor.designation || "Faculty Member"} • Specialization:{" "}
              <strong className="text-zinc-900 dark:text-zinc-200">
                {mentor.specialization || "General"}
              </strong>
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-500">
              <span>Email: {mentor.email}</span>
              {mentor.phone_number && <span>Phone: {mentor.phone_number}</span>}
              {mentor.office_location && <span>Office: {mentor.office_location}</span>}
              {mentor.years_of_experience > 0 && (
                <span>Experience: {mentor.years_of_experience} years</span>
              )}
            </div>
          </div>

          {/* Workload Metric Gauge */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 min-w-[220px] dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Active Workload</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {mentor.active_projects_count} / {mentor.max_projects} projects
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={`h-full transition-all duration-300 ${
                  percent >= 100
                    ? "bg-rose-500"
                    : percent >= 75
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{percent}% allocated</span>
              <span>{mentor.completed_projects_count} completed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Active & Past Project Guidance */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Allocations Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Current Active Project Guidance ({activeAllocations.length})
            </h2>

            {activeAllocations.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-4">
                No active capstone projects currently guided by this mentor.
              </p>
            ) : (
              <div className="space-y-3">
                {activeAllocations.map((alloc) => (
                  <div
                    key={alloc.allocation_id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            alloc.mentor_role === "Primary"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}
                        >
                          {alloc.mentor_role} Mentor
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {alloc.group_name} ({alloc.academic_year})
                        </span>
                      </div>
                      <Link
                        href={`/dashboard/admin/projects/${alloc.project_id}`}
                        className="mt-1 block text-sm font-bold text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        {alloc.project_title}
                      </Link>
                      <p className="text-[11px] text-zinc-500">
                        Team Leader: {alloc.team_leader_name} ({alloc.team_leader_usn})
                      </p>
                    </div>

                    <div className="mt-3 sm:mt-0 flex items-center gap-2">
                      <Link
                        href={`/dashboard/admin/projects/${alloc.project_id}`}
                        className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        View Project →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Allocations Log */}
          {pastAllocations.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                Historical Project Guidance ({pastAllocations.length})
              </h2>

              <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Project Title</th>
                      <th className="px-4 py-2.5 font-semibold">Role</th>
                      <th className="px-4 py-2.5 font-semibold">Allocated</th>
                      <th className="px-4 py-2.5 font-semibold">Ended</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {pastAllocations.map((alloc) => (
                      <tr key={alloc.allocation_id}>
                        <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                          <Link
                            href={`/dashboard/admin/projects/${alloc.project_id}`}
                            className="hover:underline text-blue-600 dark:text-blue-400"
                          >
                            {alloc.project_title}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                          {alloc.mentor_role}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 font-mono text-[11px]">
                          {new Date(alloc.allocation_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 font-mono text-[11px]">
                          {alloc.end_date ? new Date(alloc.end_date).toLocaleDateString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Capacity & Availability Settings */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
              Capacity & Availability Settings
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Availability Status
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as MentorAvailability)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="Available">Available for Guidance</option>
                  <option value="Unavailable">Unavailable (On Leave / Sabbatical)</option>
                </select>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Marking as Unavailable prevents this mentor from being assigned to any new
                  projects.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Max Active Projects Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxProjects}
                  onChange={(e) => setMaxProjects(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <p className="mt-1 text-[11px] text-zinc-400">
                  Default department maximum is 4 projects per faculty member.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full rounded-lg bg-zinc-900 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isUpdating ? "Saving Changes..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

