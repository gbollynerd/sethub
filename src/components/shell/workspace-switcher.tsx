"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar, Badge } from "@/components/ui";
import { IconChevronDown, IconPlus, IconSchool, IconUserPlus } from "@/components/icons";
import type { Community, SetDepartment } from "@/lib/types";
import { money } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  secondary_school: "Secondary school",
  primary_school: "Primary school",
  university: "University",
  polytechnic: "Polytechnic",
  technical_school: "Technical school",
  college_of_education: "College of education",
  vocational: "Vocational",
  seminary: "Seminary",
  other: "Institution",
};

/**
 * Slack-shaped community switcher. The whole workspace context changes when a
 * different set is chosen — including departments, which are listed as nested
 * sub-communities under the active set.
 */
export function WorkspaceSwitcher({
  communities,
  activeSetId,
  departments,
  activeDepartmentId,
}: {
  communities: Community[];
  activeSetId: string;
  departments: SetDepartment[];
  activeDepartmentId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = communities.find((c) => c.set_id === activeSetId);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const others = communities.filter((c) => c.set_id !== activeSetId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="group flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5 text-left transition hover:border-[var(--color-line-strong)] hover:shadow-[var(--shadow-card)]"
      >
        <Avatar name={active?.institution_short ?? "Set"} src={active?.logo_url} size={38} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[0.94rem] font-semibold leading-tight text-[var(--color-ink)]">
            {active?.institution_short ?? "Choose a community"}
          </span>
          <span className="block truncate text-[0.78rem] text-[var(--color-subtle)]">
            {active ? `${active.set_name}` : "No community selected"}
          </span>
        </span>
        <IconChevronDown
          size={16}
          className={`shrink-0 text-[var(--color-subtle)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-lift)] scroll-slim"
        >
          {active ? (
            <div className="px-2 pb-2 pt-1.5">
              <p className="t-eyebrow mb-2">Current community</p>
              <div className="rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] p-3">
                <p className="font-display text-sm font-semibold text-[var(--color-brand-deep)]">
                  {active.institution_name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-brand-dark)]">
                  {active.set_name} · {TYPE_LABEL[active.institution_type] ?? "Institution"}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge tone="brand" icon="people">
                    {active.member_count} members
                  </Badge>
                  {active.is_owner ? <Badge tone="plum" icon="shield">Owner</Badge> : null}
                  {Number(active.outstanding) > 0 ? (
                    <Badge tone="caution" icon="wallet">{money(active.outstanding)} due</Badge>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {departments.length ? (
            <div className="px-2 pb-2">
              <p className="t-eyebrow mb-1.5">Departments in this set</p>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={`/s/${activeSetId}`}
                    onClick={() => setOpen(false)}
                    data-active={!activeDepartmentId}
                    className="nav-item w-full"
                  >
                    <IconSchool size={18} />
                    <span className="truncate">Whole set</span>
                  </Link>
                </li>
                {departments.slice(0, 8).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/s/${activeSetId}/departments/${d.id}`}
                      onClick={() => setOpen(false)}
                      data-active={activeDepartmentId === d.id}
                      className="nav-item w-full"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: d.color ?? "var(--color-brand)" }}
                      />
                      <span className="min-w-0 flex-1 truncate">{d.name}</span>
                      <span className="tabular shrink-0 text-xs text-[var(--color-subtle)]">
                        {d.member_count}
                      </span>
                    </Link>
                  </li>
                ))}
                {departments.length > 8 ? (
                  <li>
                    <Link
                      href={`/s/${activeSetId}/departments`}
                      onClick={() => setOpen(false)}
                      className="nav-item w-full text-[var(--color-brand-dark)]"
                    >
                      <span className="pl-[1.1rem]">
                        View all {departments.length} departments
                      </span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {others.length ? (
            <div className="border-t border-[var(--color-line)] px-2 py-2">
              <p className="t-eyebrow mb-1.5">Your other communities</p>
              <ul className="space-y-0.5">
                {others.map((c) => (
                  <li key={c.set_id}>
                    <Link
                      href={`/s/${c.set_id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] p-2 transition hover:bg-[var(--color-surface-2)]"
                    >
                      <Avatar name={c.institution_short} src={c.logo_url} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {c.institution_short}
                        </span>
                        <span className="block truncate text-xs text-[var(--color-subtle)]">
                          {c.set_name}
                        </span>
                      </span>
                      {c.unread_count > 0 ? (
                        <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-brand)] px-1.5 text-[0.68rem] font-bold text-white">
                          {c.unread_count > 99 ? "99+" : c.unread_count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="border-t border-[var(--color-line)] p-2 pt-2.5">
            <Link
              href="/onboarding/join"
              onClick={() => setOpen(false)}
              className="nav-item w-full"
            >
              <IconUserPlus size={18} />
              Join another set
            </Link>
            <Link
              href="/onboarding/create"
              onClick={() => setOpen(false)}
              className="nav-item w-full"
            >
              <IconPlus size={18} />
              Create a set
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
