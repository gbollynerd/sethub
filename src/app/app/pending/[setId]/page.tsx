import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunities } from "@/lib/workspace";
import { Logo } from "@/components/brand";
import { Avatar, Badge } from "@/components/ui";
import { IconClock } from "@/components/icons";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Awaiting approval" };

export default async function PendingPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const supabase = await createClient();
  const communities = await getCommunities();
  const membership = communities.find((c) => c.set_id === setId);

  if (!membership) redirect("/app");
  if (membership.status === "active") redirect(`/s/${setId}`);

  const { data: set } = await supabase
    .from("sets")
    .select("name, graduation_year, member_count, institution:institutions(name, short_name, logo_url)")
    .eq("id", setId)
    .maybeSingle();

  const { data: me } = await supabase
    .from("set_memberships")
    .select("joined_at")
    .eq("set_id", setId)
    .maybeSingle();

  const institution = (set?.institution ?? null) as
    | { name: string; short_name: string | null; logo_url: string | null }
    | null;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto flex max-w-[46rem] items-center justify-between px-5 py-4 sm:px-8">
          <Logo href="/app" />
          <Link href="/app" className="btn btn-quiet btn-sm">My communities</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[46rem] px-5 py-16 sm:px-8">
        <div className="card animate-rise p-8 text-center sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--color-caution-soft)] text-[var(--color-caution)]">
            <IconClock size={30} />
          </span>
          <h1 className="t-h2 mt-6">Your request is with the administrators</h1>
          <p className="t-lead mx-auto mt-3 max-w-md">
            An executive of this set will review your membership. You will get a notification the
            moment you are approved — usually within a day or two.
          </p>

          <div className="mx-auto mt-8 flex max-w-sm items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] p-4 text-left">
            <Avatar name={institution?.short_name ?? "Set"} src={institution?.logo_url} size={46} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold">{institution?.name}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">
                {set?.name} · {set?.member_count} members
              </p>
            </div>
            <Badge tone="caution">Pending</Badge>
          </div>

          {me?.joined_at ? (
            <p className="mt-4 text-xs text-[var(--color-subtle)]">
              Requested {formatDate(me.joined_at)}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="btn btn-ghost">Back to my communities</Link>
            <Link href="/onboarding/join" className="btn btn-primary">Join another set</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
