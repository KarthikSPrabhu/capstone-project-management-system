"use client";

import { useState, FormEvent } from "react";

interface Props {
  onSuccess: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStudentModal({ onSuccess, isOpen, onClose }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [usn, setUsn] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [specialization, setSpecialization] = useState("AI & ML");
  const [batch, setBatch] = useState("2024-2028");
  const [semester, setSemester] = useState(5);
  const [section, setSection] = useState("A");
  const [cgpa, setCgpa] = useState("8.50");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          usn: usn.trim().toUpperCase(),
          department: department.trim(),
          specialization: specialization.trim() || undefined,
          batch: batch.trim(),
          current_semester: Number(semester),
          section: section.trim() || undefined,
          cgpa: cgpa ? parseFloat(cgpa) : undefined,
          phone_number: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to create student record.");
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch {
      setErrorMessage("Network error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Register New Student
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Verma"
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                USN *
              </label>
              <input
                type="text"
                required
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                placeholder="e.g. 1PES24CS101"
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white uppercase dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@cpms.demo"
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Department *
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Specialization
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Batch *
              </label>
              <input
                type="text"
                required
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Semester *
              </label>
              <input
                type="number"
                min={1}
                max={8}
                required
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                CGPA
              </label>
              <input
                type="text"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Registering..." : "Register Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

