import Link from "next/link";
import { getCommunities, getProfile } from "@/lib/workspace";
import { IconArrow, IconPlus, IconSchool, IconUserPlus } from "@/components/icons";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const [profile, communities] = await Promise.all([getProfile(), getCommunities()]);
  const name = profile?.first_name ?? "there";

  return (
    <div className="animate-rise">
      <span className="chip chip-brand mb-5">
        <IconSchool size={14} /> Welcome to SetHub
      </span>
      <h1 className="t-h1 text-balance">Let&apos;s connect you with your alumni communities, {name}</h1>
      <p className="t-lead mt-3 max-w-xl">
        You can belong to as many as you like — your secondary school, your university, a
        polytechnic. Each one runs as its own private workspace, and you switch between them
        the way you switch Slack workspaces.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/onboarding/join" className="card card-hover group flex flex-col p-6">
          <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
            <IconUserPlus size={22} />
          </span>
          <h2 className="t-h3 mt-4">Join an existing set</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
            Search for your school, pick your graduating year, and request to join. Most sets
            approve within a day.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-dark)]">
            Find my school <IconArrow size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link href="/onboarding/create" className="card card-hover group flex flex-col p-6">
          <span className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--color-plum-soft)] text-[var(--color-plum)]">
            <IconPlus size={22} />
          </span>
          <h2 className="t-h3 mt-4">Create your set</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
            Nobody has started your class of yet? Create it, and SetHub sets up channels, roles,
            EXCO positions and a finance ledger for you.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-plum)]">
            Start a set <IconArrow size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>

      {communities.length > 0 ? (
        <p className="mt-8 text-sm text-[var(--color-muted)]">
          You already belong to {communities.length}{" "}
          {communities.length === 1 ? "community" : "communities"}.{" "}
          <Link href="/app" className="font-semibold text-[var(--color-brand-dark)]">Go to them</Link>
        </p>
      ) : null}
    </div>
  );
}

// Personalised to the signed-in user — never prerender at build time.
export const dynamic = "force-dynamic";
