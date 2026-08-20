import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { IconHash, IconLock, IconPlus } from "@/components/icons";
import { slugify } from "@/lib/slug";
import { first } from "@/lib/rows";

export const metadata = { title: "Groups & committees" };
export const dynamic = "force-dynamic";

const KINDS = [
  { value: "committee", label: "Committee" },
  { value: "interest", label: "Interest group" },
  { value: "task_force", label: "Task force" },
  { value: "cohort", label: "Cohort" },
  { value: "chapter", label: "Chapter" },
  { value: "other", label: "Other" },
];

export default async function GroupsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const canManage = can(ws, "groups.create");

  const [{ data: groups }, { data: mine }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, slug, kind, description, color, visibility, member_count, channel_id, department_id, set_departments ( name )")
      .eq("set_id", setId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("group_members")
      .select("group_id, role")
      .eq("membership_id", ws.membershipId)
      .eq("status", "active"),
  ]);

  const myGroups = new Map((mine ?? []).map((g) => [g.group_id as string, g.role as string]));

  async function createGroup(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "groups.create")) return;

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    await supabase.from("groups").insert({
      set_id: setId,
      name,
      slug: slugify(name),
      kind: String(formData.get("kind") ?? "committee"),
      description: String(formData.get("description") ?? "").trim() || null,
      visibility: formData.get("private") ? "private" : "public",
      auto_channel: true,
      created_by: workspace.userId,
    });

    redirect(`/s/${setId}/community/groups`);
  }

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Groups & committees"
        description="Electoral, welfare, project, reunion — every committee gets a home, a member list and, if you want, a private channel."
      />

      {!groups?.length ? (
        <EmptyState
          icon="community"
          title="No groups yet"
          description="Committees keep the work of the set organised. Create the first one below."
        />
      ) : (
        <div className="stagger mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const role = myGroups.get(g.id);
            const dept = first(g.set_departments) as { name: string } | null;
            return (
              <article key={g.id} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] font-display text-sm font-bold text-white"
                    style={{ background: g.color ?? "var(--color-brand)" }}
                  >
                    {g.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[0.98rem] font-semibold">{g.name}</h2>
                    <p className="text-sm capitalize text-[var(--color-muted)]">{g.kind.replace(/_/g, " ")}</p>
                  </div>
                  {g.visibility === "private" ? <IconLock size={16} className="shrink-0 text-[var(--color-subtle)]" /> : null}
                </div>

                {g.description ? (
                  <p className="mt-3 line-clamp-2 flex-1 text-sm text-[var(--color-muted)]">{g.description}</p>
                ) : <div className="flex-1" />}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge icon="people">{g.member_count} members</Badge>
                  {dept ? <Badge tone="plum">{dept.name}</Badge> : null}
                  {role ? <Badge tone="brand">{role}</Badge> : null}
                </div>

                {g.channel_id ? (
                  <Link href={`/s/${setId}/chat/${g.channel_id}`} className="btn btn-soft btn-sm mt-4 w-full">
                    <IconHash size={14} /> Open channel
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {canManage ? (
        <section>
          <SectionHeader title="Create a group" hint="A private channel is created alongside it automatically" />
          <form action={createGroup} className="card grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="name">Group name</label>
              <input id="name" name="name" required className="field" placeholder="Electoral Committee" />
            </div>
            <div>
              <label className="field-label" htmlFor="kind">Type</label>
              <select id="kind" name="kind" className="field">
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor="description">Purpose</label>
              <input id="description" name="description" className="field" placeholder="Runs the 2026 EXCO election end to end" />
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm sm:col-span-2">
              <input type="checkbox" name="private" className="h-4 w-4 accent-[var(--color-brand)]" />
              Private — only invited members can see it
            </label>
            <button className="btn btn-primary sm:col-span-2">
              <IconPlus size={16} /> Create group
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
