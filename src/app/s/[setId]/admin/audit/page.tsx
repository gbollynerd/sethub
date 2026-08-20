import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, EmptyState, PageHeader, Table, Td, Tr } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/format";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  if (!can(ws, "audit.view")) redirect(`/s/${setId}`);

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, action, entity_type, entity_label, summary, actor_name, created_at")
    .eq("set_id", setId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.q) query = query.ilike("action", `%${sp.q}%`);

  const { data: entries } = await query;

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Audit log"
        description="Who approved a member, who recorded an expense, who changed a permission — permanently, with a timestamp."
      />

      <form className="card mb-5 flex gap-3 p-4">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Filter by action, e.g. finance" className="field" />
        <button className="btn btn-primary btn-sm shrink-0">Filter</button>
      </form>

      {!entries?.length ? (
        <EmptyState icon="document" title="Nothing logged yet" description="Administrative actions are recorded here as they happen." />
      ) : (
        <Table headers={["When", "Action", "Who", "What", "Detail"]}>
          {entries.map((e) => (
            <Tr key={e.id}>
              <Td className="whitespace-nowrap text-[var(--color-muted)]">
                {formatDateTime(e.created_at)}
                <span className="block text-xs text-[var(--color-subtle)]">{relativeTime(e.created_at)}</span>
              </Td>
              <Td><Badge>{e.action.replace(/\./g, " ")}</Badge></Td>
              <Td className="font-medium">{e.actor_name ?? "System"}</Td>
              <Td className="max-w-[12rem] truncate text-[var(--color-muted)]">
                {e.entity_label ?? e.entity_type ?? "—"}
              </Td>
              <Td className="max-w-[18rem] truncate text-[var(--color-muted)]">{e.summary ?? "—"}</Td>
            </Tr>
          ))}
        </Table>
      )}
    </div>
  );
}
