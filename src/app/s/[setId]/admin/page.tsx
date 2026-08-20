import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace, isAdmin } from "@/lib/workspace";
import { Badge, Card, PageHeader, SectionHeader, StatTile } from "@/components/ui";
import { Icon, IconArrow } from "@/components/icons";
import { relativeTime } from "@/lib/format";

export const metadata = { title: "Set administration" };
export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  if (!isAdmin(ws)) redirect(`/s/${setId}`);

  const supabase = await createClient();

  const [members, pending, exco, channels, invites, audit] = await Promise.all([
    supabase.from("set_memberships").select("id", { count: "exact", head: true }).eq("set_id", setId).eq("status", "active"),
    supabase.from("set_memberships").select("id", { count: "exact", head: true }).eq("set_id", setId).eq("status", "pending"),
    supabase.from("exco_appointments").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("channels").select("id", { count: "exact", head: true }).eq("set_id", setId).is("archived_at", null),
    supabase.from("invites").select("id", { count: "exact", head: true }).eq("set_id", setId).is("revoked_at", null),
    supabase
      .from("audit_log")
      .select("id, action, entity_label, summary, actor_name, created_at")
      .eq("set_id", setId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const cards = [
    { href: `/s/${setId}/admin/members`, icon: "people", title: "Members", body: "Approve requests, edit set profiles, suspend or remove members." },
    { href: `/s/${setId}/admin/exco`, icon: "trophy", title: "EXCO", body: "Appoint the executive, manage terms and keep the history of past administrations." },
    { href: `/s/${setId}/admin/roles`, icon: "shield", title: "Roles & permissions", body: "Decide exactly what each officer can do — down to a single permission." },
    { href: `/s/${setId}/admin/invites`, icon: "user-plus", title: "Invite links", body: "Shareable links, short codes and QR codes for WhatsApp, email or a printed flyer." },
    { href: `/s/${setId}/admin/integrations`, icon: "whatsapp", title: "Integrations", body: "Push announcements and events into your WhatsApp group, Telegram, SMS or a webhook." },
    { href: `/s/${setId}/admin/audit`, icon: "document", title: "Audit log", body: "Every administrative action, permanently recorded and searchable." },
    { href: `/s/${setId}/settings`, icon: "settings", title: "Set settings", body: "Name, branding, join policy, departments and ownership transfer." },
    { href: `/s/${setId}/departments`, icon: "department", title: "Departments", body: "Create the department sub-communities and appoint their administrators." },
  ];

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.institution.name}
        title="Set administration"
        description="Everything that keeps this community running properly — and a permanent record of who changed what."
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active members" value={members.count ?? 0} icon="people" tone="brand" href={`/s/${setId}/admin/members`} />
        <StatTile
          label="Pending approvals" value={pending.count ?? 0} icon="clock"
          tone={(pending.count ?? 0) > 0 ? "critical" : "positive"}
          href={`/s/${setId}/admin/members?status=pending`}
          sub={(pending.count ?? 0) > 0 ? "Needs your attention" : "All clear"}
        />
        <StatTile label="Channels" value={channels.count ?? 0} icon="chat" tone="info" href={`/s/${setId}/chat`} />
        <StatTile label="Live invite links" value={invites.count ?? 0} icon="link" tone="caution" href={`/s/${setId}/admin/invites`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionHeader title="Manage" />
          <div className="stagger grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <Link key={c.href} href={c.href} className="card card-hover group flex gap-3.5 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface-2)] text-[var(--color-brand-dark)]">
                  <Icon name={c.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-[0.96rem] font-semibold">{c.title}</span>
                    <IconArrow size={14} className="text-[var(--color-subtle)] transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-[var(--color-muted)]">{c.body}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <Card>
          <SectionHeader title="Recent admin activity" href={`/s/${setId}/admin/audit`} linkLabel="Full log" />
          {audit.data?.length ? (
            <ul className="space-y-3">
              {audit.data.map((a) => (
                <li key={a.id} className="border-b border-[var(--color-line)] pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{a.action.replace(/\./g, " ")}</Badge>
                    <span className="text-xs text-[var(--color-subtle)]">{relativeTime(a.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm">
                    <span className="font-semibold">{a.actor_name ?? "Someone"}</span>
                    {a.entity_label ? ` · ${a.entity_label}` : ""}
                  </p>
                  {a.summary ? (
                    <p className="text-xs text-[var(--color-muted)]">{a.summary}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--color-subtle)]">
              Nothing logged yet. Administrative actions appear here as they happen.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
