import Link from "next/link";
import { Logo, LogoMark } from "@/components/brand";
import { Reveal, CountUp } from "@/components/reveal";
import {
  IconArrow, IconChat, IconCommunity, IconDepartment, IconFinance,
  IconPeople, IconProject, IconResources, IconVote, IconWhatsapp, IconCalendar, IconShield,
} from "@/components/icons";

const PILLARS = [
  { icon: IconPeople, title: "Schools & sets", body: "Find your school, join the class of your year, and keep every membership separate." },
  { icon: IconDepartment, title: "Departments", body: "Universities get closed department communities inside the set — Computer Science keeps its own room." },
  { icon: IconChat, title: "Chat & committees", body: "Channels, threads, files and pinned decisions. Committees get private rooms of their own." },
  { icon: IconShield, title: "EXCO & permissions", body: "Owner, executives and administrators are three different things. Grant exactly what each person needs." },
  { icon: IconCalendar, title: "Events & calendar", body: "AGMs, reunions, trivia nights and dues deadlines land in one unified calendar." },
  { icon: IconVote, title: "Elections & polls", body: "Real ballots with eligibility rules, anonymous voting and a receipt for every voter." },
  { icon: IconFinance, title: "Dues & transparency", body: "Every naira in and out, published statements, and one-click export to CSV, Excel or PDF." },
  { icon: IconProject, title: "School projects", body: "A project belongs to the school, not one set. Classes of 1990 and 2012 fund it together." },
  { icon: IconResources, title: "Albums & records", body: "Photographs, minutes, constitutions and project reports — institutional memory that outlives an EXCO." },
];

const FLOW = [
  { step: "01", title: "Find your school", body: "Search a directory of secondary schools, universities, polytechnics and colleges. Not listed? Recommend it and we will add it." },
  { step: "02", title: "Join or create your set", body: "Pick your graduation year. If your set already exists you request to join; if it does not, you create it and become its first custodian." },
  { step: "03", title: "Bring everyone in", body: "Share an invite link or QR code in the WhatsApp group. Department admins can issue their own links too." },
  { step: "04", title: "Run the set properly", body: "Elect an EXCO, publish dues, record every expense, plan the reunion, and fund the school project — in one place." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-transparent bg-[var(--color-canvas)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[76rem] items-center justify-between px-5 py-4 sm:px-8">
          <Logo href="/" />
          <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--color-muted)] md:flex">
            <a href="#pillars" className="transition hover:text-[var(--color-ink)]">Product</a>
            <a href="#departments" className="transition hover:text-[var(--color-ink)]">Departments</a>
            <a href="#money" className="transition hover:text-[var(--color-ink)]">Finances</a>
            <a href="#how" className="transition hover:text-[var(--color-ink)]">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-quiet hidden sm:inline-flex">Sign in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm sm:btn">Get started</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[var(--color-brand-mid)] opacity-25 blur-3xl animate-drift" />
        <div className="pointer-events-none absolute -left-32 top-52 h-[24rem] w-[24rem] rounded-full bg-[var(--color-gold)] opacity-20 blur-3xl" />

        <div className="relative mx-auto max-w-[76rem] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-rise">
              <span className="chip chip-brand mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] animate-ring" />
                One account · many school communities
              </span>
              <h1 className="t-hero text-balance">
                The digital home for your
                <span className="relative ml-3 inline-block text-[var(--color-brand)]">
                  school set
                  <svg
                    className="absolute -bottom-2 left-0 w-full" height="14" viewBox="0 0 200 14"
                    fill="none" preserveAspectRatio="none" aria-hidden="true"
                  >
                    <path
                      d="M2 9C40 3 78 2 118 5c30 2 58 5 80 4"
                      stroke="var(--color-gold)" strokeWidth="4.5" strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="t-lead mt-7 max-w-xl">
                SetHub gives every graduating class its own private workspace — people, chat,
                events, elections, dues and school projects. You keep one account and switch
                between your secondary school, your university and every other set you belong to.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/signup" className="btn btn-primary btn-lg group">
                  Create your set
                  <IconArrow size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/login" className="btn btn-ghost btn-lg">I have an invite link</Link>
              </div>

              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
                {[
                  { value: 40, suffix: "+", label: "Institutions listed" },
                  { value: 1960, suffix: "", label: "Sets from this year on", raw: true },
                  { value: 100, suffix: "%", label: "Financial transparency" },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="font-display text-[1.75rem] font-semibold leading-none tracking-tight text-[var(--color-brand-deep)]">
                      {s.raw ? "1960" : <CountUp to={s.value} suffix={s.suffix} />}
                    </dt>
                    <dd className="mt-1.5 text-[0.8rem] leading-snug text-[var(--color-muted)]">
                      {s.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="animate-rise" style={{ animationDelay: "0.14s" }}>
              <HeroPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────────────────────────── */}
      <section className="marquee overflow-hidden border-y border-[var(--color-line)] bg-[var(--color-canvas-2)] py-4">
        <div className="marquee-track gap-10">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center gap-10 pr-10">
              {[
                "University of Lagos", "FGC Lagos", "Obafemi Awolowo University", "Kings College",
                "Yaba College of Technology", "Queens College", "University of Ibadan",
                "Loyola Jesuit College", "Covenant University", "Government College, Ibadan",
              ].map((n) => (
                <span
                  key={`${dup}-${n}`}
                  className="whitespace-nowrap font-display text-[0.95rem] font-medium text-[var(--color-subtle)]"
                >
                  {n}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Pillars ─────────────────────────────────────────────────────── */}
      <section id="pillars" className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <p className="t-eyebrow">Everything a set actually needs</p>
          <h2 className="t-h1 mt-3 max-w-2xl text-balance">
            Ten years of association business, finally in one place
          </h2>
          <p className="t-lead mt-4 max-w-2xl">
            Most old students associations run on a WhatsApp group, a spreadsheet and one person&apos;s
            memory. SetHub replaces all three without asking anyone to leave WhatsApp.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 55}>
              <article className="card card-hover h-full p-6">
                <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                  <p.icon size={22} />
                </span>
                <h3 className="t-h3 mt-4">{p.title}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--color-muted)]">{p.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Departments ─────────────────────────────────────────────────── */}
      <section id="departments" className="border-y border-[var(--color-line)] bg-[var(--color-canvas-2)]">
        <div className="mx-auto grid max-w-[76rem] items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
          <Reveal>
            <p className="t-eyebrow">Built for universities too</p>
            <h2 className="t-h1 mt-3 text-balance">
              Your department gets a room of its own
            </h2>
            <p className="t-lead mt-4">
              A university set is not one crowd. Computer Science 2012 has its own lecturers to
              remember, its own reunion, its own levy. In SetHub each department is a closed
              sub-community: private channels, its own announcements, events, dues and admins —
              while everyone still shares the set-wide space.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Department channels are invisible to other departments",
                "Department admins issue their own invite links",
                "Department dues and balances are tracked separately",
                "Cross-department channels stay at set level for everyone",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-brand)] text-white">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="m5 12.6 4.6 4.6L19 6.6" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-[0.95rem] text-[var(--color-ink-2)]">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <DepartmentPreview />
          </Reveal>
        </div>
      </section>

      {/* ── Money ───────────────────────────────────────────────────────── */}
      <section id="money" className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal>
            <FinancePreview />
          </Reveal>
          <Reveal delay={110}>
            <p className="t-eyebrow">Money, in the open</p>
            <h2 className="t-h1 mt-3 text-balance">Nobody has to ask where the money went</h2>
            <p className="t-lead mt-4">
              Every confirmed payment and approved expense writes to one ledger. Members see the
              balance. Executives see the detail. Auditors export the lot to CSV, Excel or a signed
              PDF report whenever they want it.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { t: "Dues that assign themselves", d: "Create a levy, assign it to the whole set or one department, and reminders handle the rest." },
                { t: "Receipts on every expense", d: "Vendor, category, approver and a scanned receipt attached to each line." },
                { t: "Project-level budgets", d: "Estimated cost, raised, still needed, and a spending breakdown per project." },
                { t: "Export anytime", d: "Ledger, payments, dues, expenses, donations or a full report — CSV, Excel or PDF." },
              ].map((c) => (
                <div key={c.t} className="card-tint p-4">
                  <p className="font-display text-sm font-semibold">{c.t}</p>
                  <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">{c.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── WhatsApp ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[76rem] px-5 pb-20 sm:px-8 sm:pb-28">
        <Reveal>
          <div className="card-brand grain relative overflow-hidden p-8 sm:p-12">
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <span className="chip bg-white/15 text-white border-white/25">
                  <IconWhatsapp size={14} /> Integrations
                </span>
                <h2 className="t-h1 mt-4 text-white text-balance">
                  Keep the WhatsApp group. Just stop losing things in it.
                </h2>
                <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-white/80">
                  Connect your set&apos;s WhatsApp group, Telegram channel, SMS gateway or plain
                  webhook. Announcements, new events, election openings and dues deadlines are
                  pushed out automatically — and members still come back to SetHub for the record.
                </p>
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {["WhatsApp", "Telegram", "Slack", "Email lists", "SMS", "Webhooks"].map((n) => (
                    <span key={n} className="chip border-white/25 bg-white/12 text-white">{n}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-white/20 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
                  Pushed to your group
                </p>
                <div className="mt-3 space-y-2.5">
                  {[
                    { t: "AGM 2026 — Saturday 12 September", s: "Event created by the General Secretary" },
                    { t: "September dues are now open", s: "₦5,000 · due 30 September" },
                    { t: "EXCO election voting opens tomorrow", s: "6 positions · 184 eligible voters" },
                  ].map((m) => (
                    <div key={m.t} className="rounded-[var(--radius-sm)] bg-white/12 p-3">
                      <p className="text-sm font-semibold text-white">{m.t}</p>
                      <p className="mt-0.5 text-xs text-white/65">{m.s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── How ─────────────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-[var(--color-line)] bg-[var(--color-canvas-2)]">
        <div className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <p className="t-eyebrow">Getting started</p>
            <h2 className="t-h1 mt-3 max-w-xl text-balance">Four steps from WhatsApp chaos to a real association</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((s, i) => (
              <Reveal key={s.step} delay={i * 80}>
                <div className="card h-full p-6">
                  <span className="font-display text-[2.4rem] font-semibold leading-none text-[var(--color-brand-mid)]">
                    {s.step}
                  </span>
                  <h3 className="t-h3 mt-3">{s.title}</h3>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--color-muted)]">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[76rem] px-5 py-20 text-center sm:px-8 sm:py-28">
        <Reveal>
          <LogoMark size={52} />
          <h2 className="t-h1 mx-auto mt-6 max-w-2xl text-balance">
            Your set has a history worth keeping
          </h2>
          <p className="t-lead mx-auto mt-4 max-w-xl">
            Start the workspace, invite the class, and let the next EXCO inherit something better
            than a phone full of screenshots.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn btn-primary btn-lg group">
              Create your free account
              <IconArrow size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/login" className="btn btn-ghost btn-lg">Sign in</Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-line)] bg-[var(--color-canvas-2)]">
        <div className="mx-auto flex max-w-[76rem] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <Logo href="/" />
            <p className="mt-2.5 max-w-sm text-sm text-[var(--color-muted)]">
              A digital alumni workspace where one person can belong to many school communities,
              each running as its own private set.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--color-muted)]">
            <Link href="/login" className="hover:text-[var(--color-ink)]">Sign in</Link>
            <Link href="/signup" className="hover:text-[var(--color-ink)]">Create account</Link>
            <a href="#pillars" className="hover:text-[var(--color-ink)]">Product</a>
            <span className="text-[var(--color-subtle)]">© {new Date().getFullYear()} SetHub</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Decorative product previews (static, no data) ───────────────────────── */

function HeroPreview() {
  return (
    <div className="relative">
      <div className="card overflow-hidden p-0 shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-brand-deep)] font-display text-xs font-bold text-white">
            UL
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">University of Lagos</p>
            <p className="truncate text-xs text-[var(--color-subtle)]">Class of 2012 · 184 members</p>
          </div>
          <span className="ml-auto chip chip-brand">Switch</span>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {[
            { l: "Members", v: "184", i: IconPeople, tone: "chip-brand" },
            { l: "Set balance", v: "₦2.4m", i: IconFinance, tone: "chip-positive" },
            { l: "Your dues", v: "₦25,000", i: IconVote, tone: "chip-caution" },
            { l: "Departments", v: "12", i: IconDepartment, tone: "chip-plum" },
          ].map((s) => (
            <div key={s.l} className="card-tint p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)]">
                  {s.l}
                </p>
                <span className={`chip ${s.tone} px-1.5`}><s.i size={13} /></span>
              </div>
              <p className="tabular mt-2 font-display text-xl font-semibold">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--color-line)] p-4">
          <p className="t-eyebrow mb-2.5">Coming up</p>
          <ul className="space-y-2">
            {[
              { t: "AGM 2026", d: "Sat 12 Sept · Lagos", c: "var(--color-brand)" },
              { t: "EXCO election opens", d: "Mon 1 Oct · 6 positions", c: "var(--color-plum)" },
              { t: "September dues", d: "Due 30 Sept · ₦5,000", c: "var(--color-positive)" },
            ].map((e) => (
              <li key={e.t} className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-2.5">
                <span className="h-8 w-1 rounded-full" style={{ background: e.c }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.t}</p>
                  <p className="truncate text-xs text-[var(--color-subtle)]">{e.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card absolute -bottom-6 -left-4 hidden w-56 p-3.5 shadow-[var(--shadow-lift)] sm:block">
        <div className="flex items-center gap-2">
          <IconCommunity size={18} className="text-[var(--color-brand)]" />
          <p className="text-xs font-bold uppercase tracking-[0.09em] text-[var(--color-subtle)]">
            Also a member of
          </p>
        </div>
        <div className="mt-2.5 space-y-1.5">
          {["FGC Lagos · 2008", "Yaba Tech · 2015"].map((s) => (
            <p key={s} className="truncate text-sm font-medium text-[var(--color-ink-2)]">{s}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function DepartmentPreview() {
  const departments = [
    { n: "Computer Science", m: 34, c: "#0898A0" },
    { n: "Mechanical Engineering", m: 28, c: "#6E6B8F" },
    { n: "Accounting", m: 41, c: "#0F9D74" },
    { n: "Mass Communication", m: 22, c: "#D9791C" },
  ];
  return (
    <div className="card p-5 shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold">Departments · Class of 2012</p>
        <span className="chip chip-brand">12 total</span>
      </div>
      <ul className="mt-4 space-y-2">
        {departments.map((d) => (
          <li key={d.n} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] font-display text-xs font-bold text-white" style={{ background: d.c }}>
              {d.n.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{d.n}</p>
              <p className="text-xs text-[var(--color-subtle)]">
                {d.m} members · #{d.n.toLowerCase().split(" ")[0]}-general
              </p>
            </div>
            <span className="chip">Private</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] p-3.5">
        <p className="text-xs leading-relaxed text-[var(--color-brand-deep)]">
          <strong>Set-wide space stays shared.</strong> #general, the reunion committee and the
          school project are visible to every department in the class.
        </p>
      </div>
    </div>
  );
}

function FinancePreview() {
  const months = [
    { m: "Apr", i: 62, e: 30 }, { m: "May", i: 74, e: 41 }, { m: "Jun", i: 55, e: 48 },
    { m: "Jul", i: 92, e: 36 }, { m: "Aug", i: 81, e: 52 }, { m: "Sep", i: 100, e: 44 },
  ];
  return (
    <div className="card p-6 shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="t-eyebrow">Set balance</p>
          <p className="tabular mt-1.5 font-display text-[2.1rem] font-semibold leading-none">₦2,418,500</p>
        </div>
        <span className="chip chip-positive">+18% this quarter</span>
      </div>

      <div className="mt-7 flex items-end gap-3" style={{ height: 150 }}>
        {months.map((m) => (
          <div key={m.m} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div className="w-1/2 max-w-[22px] rounded-t-md bg-[var(--color-brand)]" style={{ height: `${m.i}%` }} />
              <div className="w-1/2 max-w-[22px] rounded-t-md bg-[var(--color-plum)] opacity-70" style={{ height: `${m.e}%` }} />
            </div>
            <span className="text-[0.68rem] font-semibold text-[var(--color-subtle)]">{m.m}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--color-line)] pt-5">
        {[
          { l: "Collected", v: "₦3.9m" },
          { l: "Outstanding", v: "₦640k" },
          { l: "Collection rate", v: "86%" },
        ].map((s) => (
          <div key={s.l}>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.09em] text-[var(--color-subtle)]">{s.l}</p>
            <p className="tabular mt-1 font-display text-lg font-semibold">{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
