"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GroupListItem } from "@/lib/groups/types";

interface Props {
  initialGroups: GroupListItem[];
  total: number;
}

export function GroupListingTable({ initialGroups, total }: Props) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [academicYearFilter, setAcademicYearFilter] = useState("ALL");

  // Derive unique filters
  const departments = useMemo(() => {
    return Array.from(new Set(initialGroups.map((g) => g.department))).sort();
  }, [initialGroups]);

  const academicYears = useMemo(() => {
    return Array.from(new Set(initialGroups.map((g) => g.academic_year))).sort();
  }, [initialGroups]);

  const filteredGroups = useMemo(() => {
    return initialGroups.filter((group) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = group.group_name.toLowerCase().includes(q);
        const matchesLeader = group.leader_name.toLowerCase().includes(q);
        const matchesUsn = group.leader_usn.toLowerCase().includes(q);
        const matchesProj = (group.project_title || "").toLowerCase().includes(q);
        if (!matchesName && !matchesLeader && !matchesUsn && !matchesProj) {
          return false;
        }
      }

      if (departmentFilter !== "ALL" && group.department !== departmentFilter) {
        return false;
      }

      if (statusFilter !== "ALL" && group.group_status !== statusFilter) {
        return false;
      }

      if (academicYearFilter !== "ALL" && group.academic_year !== academicYearFilter) {
        return false;
      }

      return true;
    });
  }, [initialGroups, search, departmentFilter, statusFilter, academicYearFilter]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by group name, leader, or project..."
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

          {/* Academic Year Filter */}
          <select
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-700 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value="ALL">All Academic Years</option>
            {academicYears.map((ay) => (
              <option key={ay} value={ay}>
                {ay}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-700 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Forming">Forming</option>
            <option value="Completed">Completed</option>
            <option value="Disbanded">Disbanded</option>
          </select>

          {/* Create Group Action */}
          <Link
            href="/dashboard/admin/groups/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <span>+ Create Group</span>
          </Link>
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <span>
          Showing <strong>{filteredGroups.length}</strong> of <strong>{total}</strong> capstone groups
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-4 py-3">Group Name</th>
                <th scope="col" className="px-4 py-3">Department & Batch</th>
                <th scope="col" className="px-4 py-3">Academic Year</th>
                <th scope="col" className="px-4 py-3">Team Leader</th>
                <th scope="col" className="px-4 py-3">Members</th>
                <th scope="col" className="px-4 py-3">Capstone Project</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    <p className="font-medium">No capstone groups found.</p>
                    <p className="mt-1 text-[11px] text-zinc-400">Create a new group or adjust your search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  const memberCount = group.active_member_count || group.team_size;
                  const isFull = memberCount >= 4;

                  return (
                    <tr
                      key={group.group_id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {group.group_name}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          ID: #{group.group_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        <div>{group.department}</div>
                        <div className="text-[11px] text-zinc-500">{group.batch}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {group.academic_year}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {group.leader_name}
                        </div>
                        {group.leader_usn && (
                          <div className="font-mono text-[11px] text-zinc-500">
                            {group.leader_usn}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            isFull
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          <span>{memberCount}/4 Members</span>
                          {isFull && <span className="text-[9px] uppercase font-bold">Full</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {group.project_title ? (
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1 max-w-[220px]">
                              {group.project_title}
                            </div>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400">
                              {group.project_status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">
                            No project linked yet
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            group.group_status === "Active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : group.group_status === "Forming"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                              : group.group_status === "Completed"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
                              : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                          }`}
                        >
                          {group.group_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/admin/groups/${group.group_id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

