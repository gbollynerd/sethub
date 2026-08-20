const audiences = [
  ["Class sets", "Graduate-year groups that need a private member directory, events, dues and elections."],
  ["Old students associations", "Umbrella associations coordinating multiple sets and school-wide capital projects."],
  ["University departments", "Department-specific rooms for levies, announcements, channels and reunions inside the wider set."],
  ["EXCOs and committees", "Leaders who need permissioned workflows, audit trails and records that survive handover."],
  ["Treasurers and auditors", "Finance teams that need traceable payments, expenses, statements and exports."],
  ["Members", "Alumni who want one trusted place to find classmates, pay dues, RSVP and vote."],
];

export default function WhoIsSetHubForPage() {
  return <section className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
    <p className="t-eyebrow">Who SetHub is for</p>
    <h1 className="t-hero mt-4 max-w-4xl text-balance">For the people keeping school communities alive.</h1>
    <p className="t-lead mt-6 max-w-2xl">Whether your group is just forming or has decades of history, SetHub creates a reliable home for the work that usually falls through the cracks.</p>
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{audiences.map(([t,d]) => <article key={t} className="card p-6"><h2 className="t-h3">{t}</h2><p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--color-muted)]">{d}</p></article>)}</div>
  </section>;
}
