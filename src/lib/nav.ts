import type { IconName } from "@/components/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Permission required to see the item at all. */
  permission?: string;
  badge?: "unread" | "dues" | "pending";
  children?: Array<{ label: string; href: string }>;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export function navigation(setId: string): NavSection[] {
  const base = `/s/${setId}`;
  return [
    {
      items: [
        { label: "Dashboard", href: base, icon: "dashboard" },
        { label: "People", href: `${base}/people`, icon: "people" },
        { label: "Chat", href: `${base}/chat`, icon: "chat", badge: "unread" },
        { label: "Departments", href: `${base}/departments`, icon: "department" },
      ],
    },
    {
      title: "Life of the set",
      items: [
        {
          label: "Events",
          href: `${base}/events`,
          icon: "calendar",
          children: [
            { label: "All events", href: `${base}/events` },
            { label: "Calendar", href: `${base}/calendar` },
          ],
        },
        {
          label: "Community",
          href: `${base}/community`,
          icon: "community",
          children: [
            { label: "Announcements", href: `${base}/community/announcements` },
            { label: "Groups & committees", href: `${base}/community/groups` },
            { label: "Polls", href: `${base}/community/polls` },
            { label: "Quizzes & trivia", href: `${base}/community/quizzes` },
          ],
        },
        { label: "Elections", href: `${base}/elections`, icon: "vote" },
        { label: "Projects", href: `${base}/projects`, icon: "project" },
      ],
    },
    {
      title: "Money & records",
      items: [
        {
          label: "Finances",
          href: `${base}/finances`,
          icon: "finance",
          badge: "dues",
          children: [
            { label: "Overview", href: `${base}/finances` },
            { label: "My dues", href: `${base}/finances/my-dues` },
            { label: "Dues & levies", href: `${base}/finances/dues` },
            { label: "Payments", href: `${base}/finances/payments` },
            { label: "Expenses", href: `${base}/finances/expenses` },
            { label: "Reports & export", href: `${base}/finances/reports` },
          ],
        },
        {
          label: "Resources",
          href: `${base}/resources`,
          icon: "resources",
          children: [
            { label: "Albums", href: `${base}/resources/albums` },
            { label: "Documents", href: `${base}/resources/documents` },
            { label: "Useful links", href: `${base}/resources/links` },
          ],
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          label: "Manage set",
          href: `${base}/admin`,
          icon: "shield",
          badge: "pending",
          children: [
            { label: "Members", href: `${base}/admin/members` },
            { label: "EXCO", href: `${base}/admin/exco` },
            { label: "Roles & permissions", href: `${base}/admin/roles` },
            { label: "Invites", href: `${base}/admin/invites` },
            { label: "Integrations", href: `${base}/admin/integrations` },
            { label: "Audit log", href: `${base}/admin/audit` },
          ],
        },
        { label: "Settings", href: `${base}/settings`, icon: "settings" },
      ],
    },
  ];
}

export function departmentNavigation(setId: string, departmentId: string) {
  const base = `/s/${setId}/departments/${departmentId}`;
  return [
    { label: "Overview", href: base, icon: "home" as IconName },
    { label: "Members", href: `${base}/members`, icon: "people" as IconName },
    { label: "Channels", href: `${base}/channels`, icon: "chat" as IconName },
    { label: "Announcements", href: `${base}/announcements`, icon: "megaphone" as IconName },
    { label: "Events", href: `${base}/events`, icon: "calendar" as IconName },
    { label: "Dues", href: `${base}/dues`, icon: "wallet" as IconName },
    { label: "Settings", href: `${base}/settings`, icon: "settings" as IconName },
  ];
}
