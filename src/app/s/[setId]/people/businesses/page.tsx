import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui";
import { IconGlobe, IconSearch, IconWhatsapp } from "@/components/icons";
import { first } from "@/lib/rows";

export const metadata = { title: "Alumni businesses" };

export default async function BusinessesPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  // Businesses are global to a person; discovery is scoped to this set's members.
  const { data: members } = await supabase
    .from("set_memberships")
    .select("user_id, id, profiles!set_memberships_user_id_fkey ( display_name, avatar_url )")
    .eq("set_id", setId)
    .eq("status", "active");

  const userIds = (members ?? []).map((m) => m.user_id);
  const ownerLookup = new Map(
    (members ?? []).map((m) => {
      const p = first(m.profiles) as { display_name: string | null; avatar_url: string | null } | null;
      return [m.user_id, { membershipId: m.id, name: p?.display_name ?? "Member", avatar: p?.avatar_url ?? null }];
    }),
  );

  let query = supabase
    .from("businesses")
    .select("id, owner_id, name, category, description, logo_url, website, phone, whatsapp, city, state, offerings")
    .in("owner_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_published", true)
    .order("name");

  if (sp.q) query = query.ilike("name", `%${sp.q}%`);
  if (sp.category) query = query.eq("category", sp.category);

  const { data: businesses } = await query;
  const categories = Array.from(
    new Set((businesses ?? []).map((b) => b.category).filter(Boolean) as string[]),
  ).sort();

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Alumni businesses"
        description="What your classmates build and sell. Buying from an old boy or old girl keeps the money in the family."
        action={
          <Link href="/account/business" className="btn btn-primary btn-sm">List my business</Link>
        }
      />

      <form className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <IconSearch size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Search businesses…" className="field pl-11" />
        </div>
        {categories.length ? (
          <select name="category" defaultValue={sp.category ?? ""} className="field sm:w-56" aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : null}
        <button className="btn btn-primary btn-sm">Search</button>
      </form>

      {!businesses?.length ? (
        <EmptyState
          icon="briefcase"
          title="No businesses listed yet"
          description="Be the first — add your business and your set will see it here."
          action={<Link href="/account/business" className="btn btn-primary btn-sm">List my business</Link>}
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => {
            const owner = ownerLookup.get(b.owner_id);
            return (
              <article key={b.id} className="card card-hover flex flex-col p-5">
                <div className="flex items-start gap-3.5">
                  <Avatar name={b.name} src={b.logo_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-[1rem] font-semibold leading-snug">{b.name}</h2>
                    {b.category ? <p className="text-sm text-[var(--color-muted)]">{b.category}</p> : null}
                  </div>
                </div>

                {b.description ? (
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--color-ink-2)]">
                    {b.description}
                  </p>
                ) : <div className="flex-1" />}

                {b.offerings?.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.offerings.slice(0, 3).map((o: string) => <Badge key={o}>{o}</Badge>)}
                  </div>
                ) : null}

                {b.city || b.state ? (
                  <p className="mt-3 text-xs text-[var(--color-subtle)]">
                    {[b.city, b.state].filter(Boolean).join(", ")}
                  </p>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
                  {owner ? (
                    <Link
                      href={`/s/${setId}/people/${owner.membershipId}`}
                      className="flex min-w-0 items-center gap-2 text-sm"
                    >
                      <Avatar name={owner.name} src={owner.avatar} size={26} />
                      <span className="truncate font-medium">{owner.name}</span>
                    </Link>
                  ) : <span />}
                  <div className="flex shrink-0 gap-1.5">
                    {b.whatsapp ? (
                      <a
                        href={`https://wa.me/${b.whatsapp.replace(/\D/g, "")}`}
                        target="_blank" rel="noreferrer"
                        className="btn btn-soft btn-icon" aria-label="WhatsApp"
                      >
                        <IconWhatsapp size={16} />
                      </a>
                    ) : null}
                    {b.website ? (
                      <a
                        href={b.website} target="_blank" rel="noreferrer"
                        className="btn btn-ghost btn-icon" aria-label="Website"
                      >
                        <IconGlobe size={16} />
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
