import Link from "next/link";
import { redirect } from "next/navigation";
import { getCommunities, getProfile, getUser } from "@/lib/workspace";
import { Logo } from "@/components/brand";
import { Avatar, Badge, EmptyState } from "@/components/ui";
import { IconArrow, IconPlus, IconUserPlus, IconWallet, IconPeople } from "@/components/icons";
import { greeting, money } from "@/lib/format";
import { signOut } from "@/app/(auth)/actions";

export const metadata = { title: "Your communities" };

const TYPE_LABEL: Record<string, string> = {
  secondary_school: "Secondary school",
  primary_school: "Primary school",
  university: "University",
  polytechnic: "Polytechnic",
  technical_school: "Technical school",
  college_of_education: "College of education",
  vocational: "Vocational institution",
  seminary: "Seminary",
  other: "Institution",
};

export default async function CommunitiesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [communities, profile] = await Promise.all([getCommunities(), getProfile()]);

  // A single active community goes straight in — no lobby for most people.
  const active = communities.filter((c) => c.status === "active");
  if (active.length === 1 && communities.length === 1) redirect(`/s/${active[0].set_id}`);
  if (communities.length === 0) redirect("/onboarding");

  const firstName = profile?.first_name ?? "there";

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto flex max-w-[62rem] items-center justify-between px-5 py-4 sm:px-8">
          <Logo href="/app" />
          <div className="flex items-center gap-3">
            <Avatar name={profile?.display_name} src={profile?.avatar_url} size={34} />
            <form action={signOut}>
              <button className="btn btn-quiet btn-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[62rem] px-5 py-12 sm:px-8 sm:py-16">
        <div className="animate-rise">
          <p className="t-eyebrow">{greeting()}</p>
          <h1 className="t-h1 mt-2">{firstName}, where are you headed?</h1>
          <p className="t-lead mt-2.5 max-w-xl">
            Each community below is its own private workspace. Nothing crosses between them —
            except school-wide projects, which belong to the institution.
          </p>
        </div>

        <div className="stagger mt-10 grid gap-4 sm:grid-cols-2">
          {communities.map((c) => {
            const pending = c.status === "pending";
            return (
              <Link
                key={c.set_id}
                href={pending ? `/app/pending/${c.set_id}` : `/s/${c.set_id}`}
                className="card card-hover group flex flex-col p-6"
              >
                <div className="flex items-start gap-4">
                  <Avatar name={c.institution_short} src={c.logo_url} size={52} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[1.08rem] font-semibold leading-snug">
                      {c.institution_name}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
                      {c.set_name}
                      {c.department_name ? ` · ${c.department_name}` : ""}
                    </p>
                  </div>
                  <IconArrow
                    size={18}
                    className="mt-1 shrink-0 text-[var(--color-subtle)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-brand)]"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge>{TYPE_LABEL[c.institution_type] ?? "Institution"}</Badge>
                  <Badge icon="people">{c.member_count} members</Badge>
                  {c.is_owner ? <Badge tone="plum" icon="shield">Owner</Badge> : null}
                  {pending ? <Badge tone="caution" icon="clock">Awaiting approval</Badge> : null}
                </div>

                {!pending ? (
                  <div className="mt-5 flex items-center gap-5 border-t border-[var(--color-line)] pt-4 text-sm">
                    <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
                      <IconPeople size={15} />
                      {c.unread_count > 0 ? (
                        <strong className="text-[var(--color-ink)]">{c.unread_count} new messages</strong>
                      ) : (
                        "No new messages"
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
                      <IconWallet size={15} />
                      {Number(c.outstanding) > 0 ? (
                        <strong className="text-[var(--color-caution)]">{money(c.outstanding)} due</strong>
                      ) : (
                        "Paid up"
                      )}
                    </span>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>

        {communities.length === 0 ? (
          <EmptyState
            icon="school"
            title="You have not joined a set yet"
            description="Find your school, pick your graduating year, and you are in."
            action={<Link href="/onboarding" className="btn btn-primary">Find my school</Link>}
          />
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/onboarding/join" className="card card-hover flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
              <IconUserPlus size={20} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold">Join another set</p>
              <p className="text-xs text-[var(--color-muted)]">
                Secondary school, university, polytechnic — add them all.
              </p>
            </div>
          </Link>
          <Link href="/onboarding/create" className="card card-hover flex items-center gap-4 p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-plum-soft)] text-[var(--color-plum)]">
              <IconPlus size={20} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold">Create a set</p>
              <p className="text-xs text-[var(--color-muted)]">
                Your class of is not here yet? Start it and invite everyone.
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

// Personalised to the signed-in user — never prerender at build time.
export const dynamic = "force-dynamic";
