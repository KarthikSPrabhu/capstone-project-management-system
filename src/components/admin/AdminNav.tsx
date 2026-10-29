"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard/admin", label: "Dashboard Overview" },
    { href: "/dashboard/admin/students", label: "Student Directory" },
    { href: "/dashboard/admin/groups", label: "Capstone Groups" },
  ];

  return (
    <nav className="flex space-x-1 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6 overflow-x-auto">
      {links.map((link) => {
        const isActive =
          link.href === "/dashboard/admin"
            ? pathname === "/dashboard/admin"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              isActive
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

