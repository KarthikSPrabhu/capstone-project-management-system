"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { StudentListItem } from "@/lib/students/types";

interface Props {
  initialStudents: StudentListItem[];
  total: number;
}

export function StudentDirectoryTable({ initialStudents, total }: Props) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");

  // Derive unique departments for dropdown
  const departments = useMemo(() => {
    const set = new Set(initialStudents.map((s) => s.department));
    return Array.from(set).sort();
  }, [initialStudents]);

  // Filter students client-side for immediate responsiveness
  const filteredStudents = useMemo(() => {
    return initialStudents.filter((student) => {
      // 1. Text search
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesUsn = student.usn.toLowerCase().includes(query);
        const matchesName = student.full_name.toLowerCase().includes(query);
        const matchesEmail = student.email.toLowerCase().includes(query);
        if (!matchesUsn && !matchesName && !matchesEmail) {
          return false;
        }
      }

      // 2. Department filter
      if (departmentFilter !== "ALL" && student.department !== departmentFilter) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== "ALL" && student.academic_status !== statusFilter) {
        return false;
      }

      // 4. Group assignment filter
      if (groupFilter === "ASSIGNED" && !student.active_group_id) {
        return false;
      }
      if (groupFilter === "UNASSIGNED" && student.active_group_id) {
        return false;
      }

      return true;
    });
  }, [initialStudents, search, departmentFilter, statusFilter, groupFilter]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by USN, name, or email..."
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
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Academic Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-700 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Graduated">Graduated</option>
          </select>

          {/* Group Allocation Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-700 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value="ALL">All Allocations</option>
            <option value="ASSIGNED">Assigned to Group</option>
            <option value="UNASSIGNED">Unassigned</option>
          </select>

          {(search || departmentFilter !== "ALL" || statusFilter !== "ALL" || groupFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setDepartmentFilter("ALL");
                setStatusFilter("ALL");
                setGroupFilter("ALL");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <span>
          Showing <strong>{filteredStudents.length}</strong> of <strong>{total}</strong> students
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th scope="col" className="px-4 py-3">USN</th>
                <th scope="col" className="px-4 py-3">Student Name</th>
                <th scope="col" className="px-4 py-3">Department & Spec</th>
                <th scope="col" className="px-4 py-3">Batch</th>
                <th scope="col" className="px-4 py-3">Sem / Sec</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Capstone Group</th>
                <th scope="col" className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    <p className="font-medium">No students match your search criteria.</p>
                    <p className="mt-1 text-[11px] text-zinc-400">Try adjusting your keyword or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr
                    key={student.student_id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {student.usn}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {student.full_name}
                      </div>
                      <div className="text-[11px] text-zinc-500">{student.email}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      <div>{student.department}</div>
                      {student.specialization && (
                        <div className="text-[11px] text-zinc-500">{student.specialization}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {student.batch}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      Sem {student.current_semester || "—"} {student.section ? `(${student.section})` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          student.academic_status === "Active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                            : student.academic_status === "Graduated"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {student.academic_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {student.active_group_id ? (
                        <Link
                          href={`/dashboard/admin/groups/${student.active_group_id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          <span>{student.active_group_name}</span>
                          {student.group_role === "Leader" && (
                            <span className="rounded bg-amber-100 px-1 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Leader
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/admin/students/${student.student_id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

