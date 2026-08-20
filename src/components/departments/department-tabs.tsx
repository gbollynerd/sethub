"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICONS } from "@/components/icons";

const TABS = [
  { label: "Overview", suffix: "", icon: "home" as const },
  { label: "Members", suffix: "/members", icon: "people" as const },
  { label: "Channels", suffix: "/channels", icon: "chat" as const },
  { label: "Announcements", suffix: "/announcements", icon: "megaphone" as const },
  { label: "Events", suffix: "/events", icon: "calendar" as const },
  { label: "Dues", suffix: "/dues", icon: "wallet" as const },
  { label: "Settings", suffix: "/settings", icon: "settings" as const },
];

export function DepartmentTabs({ setId, departmentId }: { setId: string; departmentId: string }) {
  const pathname = usePathname();
  const base = `/s/${setId}/departments/${departmentId}`;

  return (
    <nav className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto border-b border-[var(--color-line)] pb-px">
      {TABS.map((t) => {
        const href = `${base}${t.suffix}`;
        const active = pathname === href;
        const Icon = ICONS[t.icon];
        return (
          <Link
            key={t.label}
            href={href}
            data-active={active}
            className="flex shrink-0 items-center gap-2 rounded-t-[var(--radius-sm)] border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)] data-[active=true]:border-[var(--color-brand)] data-[active=true]:font-semibold data-[active=true]:text-[var(--color-brand-deep)]"
          >
            <Icon size={16} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
