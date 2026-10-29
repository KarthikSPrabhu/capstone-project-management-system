"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AvailableStudent {
  student_id: number;
  usn: string;
  full_name: string;
  email: string;
  department: string;
  batch: string;
  current_semester: number | null;
  section: string | null;
  cgpa: number | string | null;
}

interface Props {
  availableStudents: AvailableStudent[];
}

export function CreateGroupForm({ availableStudents }: Props) {
  const router = useRouter();

  // Form states
  const [groupName, setGroupName] = useState("");
  const [department, setDepartment] = useState(
    availableStudents[0]?.department || "CSE"
  );
  const [batch, setBatch] = useState(availableStudents[0]?.batch || "2024-2028");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDomain, setProjectDomain] = useState("AI & Machine Learning");

  // Member selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [leaderId, setLeaderId] = useState<number | null>(null);

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  function toggleStudentSelection(studentId: number) {
    if (selectedIds.includes(studentId)) {
      const next = selectedIds.filter((id) => id !== studentId);
      setSelectedIds(next);
      if (leaderId === studentId) {
        setLeaderId(next[0] || null);
      }
    } else {
      if (selectedIds.length >= 4) {
        setErrorMessage("A capstone group can have at most four active members.");
        return;
      }
      const next = [...selectedIds, studentId];
      setSelectedIds(next);
      setErrorMessage(null);
      // Auto-assign first member as default leader if none selected
      if (!leaderId) {
        setLeaderId(studentId);
      }
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (!groupName.trim()) {
      setErrorMessage("Group name is required.");
      return;
    }
    if (selectedIds.length === 0) {
      setErrorMessage("Please select at least one student member for this group.");
      return;
    }
    if (selectedIds.length > 4) {
      setErrorMessage("Maximum team size is 4 members.");
      return;
    }
    if (!leaderId || !selectedIds.includes(leaderId)) {
      setErrorMessage("Please designate an active team leader from the selected members.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_name: groupName.trim(),
          department: department.trim(),
          batch: batch.trim(),
          academic_year: academicYear.trim(),
          team_leader_id: leaderId,
          member_ids: selectedIds,
          project_title: projectTitle.trim() || undefined,
          project_domain: projectDomain.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to create group.");
        setLoading(false);
        return;
      }

      // Redirect to the newly created group page
      router.push(`/dashboard/admin/groups/${data.group.group_id}`);
    } catch {
      setErrorMessage("A network or server error occurred. Please try again.");
      setLoading(false);
    }
  }

  // Filter available students
  const filteredAvailable = availableStudents.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.trim().toLowerCase();
    return (
      s.usn.toLowerCase().includes(q) ||
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
        >
          <svg className="h-4 w-4 shrink-0 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Group Details Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
          1. Group Metadata & Academic Scope
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Group Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Team Beta or Quantum Innovators"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Academic Year *
            </label>
            <input
              type="text"
              required
              placeholder="YYYY-YYYY (e.g. 2026-2027)"
              pattern="^\d{4}-\d{4}$"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Department *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CSE"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Batch *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2024-2028"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
      </div>

      {/* Member Selection Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              2. Member Allocation & Team Leader (1–4 Active Members)
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Only students with Active status and no existing active group memberships are shown.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              selectedIds.length === 4
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : selectedIds.length > 0
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {selectedIds.length} / 4 Selected
          </span>
        </div>

        {availableStudents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">
              No available unassigned students found.
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              All active students in the system are currently allocated to active project groups.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/admin/students"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                + Register New Students in Directory →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-xs">
              <input
                type="text"
                placeholder="Filter available students by name or USN..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-72 overflow-y-auto p-1 border border-zinc-100 rounded-lg dark:border-zinc-800">
              {filteredAvailable.map((student) => {
                const isSelected = selectedIds.includes(student.student_id);
                const isLeader = leaderId === student.student_id;
                const isMaxReached = selectedIds.length >= 4 && !isSelected;

                return (
                  <div
                    key={student.student_id}
                    onClick={() => !isMaxReached && toggleStudentSelection(student.student_id)}
                    className={`flex items-start justify-between rounded-lg border p-3 cursor-pointer transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20"
                        : isMaxReached
                        ? "border-zinc-200 bg-zinc-100/60 opacity-60 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-800/40"
                        : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/80"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {student.usn}
                        </span>
                        <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                          {student.full_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {student.department} | Sem {student.current_semester || "—"} {student.section ? `(${student.section})` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeaderId(student.student_id);
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                            isLeader
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-zinc-200 text-zinc-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-zinc-700 dark:text-zinc-300"
                          }`}
                          title="Designate as Team Leader"
                        >
                          {isLeader ? "★ Leader" : "Make Leader"}
                        </button>
                      )}

                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isMaxReached}
                        onChange={() => toggleStudentSelection(student.student_id)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Optional Project Initialization Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
          3. Optional Capstone Project Link
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Project Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Autonomous Traffic Flow Optimization"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Project Domain
            </label>
            <input
              type="text"
              placeholder="e.g. AI & Machine Learning, IoT, Cloud"
              value={projectDomain}
              onChange={(e) => setProjectDomain(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/dashboard/admin/groups"
          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Cancel and Return to Groups
        </Link>

        <button
          type="submit"
          disabled={loading || selectedIds.length === 0}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Creating Group & Members..." : "Create Capstone Group"}
        </button>
      </div>
    </form>
  );
}

