"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ICONS, IconChevronDown, IconClose, IconMenu } from "@/components/icons";
import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";
import { navigation } from "@/lib/nav";
import type { Community, SetDepartment } from "@/lib/types";
import { Logo, LogoMark } from "@/components/brand";

interface Props {
  setId: string;
  communities: Community[];
  departments: SetDepartment[];
  activeDepartmentId?: string | null;
  counts: { unread: number; dues: number; pending: number };
  canAdminister: boolean;
}

export function Sidebar(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("sethub-sidebar-collapsed") === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("sethub-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <>
      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-canvas)]/92 px-4 py-3 backdrop-blur lg:hidden">
        <Logo compact />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="btn btn-ghost btn-icon"
          aria-label="Open navigation"
        >
          <IconMenu size={20} />
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-[var(--color-ink)]/45 backdrop-blur-sm"
          />
          <div className="animate-rise absolute inset-y-0 left-0 flex w-[86%] max-w-[19rem] flex-col bg-[var(--color-canvas-2)] shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3.5">
              <Logo compact />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn btn-quiet btn-icon"
                aria-label="Close"
              >
                <IconClose size={18} />
              </button>
            </div>
            <SidebarBody {...props} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Desktop rail */}
      <aside
        data-collapsed={collapsed}
        className="sticky top-0 hidden h-dvh w-[17.5rem] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-canvas-2)] transition-[width] duration-300 ease-out data-[collapsed=true]:w-[5.4rem] lg:flex"
      >
        <div
          className="flex items-center justify-between gap-2 px-4 pb-1 pt-5 data-[collapsed=true]:justify-center"
          data-collapsed={collapsed}
        >
          {collapsed ? <LogoMark size={32} /> : <Logo />}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="btn btn-quiet btn-icon shrink-0"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <IconMenu size={18} />
          </button>
        </div>
        <SidebarBody {...props} collapsed={collapsed} />
      </aside>
    </>
  );
}

function SidebarBody({
  setId,
  communities,
  departments,
  activeDepartmentId,
  counts,
  canAdminister,
  onNavigate,
  collapsed = false,
}: Props & { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const sections = navigation(setId);

  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 pt-3">
      {!collapsed ? (
        <WorkspaceSwitcher
          communities={communities}
          activeSetId={setId}
          departments={departments}
          activeDepartmentId={activeDepartmentId}
        />
      ) : null}

      <nav className="flex flex-col gap-5">
        {sections.map((section, si) => {
          if (section.title === "Administration" && !canAdminister) return null;
          return (
            <div key={section.title ?? si}>
              {section.title && !collapsed ? (
                <p className="mb-1.5 px-2 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-[var(--color-subtle)]">
                  {section.title}
                </p>
              ) : collapsed && section.title ? (
                <div className="mx-auto my-2 h-px w-8 bg-[var(--color-line)]" aria-hidden="true" />
              ) : null}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active =
                    pathname === item.href ||
                    (item.href !== `/s/${setId}` && pathname.startsWith(`${item.href}/`));
                  const badge =
                    item.badge === "unread" ? counts.unread
                    : item.badge === "dues" ? counts.dues
                    : item.badge === "pending" ? counts.pending
                    : 0;

                  return (
                    <li key={item.href}>
                      <NavRow
                        href={item.href}
                        label={item.label}
                        active={active}
                        icon={<Icon size={19} />}
                        badge={badge}
                        childrenLinks={item.children}
                        pathname={pathname}
                        onNavigate={onNavigate}
                        collapsed={collapsed}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="mt-auto rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-brand-deep)] to-[var(--color-brand)] p-4 text-white">
          <p className="font-display text-sm font-semibold">Bring the whole set in</p>
          <p className="mt-1 text-xs leading-relaxed text-white/80">
            Share an invite link on WhatsApp and your classmates land straight in this community.
          </p>
          <Link
            href={`/s/${setId}/admin/invites`}
            onClick={onNavigate}
            className="btn btn-sm mt-3 w-full bg-white text-[var(--color-brand-deep)] hover:bg-white/90"
          >
            Create invite link
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function NavRow({
  href,
  label,
  icon,
  active,
  badge,
  childrenLinks,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge: number;
  childrenLinks?: Array<{ label: string; href: string }>;
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const [expanded, setExpanded] = useState(active);

  return (
    <>
      <div className="flex items-center">
        <Link
          href={href}
          onClick={onNavigate}
          data-active={active}
          className={`nav-item min-w-0 flex-1 ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? label : undefined}
        >
          {icon}
          {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
          {badge > 0 && !collapsed ? (
            <span className="tabular grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] px-1.5 text-[0.66rem] font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </Link>
        {childrenLinks?.length && !collapsed ? (
          <button
            type="button"
            aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
            onClick={() => setExpanded((v) => !v)}
            className="ml-0.5 rounded-md p-1 text-[var(--color-subtle)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
          >
            <IconChevronDown size={14} className={expanded ? "rotate-180" : ""} />
          </button>
        ) : null}
      </div>

      {childrenLinks?.length && expanded && !collapsed ? (
        <ul className="ml-[1.65rem] mt-0.5 space-y-0.5 border-l border-[var(--color-line)] pl-3">
          {childrenLinks.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                onClick={onNavigate}
                data-active={pathname === c.href}
                className="block rounded-[var(--radius-xs)] px-2 py-1.5 text-[0.83rem] font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] data-[active=true]:font-semibold data-[active=true]:text-[var(--color-brand-deep)]"
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
