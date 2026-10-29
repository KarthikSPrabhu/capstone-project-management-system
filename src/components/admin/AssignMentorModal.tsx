"use client";

import { useState, useEffect } from "react";
import { MentorListItem, MentorRole } from "@/lib/mentors/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectTitle: string;
  currentPrimaryMentorName?: string | null;
  onAssigned: () => void;
}

export function AssignMentorModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  currentPrimaryMentorName,
  onAssigned,
}: Props) {
  const [mentors, setMentors] = useState<MentorListItem[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState<number | "">("");
  const [role, setRole] = useState<MentorRole>("Primary");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    fetch("/api/admin/mentors")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && Array.isArray(data.mentors)) {
          setMentors(data.mentors);
          if (data.mentors.length > 0) {
            // Pick first available mentor with capacity
            const available = data.mentors.find(
              (m: MentorListItem) =>
                m.availability_status === "Available" &&
                m.active_projects_count < m.max_projects
            );
            setSelectedMentorId(available ? available.mentor_id : data.mentors[0].mentor_id);
          }
        }
      })
      .catch(() => {
        if (!ignore) setError("Failed to load mentor directory.");
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (!isOpen) return null;

  const selectedMentor = mentors.find((m) => m.mentor_id === Number(selectedMentorId));
  const isSelectedMentorAtCapacity =
    selectedMentor && selectedMentor.active_projects_count >= selectedMentor.max_projects;
  const isSelectedMentorUnavailable =
    selectedMentor && selectedMentor.availability_status === "Unavailable";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentorId) {
      setError("Please select a faculty mentor.");
      return;
    }

    if (isSelectedMentorAtCapacity) {
      setError(
        `${selectedMentor?.full_name} has already reached their capacity of ${selectedMentor?.max_projects} active projects.`
      );
      return;
    }

    if (isSelectedMentorUnavailable) {
      setError(`${selectedMentor?.full_name} is currently marked as Unavailable.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/mentors/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          mentor_id: Number(selectedMentorId),
          mentor_role: role,
          remarks: remarks.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to allocate mentor.");
      }

      onAssigned();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Assign Faculty Mentor
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{projectTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {mentors.length === 0 && !error ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading mentor roster...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Mentor Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Select Mentor <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {mentors.map((m) => {
                  const atCapacity = m.active_projects_count >= m.max_projects;
                  const isUnavail = m.availability_status === "Unavailable";
                  return (
                    <option key={m.mentor_id} value={m.mentor_id}>
                      {m.full_name} ({m.designation || "Faculty"} • {m.specialization || "General"})
                      {" — "}
                      {m.active_projects_count}/{m.max_projects} active
                      {isUnavail ? " [Unavailable]" : atCapacity ? " [Full]" : ""}
                    </option>
                  );
                })}
              </select>

              {/* Mentor Capacity indicator */}
              {selectedMentor && (
                <div className="mt-2 rounded-lg bg-zinc-50 p-2.5 text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>
                      Current Active Workload:{" "}
                      <strong className="text-zinc-900 dark:text-zinc-200">
                        {selectedMentor.active_projects_count} / {selectedMentor.max_projects}{" "}
                        projects
                      </strong>
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        selectedMentor.availability_status === "Available"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                      }`}
                    >
                      {selectedMentor.availability_status}
                    </span>
                  </div>
                  {isSelectedMentorAtCapacity && (
                    <p className="mt-1 text-rose-600 dark:text-rose-400 font-medium">
                      ⚠️ Warning: This mentor has reached the maximum allocation limit.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Mentor Role <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition ${
                    role === "Primary"
                      ? "border-zinc-900 bg-zinc-50 font-semibold text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mentorRole"
                      value="Primary"
                      checked={role === "Primary"}
                      onChange={() => setRole("Primary")}
                      className="text-zinc-900 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                    <span>Primary Mentor</span>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition ${
                    role === "Co-Mentor"
                      ? "border-zinc-900 bg-zinc-50 font-semibold text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="mentorRole"
                      value="Co-Mentor"
                      checked={role === "Co-Mentor"}
                      onChange={() => setRole("Co-Mentor")}
                      className="text-zinc-900 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                    <span>Co-Mentor</span>
                  </div>
                </label>
              </div>

              {role === "Primary" && currentPrimaryMentorName && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                  ℹ️ Note: This project currently has <strong>{currentPrimaryMentorName}</strong> as
                  its Primary Mentor. Assigning a new Primary Mentor will transition the previous
                  allocation to Ended.
                </p>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Allocation Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g., Assigned for domain expertise in ML pipelines..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-900 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isSelectedMentorAtCapacity || isSelectedMentorUnavailable}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Allocating..." : "Confirm Allocation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
