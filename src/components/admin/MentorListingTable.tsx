"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MentorListItem } from "@/lib/mentors/types";

interface Props {
  initialMentors: MentorListItem[];
  total: number;
}

export function MentorListingTable({ initialMentors, total }: Props) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("ALL");
  const [capacityFilter, setCapacityFilter] = useState<string>("ALL");

  const departments = useMemo(() => {
    return Array.from(new Set(initialMentors.map((m) => m.department).filter(Boolean))).sort();
  }, [initialMentors]);

  const filteredMentors = useMemo(() => {
    return initialMentors.filter((mentor) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = mentor.full_name.toLowerCase().includes(q);
        const matchesEmail = mentor.email.toLowerCase().includes(q);
        const matchesEmpId = mentor.employee_id.toLowerCase().includes(q);
        const matchesSpec = (mentor.specialization || "").toLowerCase().includes(q);

        if (!matchesName && !matchesEmail && !matchesEmpId && !matchesSpec) {
          return false;
        }
      }

      if (departmentFilter !== "ALL" && mentor.department !== departmentFilter) {
        return false;
      }

      if (availabilityFilter !== "ALL" && mentor.availability_status !== availabilityFilter) {
        return false;
      }

      if (capacityFilter === "HAS_CAPACITY") {
        if (
          mentor.availability_status !== "Available" ||
          mentor.active_projects_count >= mentor.max_projects
        ) {
          return false;
        }
      } else if (capacityFilter === "AT_CAPACITY") {
        if (mentor.active_projects_count < mentor.max_projects) {
          return false;
        }
      }

      return true;
    });
  }, [initialMentors, search, departmentFilter, availabilityFilter, capacityFilter]);

  const getCapacityColor = (active: number, max: number) => {
    const ratio = active / max;
    if (ratio >= 1) return "bg-rose-500";
    if (ratio >= 0.75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by name, employee ID, email, or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-700 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-700 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value="ALL">All Availability</option>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable</option>
          </select>

          {/* Capacity Filter */}
          <select
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-700 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value="ALL">All Workload States</option>
            <option value="HAS_CAPACITY">Available for Projects</option>
            <option value="AT_CAPACITY">At Max Capacity</option>
          </select>
        </div>
      </div>

      {/* Mentor Cards / Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Mentor Name & ID</th>
                <th className="px-4 py-3">Department & Designation</th>
                <th className="px-4 py-3">Specialization</th>
                <th className="px-4 py-3">Workload / Capacity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned Projects</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredMentors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No faculty mentors match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMentors.map((mentor) => {
                  const percent = Math.min(
                    100,
                    Math.round((mentor.active_projects_count / mentor.max_projects) * 100)
                  );

                  return (
                    <tr
                      key={mentor.mentor_id}
                      className="hover:bg-zinc-50/80 transition-colors dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {mentor.full_name}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-500">
                          {mentor.employee_id} • {mentor.email}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {mentor.designation || "Faculty Member"}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {mentor.department}
                          {mentor.years_of_experience > 0 &&
                            ` • ${mentor.years_of_experience} yrs exp`}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {mentor.specialization ? (
                          <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                            {mentor.specialization}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">General</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {mentor.active_projects_count} / {mentor.max_projects}
                          </span>
                          <span className="text-zinc-400 text-[10px]">{percent}%</span>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-full transition-all duration-300 ${getCapacityColor(
                              mentor.active_projects_count,
                              mentor.max_projects
                            )}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            mentor.availability_status === "Available"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                          }`}
                        >
                          {mentor.availability_status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {mentor.assigned_projects && mentor.assigned_projects.length > 0 ? (
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            {mentor.assigned_projects.map((proj) => (
                              <Link
                                key={proj.project_id}
                                href={`/dashboard/admin/projects/${proj.project_id}`}
                                className="truncate text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                                title={`${proj.project_title} (${proj.mentor_role})`}
                              >
                                {proj.project_title} ({proj.mentor_role})
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400">No active projects</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/admin/mentors/${mentor.mentor_id}`}
                          className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                          View Profile →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          Showing {filteredMentors.length} of {total} faculty mentors
        </div>
      </div>
    </div>
  );
}
