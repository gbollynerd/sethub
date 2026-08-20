import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader, SectionHeader, Table, Td, Tr } from "@/components/ui";
import { IntegrationManager } from "@/components/admin/integration-manager";
import { BroadcastComposer } from "@/components/admin/broadcast-composer";
import { IconGlobe, IconWhatsapp } from "@/components/icons";
import { formatDateTime, relativeTime, titleCase } from "@/lib/format";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const canManage = can(ws, "integrations.manage");
  const canBroadcast = can(ws, "broadcast.send");
  if (!canManage && !canBroadcast) redirect(`/s/${setId}`);

  const [{ data: integrations }, { data: deliveries }, { data: broadcasts }] = await Promise.all([
    supabase
      .from("integrations")
      .select("id, provider, label, external_name, external_id, invite_url, direction, events, is_active, last_sync_at, last_error, department_id")
      .eq("set_id", setId)
      .order("created_at", { ascending: false }),
    supabase
      .from("integration_deliveries")
      .select("id, event_kind, status, attempts, rendered_text, created_at, error")
      .eq("set_id", setId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("broadcasts")
      .select("id, title, body, channels, audience, status, recipient_count, delivered_count, sent_at, created_at")
      .eq("set_id", setId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Integrations & broadcasts"
        description="Keep the WhatsApp group — just stop losing things in it. Announcements, events, election openings and dues deadlines are pushed out automatically."
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          {canManage ? (
            <Card>
              <SectionHeader
                title="Connected channels"
                hint="WhatsApp, Telegram, Slack, email lists, SMS gateways or a plain webhook"
              />
              <IntegrationManager
                setId={setId}
                departments={ws.departments}
                existing={(integrations ?? []).map((i) => ({
                  id: i.id as string,
                  provider: i.provider as string,
                  label: i.label as string,
                  externalName: i.external_name as string | null,
                  externalId: i.external_id as string | null,
                  inviteUrl: i.invite_url as string | null,
                  direction: i.direction as string,
                  events: (i.events ?? []) as string[],
                  isActive: i.is_active as boolean,
                  lastSyncAt: i.last_sync_at as string | null,
                  lastError: i.last_error as string | null,
                  departmentId: i.department_id as string | null,
                }))}
              />
            </Card>
          ) : null}

          <Card>
            <SectionHeader title="Outbound queue" hint="What SetHub has pushed, or is about to" />
            {deliveries?.length ? (
              <Table headers={["Event", "Message", "Status", "When"]} dense>
                {deliveries.map((d) => (
                  <Tr key={d.id}>
                    <Td className="whitespace-nowrap font-medium">{d.event_kind.replace(/\./g, " ")}</Td>
                    <Td className="max-w-[18rem] truncate text-[var(--color-muted)]">
                      {d.rendered_text?.replace(/\*/g, "") ?? "—"}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          d.status === "sent" ? "positive"
                          : d.status === "failed" ? "critical"
                          : d.status === "skipped" ? "default" : "caution"
                        }
                      >
                        {titleCase(d.status)}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-[var(--color-subtle)]">{relativeTime(d.created_at)}</Td>
                  </Tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                icon="send"
                title="Nothing queued"
                description="Post an announcement and it will appear here on its way to your connected channels."
              />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {canBroadcast ? (
            <Card>
              <SectionHeader
                title="Broadcast a message"
                hint="Push something out without creating a formal announcement"
              />
              <BroadcastComposer
                setId={setId}
                departments={ws.departments}
                integrations={(integrations ?? [])
                  .filter((i) => i.is_active)
                  .map((i) => ({ id: i.id as string, label: i.label as string, provider: i.provider as string }))}
              />
            </Card>
          ) : null}

          <Card>
            <SectionHeader title="Recent broadcasts" />
            {broadcasts?.length ? (
              <ul className="space-y-3">
                {broadcasts.map((b) => (
                  <li key={b.id} className="border-b border-[var(--color-line)] pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-semibold">{b.title ?? "Broadcast"}</p>
                      <Badge tone={b.status === "sent" ? "positive" : b.status === "failed" ? "critical" : "caution"}>
                        {titleCase(b.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{b.body}</p>
                    <p className="mt-1.5 text-xs text-[var(--color-subtle)]">
                      {(b.channels ?? []).join(", ")} · {titleCase(String(b.audience))} ·{" "}
                      {b.sent_at ? formatDateTime(b.sent_at) : relativeTime(b.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--color-subtle)]">
                No broadcasts sent yet.
              </p>
            )}
          </Card>

          <Card className="!bg-[var(--color-brand-soft)] !border-[var(--color-brand)]/25">
            <p className="flex items-center gap-2 font-display text-sm font-semibold text-[var(--color-brand-deep)]">
              <IconWhatsapp size={17} /> Connecting WhatsApp
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-brand-dark)]">
              SetHub sends through the WhatsApp Business Cloud API. Add your phone number ID and
              token to the deployment environment, then register the group here. If you would rather
              not connect an API, save the group invite link instead — new members get it after they
              join, and announcements stay copy-pasteable.
            </p>
            <p className="mt-3 flex items-center gap-2 text-xs text-[var(--color-brand-dark)]">
              <IconGlobe size={14} /> Telegram, Slack, SMS and generic webhooks work the same way.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
