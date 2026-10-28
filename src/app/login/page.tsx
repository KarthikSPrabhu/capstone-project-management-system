"use client";

import { useState, useTransition, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Whitelist of valid application redirect destinations to prevent open-redirect vulnerabilities
const ALLOWED_REDIRECT_PATHS = [
  "/dashboard/student",
  "/dashboard/mentor",
  "/dashboard/admin",
  "/dashboard",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientErrors, setClientErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  function validateClient(): boolean {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateClient()) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setErrorMessage(
            data.message || "Invalid credentials. Please check your email and password."
          );
          return;
        }

        // Validate redirect target against internal whitelist
        const destination =
          data.redirectTo && ALLOWED_REDIRECT_PATHS.includes(data.redirectTo)
            ? data.redirectTo
            : "/dashboard";

        router.push(destination);
      } catch {
        setErrorMessage("Unable to connect to the authentication service. Please try again.");
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 font-sans dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* CPMS Header & Branding */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center rounded-xl bg-zinc-900 p-3 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            CPMS Portal Login
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Capstone Project Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                Email Address
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (clientErrors.email) {
                      setClientErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="student@pes.edu"
                  className={`block w-full rounded-lg border bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 ${
                    clientErrors.email
                      ? "border-red-500 focus:ring-red-500"
                      : "border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
                  }`}
                />
              </div>
              {clientErrors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {clientErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (clientErrors.password) {
                      setClientErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  placeholder="••••••••"
                  className={`block w-full rounded-lg border bg-zinc-50 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900 ${
                    clientErrors.password
                      ? "border-red-500 focus:ring-red-500"
                      : "border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? (
                    // Eye slash icon
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {clientErrors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {clientErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-100 dark:focus:ring-offset-zinc-900"
            >
              {isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin text-current"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign in to CPMS</span>
              )}
            </button>
          </form>

          {/* Role Access Information */}
          <div className="mt-6 border-t border-zinc-100 pt-5 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <p>Role-based access for Students, Mentors, and Administrators.</p>
            <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              Accounts are provisioned by the CPMS department coordinator.
            </p>
          </div>
        </div>

        {/* Home navigation */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

