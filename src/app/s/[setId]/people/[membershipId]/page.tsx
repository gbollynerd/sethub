import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, Card, EmptyState, SectionHeader } from "@/components/ui";
import { IconBriefcase, IconGlobe, IconLink, IconPin, IconTrophy } from "@/components/icons";
import { first } from "@/lib/rows";
import { formatDate, titleCase } from "@/lib/format";

export const metadata = { title: "Member profile" };

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ setId: string; membershipId: string }>;
}) {
  const { setId, membershipId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: m } = await supabase
    .from("set_memberships")
    .select(
      `id, user_id, nickname, school_name_used, student_id, course, class_arm, admission_year,
       graduation_year, was_prefect, prefect_position, prefect_year, hostel_room, clubs, fun_fact,
       joined_at, is_founder, verification, status,
       profiles!set_memberships_user_id_fkey ( id, display_name, avatar_url, bio, profession, employer, employment, city, state,
                  country, linkedin_url, x_url, instagram_url, website_url ),
       set_departments ( id, name, color ),
       institution_houses ( id, name, color ),
       institution_hostels ( id, name )`,
    )
    .eq("id", membershipId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!m) notFound();

  const p = first(m.profiles) as {
    id: string; display_name: string | null; avatar_url: string | null; bio: string | null;
    profession: string | null; employer: string | null; employment: string | null;
    city: string | null; state: string | null; country: string | null;
    linkedin_url: string | null; x_url: string | null; instagram_url: string | null;
    website_url: string | null;
  } | null;

  const dept = first(m.set_departments) as { id: string; name: string; color: string | null } | null;
  const house = first(m.institution_houses) as { name: string; color: string | null } | null;
  const hostel = first(m.institution_hostels) as { name: string } | null;

  const [{ data: businesses }, { data: roles }, { data: groups }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, category, description, logo_url, website, phone, whatsapp, city, state")
      .eq("owner_id", m.user_id)
      .eq("is_published", true),
    supabase
      .from("member_roles")
      .select("id, set_roles ( name, color, department_id )")
      .eq("membership_id", membershipId)
      .eq("status", "accepted"),
    supabase
      .from("group_members")
      .select("role, groups ( id, name )")
      .eq("membership_id", membershipId)
      .eq("status", "active"),
  ]);

  const isSelf = m.user_id === ws.userId;
  const showStudentId = can(ws, "members.view_student_id") || isSelf;
  const membershipDetails = [dept?.name, house?.name, hostel?.name].filter(Boolean);

  return (
    <div className="mx-auto max-w-[62rem]">
      <Link href={`/s/${setId}/people`} className="btn btn-quiet btn-sm mb-4">← Back to people</Link>

      <div className="card overflow-hidden p-0">
        <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[var(--color-brand-deep)] to-[var(--color-brand)] sm:h-36">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        </div>
        <div className="relative px-6 pb-6 sm:px-8">
          <div className="-mt-10">
            <div className="inline-flex rounded-full bg-[var(--color-surface)] p-1">
              <Avatar name={p?.display_name} src={p?.avatar_url} size={80} />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="t-h2 leading-tight">{p?.display_name ?? "Member"}</h1>
              <p className="mt-1 text-[var(--color-muted)]">
                {m.nickname ? `“${m.nickname}” · ` : ""}
                {p?.profession ?? m.course ?? "Member of this set"}
              </p>
            </div>
            {isSelf ? (
              <Link href={`/s/${setId}/settings/profile`} className="btn btn-ghost btn-sm shrink-0">Edit my set profile</Link>
            ) : null}
          </div>

          {membershipDetails.length ? (
            <div className="mt-6">
              <p className="t-eyebrow mb-1.5">Membership</p>
              <p className="text-sm font-medium text-[var(--color-ink-2)]">{membershipDetails.join(" · ")}</p>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="t-eyebrow mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {m.was_prefect ? (
                <Badge tone="caution" icon="trophy">
                  {m.prefect_position ?? "Prefect"}{m.prefect_year ? ` · ${m.prefect_year}` : ""}
                </Badge>
              ) : null}
              {m.is_founder ? <Badge tone="brand">Founding member</Badge> : null}
              {m.verification === "verified" ? <Badge tone="positive" icon="check">Verified</Badge> : null}
              {(roles ?? []).map((r) => {
                const role = first(r.set_roles) as { name: string; color: string | null; department_id: string | null } | null;
                if (!role || role.name === "Member" || role.name === "Department Member") return null;
                return <Badge key={r.id} tone="brand" icon="shield">{role.name}</Badge>;
              })}
            </div>
          </div>

          {p?.bio ? (
            <p className="mt-5 max-w-2xl leading-relaxed text-[var(--color-ink-2)]">{p.bio}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Card>
            <SectionHeader title={`At ${ws.set.institution.short_name ?? ws.set.institution.name}`} />
            <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <Detail label="Set" value={ws.set.name} />
              <Detail label="Graduated" value={m.graduation_year ? String(m.graduation_year) : "—"} />
              {m.admission_year ? <Detail label="Admitted" value={String(m.admission_year)} /> : null}
              {m.course ? <Detail label="Course" value={m.course} /> : null}
              {m.class_arm ? <Detail label="Class" value={m.class_arm} /> : null}
              {dept ? <Detail label="Department" value={dept.name} /> : null}
              {house ? <Detail label="House" value={house.name} /> : null}
              {hostel ? (
                <Detail label="Hostel" value={`${hostel.name}${m.hostel_room ? ` · ${m.hostel_room}` : ""}`} />
              ) : null}
              {m.school_name_used ? <Detail label="Known in school as" value={m.school_name_used} /> : null}
              {showStudentId && m.student_id ? (
                <Detail label="Student ID" value={m.student_id} note="Administrators only" />
              ) : null}
              <Detail label="Joined SetHub" value={formatDate(m.joined_at)} />
            </dl>
            {m.clubs?.length ? (
              <div className="mt-5 border-t border-[var(--color-line)] pt-4">
                <p className="field-label">Clubs & societies</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.clubs.map((c: string) => <Badge key={c}>{c}</Badge>)}
                </div>
              </div>
            ) : null}
            {m.fun_fact ? (
              <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-brand-dark)]">
                  One thing about them
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-brand-deep)]">{m.fun_fact}</p>
              </div>
            ) : null}
          </Card>

          {businesses?.length ? (
            <Card>
              <SectionHeader title="Their business" hint="Support an alumnus" />
              <ul className="space-y-3">
                {businesses.map((b) => (
                  <li key={b.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
                    <div className="flex items-start gap-3.5">
                      <Avatar name={b.name} src={b.logo_url} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[0.96rem] font-semibold">{b.name}</p>
                        {b.category ? <p className="text-sm text-[var(--color-muted)]">{b.category}</p> : null}
                        {b.description ? (
                          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-[var(--color-ink-2)]">
                            {b.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {b.website ? (
                            <a href={b.website} target="_blank" rel="noreferrer" className="btn btn-soft btn-sm">
                              <IconGlobe size={14} /> Website
                            </a>
                          ) : null}
                          {b.whatsapp ? (
                            <a
                              href={`https://wa.me/${b.whatsapp.replace(/\D/g, "")}`}
                              target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"
                            >
                              <IconLink size={14} /> WhatsApp
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <SectionHeader title="Today" />
            <dl className="space-y-3.5">
              {p?.employment ? <Detail label="Status" value={titleCase(p.employment)} /> : null}
              {p?.profession ? <Detail label="Profession" value={p.profession} /> : null}
              {p?.employer ? <Detail label="Organisation" value={p.employer} /> : null}
              {p?.city || p?.state ? (
                <Detail label="Based in" value={[p?.city, p?.state, p?.country].filter(Boolean).join(", ")} />
              ) : null}
            </dl>
            {(p?.linkedin_url || p?.x_url || p?.instagram_url || p?.website_url) ? (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-4">
                {[
                  ["LinkedIn", p?.linkedin_url],
                  ["X", p?.x_url],
                  ["Instagram", p?.instagram_url],
                  ["Website", p?.website_url],
                ].map(([label, url]) =>
                  url ? (
                    <a key={label} href={url} target="_blank" rel="noreferrer" className="chip hover:border-[var(--color-ink)]">
                      <IconLink size={13} /> {label}
                    </a>
                  ) : null,
                )}
              </div>
            ) : null}
          </Card>

          {groups?.length ? (
            <Card>
              <SectionHeader title="Committees" />
              <ul className="space-y-2">
                {groups.map((g, i) => {
                  const grp = first(g.groups) as { id: string; name: string } | null;
                  if (!grp) return null;
                  return (
                    <li key={i}>
                      <Link
                        href={`/s/${setId}/community/groups/${grp.id}`}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3.5 py-2.5 text-sm transition hover:border-[var(--color-line-strong)]"
                      >
                        <span className="truncate font-medium">{grp.name}</span>
                        <Badge>{titleCase(g.role)}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {!isSelf ? (
            <Card>
              <p className="font-display text-sm font-semibold">Find more like them</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dept ? (
                  <Link href={`/s/${setId}/people?department=${dept.id}`} className="chip hover:border-[var(--color-ink)]">
                    <IconPin size={13} /> Same department
                  </Link>
                ) : null}
                {m.was_prefect ? (
                  <Link href={`/s/${setId}/people?prefect=1`} className="chip hover:border-[var(--color-ink)]">
                    <IconTrophy size={13} /> Former prefects
                  </Link>
                ) : null}
                <Link href={`/s/${setId}/people/businesses`} className="chip hover:border-[var(--color-ink)]">
                  <IconBriefcase size={13} /> Alumni businesses
                </Link>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {m.status !== "active" ? (
        <div className="mt-6">
          <EmptyState
            icon="lock"
            title="This membership is not active"
            description="An administrator has to approve or restore it before this person appears in the directory."
          />
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[var(--color-ink)]">{value}</dd>
      {note ? <p className="text-[0.68rem] text-[var(--color-subtle)]">{note}</p> : null}
    </div>
  );
}
