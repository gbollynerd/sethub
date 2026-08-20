/** Shared domain types. Mirrors the SQL schema in supabase/migrations. */

export type InstitutionType =
  | "secondary_school"
  | "university"
  | "polytechnic"
  | "technical_school"
  | "college_of_education"
  | "vocational"
  | "primary_school"
  | "seminary"
  | "other";

export type MembershipStatus =
  | "pending"
  | "active"
  | "suspended"
  | "rejected"
  | "left"
  | "removed";

export interface Community {
  membership_id: string;
  set_id: string;
  set_name: string;
  set_slug: string;
  graduation_year: number;
  institution_id: string;
  institution_name: string;
  institution_short: string;
  institution_type: InstitutionType;
  logo_url: string | null;
  member_count: number;
  status: MembershipStatus;
  is_owner: boolean;
  departments_enabled: boolean;
  department_id: string | null;
  department_name: string | null;
  unread_count: number;
  outstanding: number;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  type: InstitutionType;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  has_houses: boolean;
  has_hostels: boolean;
  has_departments: boolean;
  has_faculties: boolean;
  has_prefects: boolean;
}

export interface SetDepartment {
  id: string;
  set_id: string;
  name: string;
  slug: string;
  short_name: string | null;
  description: string | null;
  color: string | null;
  member_count: number;
  join_policy: string;
  is_visible_to_set: boolean;
  faculty_id: string | null;
}

export interface DashboardData {
  member_count: number;
  pending_members: number;
  new_members_30d: number;
  department_count: number;
  my_outstanding: number;
  balance: number;
  total_income: number;
  total_expense: number;
  outstanding_total: number;
  collection_rate: number;
  unread_messages: number;
  upcoming_events: Array<{
    id: string;
    title: string;
    starts_at: string;
    location_name: string | null;
    category: string;
    going_count: number;
    is_virtual: boolean;
  }>;
  calendar: Array<{
    source_type: string;
    source_id: string;
    title: string;
    subtitle: string | null;
    starts_at: string;
    color: string | null;
    icon: string | null;
    href: string | null;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    summary: string | null;
    priority: string;
    publish_at: string;
    is_pinned: boolean;
  }>;
  active_elections: Array<{
    id: string;
    title: string;
    stage: string;
    voting_opens_at: string | null;
    voting_closes_at: string | null;
    has_voted: boolean;
  }>;
  open_polls: Array<{
    id: string;
    question: string;
    closes_at: string | null;
    vote_count: number;
    has_voted: boolean;
  }>;
  projects: Array<{
    id: string;
    title: string;
    status: string;
    estimated_cost: number;
    raised_amount: number;
    currency: string;
    funded_pct: number;
  }>;
  activity: Array<{
    verb: string;
    object_label: string | null;
    href: string | null;
    icon: string | null;
    created_at: string;
    actor: string | null;
    avatar_url: string | null;
  }>;
}

export interface MemberRow {
  id: string;
  user_id: string;
  status: MembershipStatus;
  nickname: string | null;
  course: string | null;
  class_arm: string | null;
  was_prefect: boolean;
  prefect_position: string | null;
  department_id: string | null;
  house_id: string | null;
  hostel_id: string | null;
  joined_at: string;
  is_founder: boolean;
  verification: string;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    profession: string | null;
    employment: string | null;
    city: string | null;
    state: string | null;
  } | null;
  set_departments: { id: string; name: string; color: string | null } | null;
  institution_houses: { id: string; name: string; color: string | null } | null;
  institution_hostels: { id: string; name: string } | null;
}

export interface ChannelRow {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  visibility: "public" | "private";
  is_default: boolean;
  is_announcement: boolean;
  department_id: string | null;
  group_id: string | null;
  message_count: number;
  member_count: number;
  last_message_at: string | null;
}

export interface MessageRow {
  id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  is_pinned: boolean;
  reaction_count: number;
  reply_count: number;
  author_id: string | null;
  membership_id: string | null;
  kind: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

export const PERMISSION_LABELS: Record<string, string> = {
  "members.view": "View members",
  "members.invite": "Invite members",
  "members.approve": "Approve members",
  "finance.view": "View finances",
  "finance.export": "Export finances",
  "announcements.create": "Post announcements",
  "events.create": "Create events",
  "elections.create": "Create elections",
  "projects.create": "Create projects",
};
