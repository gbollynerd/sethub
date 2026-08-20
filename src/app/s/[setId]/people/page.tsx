import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui";
import { IconBriefcase, IconSearch, IconTrophy } from "@/components/icons";
import { first } from "@/lib/rows";

export const metadata = { title: "People" };

interface Search {
  q?: string;
  department?: string;
  house?: string;
  hostel?: string;
  prefect?: string;
  employment?: string;
  view?: string;
}

export default async function PeoplePage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<Search>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  let query = supabase
    .from("set_memberships")
    .select(
      `id, user_id, nickname, course, class_arm, was_prefect, prefect_position, joined_at,
       is_founder, verification, department_id, house_id, hostel_id,
       profiles!inner ( id, display_name, avatar_url, profession, employment, city, state ),
       set_departments ( id, name, color ),
       institution_houses ( id, name, color ),
       institution_hostels ( id, name )`,
    )
    .eq("set_id", setId)
    .eq("status", "active")
    .order("joined_at", { ascending: false })
    .limit(200);

  if (sp.department) query = query.eq("department_id", sp.department);
  if (sp.house) query = query.eq("house_id", sp.house);
  if (sp.hostel) query = query.eq("hostel_id", sp.hostel);
  if (sp.prefect === "1") query = query.eq("was_prefect", true);
  if (sp.employment) query = query.eq("profiles.employment", sp.employment);
  if (sp.q) query = query.or(`nickname.ilike.%${sp.q}%,course.ilike.%${sp.q}%`);

  const [{ data: members }, { data: houses }, { data: hostels }] = await Promise.all([
    query,
    ws.set.institution.has_houses
      ? supabase.from("institution_houses").select("id, name").eq("institution_id", ws.set.institution.id).order("sort_order")
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    ws.set.institution.has_hostels
      ? supabase.from("institution_hostels").select("id, name").eq("institution_id", ws.set.institution.id).order("sort_order")
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  const rows = (members ?? []).filter((m) => {
    if (!sp.q) return true;
    const name = (first(m.profiles) as { display_name?: string } | null)?.display_name ?? "";
    return (
      name.toLowerCase().includes(sp.q.toLowerCase()) ||
      (m.nickname ?? "").toLowerCase().includes(sp.q.toLowerCase()) ||
      (m.course ?? "").toLowerCase().includes(sp.q.toLowerCase())
    );
  });

  const chips: Array<{ label: string; href: string; active: boolean }> = [
    { label: "Everyone", href: `/s/${setId}/people`, active: !sp.prefect && !sp.department && !sp.house && !sp.hostel && !sp.employment },
    ...(ws.set.institution.has_prefects
      ? [{ label: "Former prefects", href: `/s/${setId}/people?prefect=1`, active: sp.prefect === "1" }]
      : []),
    { label: "Business owners", href: `/s/${setId}/people?employment=business_owner`, active: sp.employment === "business_owner" },
    { label: "Self-employed", href: `/s/${setId}/people?employment=self_employed`, active: sp.employment === "self_employed" },
  ];

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={`${ws.set.name} · ${ws.set.member_count} members`}
        title="People"
        description="Everyone in this set. Filter by department, house, hostel or what they do now — all scoped to this community only."
        action={
          <>
            <Link href={`/s/${setId}/people/businesses`} className="btn btn-ghost btn-sm">
              <IconBriefcase size={15} /> Businesses
            </Link>
            <Link href={`/s/${setId}/admin/exco`} className="btn btn-ghost btn-sm">
              <IconTrophy size={15} /> EXCO
            </Link>
          </>
        }
      />

      {/* Filters */}
      <form className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <IconSearch size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Search by name, nickname or course…" className="field pl-11" />
        </div>
        {ws.departments.length ? (
          <select name="department" defaultValue={sp.department ?? ""} className="field sm:w-52" aria-label="Department">
            <option value="">All departments</option>
            {ws.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) : null}
        {houses?.length ? (
          <select name="house" defaultValue={sp.house ?? ""} className="field sm:w-40" aria-label="House">
            <option value="">All houses</option>
            {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        ) : null}
        {hostels?.length ? (
          <select name="hostel" defaultValue={sp.hostel ?? ""} className="field sm:w-40" aria-label="Hostel">
            <option value="">All hostels</option>
            {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        ) : null}
        <button className="btn btn-primary btn-sm">Apply</button>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {chips.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`chip transition ${c.active ? "chip-brand" : "hover:border-[var(--color-ink)]"}`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="people"
          title="Nobody matched that"
          description="Try a different filter, or invite more classmates to join the set."
          action={
            can(ws, "members.invite") ? (
              <Link href={`/s/${setId}/admin/invites`} className="btn btn-primary btn-sm">Create an invite link</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((m) => {
            const p = first(m.profiles) as {
              display_name: string | null; avatar_url: string | null;
              profession: string | null; employment: string | null;
              city: string | null; state: string | null;
            } | null;
            const dept = first(m.set_departments) as { name: string; color: string | null } | null;
            const house = first(m.institution_houses) as { name: string; color: string | null } | null;
            const hostel = first(m.institution_hostels) as { name: string } | null;

            return (
              <Link key={m.id} href={`/s/${setId}/people/${m.id}`} className="card card-hover flex gap-4 p-5">
                <Avatar name={p?.display_name} src={p?.avatar_url} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[0.98rem] font-semibold leading-snug">
                    {p?.display_name ?? "Member"}
                  </p>
                  {m.nickname ? (
                    <p className="truncate text-sm text-[var(--color-brand-dark)]">“{m.nickname}”</p>
                  ) : null}
                  <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
                    {p?.profession ?? m.course ?? m.class_arm ?? "Member of this set"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {dept ? <Badge tone="plum">{dept.name}</Badge> : null}
                    {house ? <Badge>{house.name}</Badge> : null}
                    {hostel ? <Badge>{hostel.name}</Badge> : null}
                    {m.was_prefect ? (
                      <Badge tone="caution" icon="trophy">{m.prefect_position ?? "Prefect"}</Badge>
                    ) : null}
                    {p?.employment === "business_owner" ? (
                      <Badge tone="positive" icon="briefcase">Business owner</Badge>
                    ) : null}
                    {m.is_founder ? <Badge tone="brand">Founder</Badge> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {rows.length >= 200 ? (
        <p className="mt-6 text-center text-sm text-[var(--color-subtle)]">
          Showing the first 200 members — narrow the search to see more.
        </p>
      ) : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
