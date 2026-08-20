import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { SectionHeader } from "@/components/ui";
import { EventList } from "@/components/lists";
import { IconPlus } from "@/components/icons";

export const metadata = { title: "Department events" };
export const dynamic = "force-dynamic";

export default async function DepartmentEventsPage({
  params,
}: {
  params: Promise<{ setId: string; departmentId: string }>;
}) {
  const { setId, departmentId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const canCreate =
    ws.departmentAdminIds.includes(departmentId) || ws.permissions.includes("events.create") || ws.isOwner;

  const now = new Date().toISOString();
  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, description, starts_at, ends_at, location_name, is_virtual, category, going_count")
      .eq("department_id", departmentId)
      .gte("starts_at", now)
      .order("starts_at")
      .limit(30),
    supabase
      .from("events")
      .select("id, title, description, starts_at, ends_at, location_name, is_virtual, category, going_count")
      .eq("department_id", departmentId)
      .lt("starts_at", now)
      .order("starts_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-end justify-between gap-4">
          <SectionHeader title="Upcoming" hint="Department-only events" />
          {canCreate ? (
            <Link href={`/s/${setId}/events/new?department=${departmentId}`} className="btn btn-primary btn-sm shrink-0">
              <IconPlus size={15} /> New event
            </Link>
          ) : null}
        </div>
        <EventList setId={setId} items={upcoming ?? []} />
      </div>

      {past?.length ? (
        <div>
          <SectionHeader title="Past events" />
          <EventList setId={setId} items={past} />
        </div>
      ) : null}
    </div>
  );
}
