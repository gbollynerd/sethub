export default function WhyBuildingSetHubPage() {
  return <section className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
    <p className="t-eyebrow">Why we're building SetHub</p>
    <h1 className="t-hero mt-4 max-w-4xl text-balance">Associations should not have to restart every time leaders change.</h1>
    <div className="mt-12 grid gap-4 lg:grid-cols-3">
      {[
        ["Memory gets lost", "Photos, minutes, constitutions, project reports and financial explanations disappear into personal devices."],
        ["Trust takes work", "Transparent payments, expenses, receipts and audits make it easier for members to contribute confidently."],
        ["Community needs structure", "People still love chat, but elections, dues, events and school projects need a more durable home."],
      ].map(([t,d]) => <article key={t} className="card p-6"><h2 className="t-h3">{t}</h2><p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--color-muted)]">{d}</p></article>)}
    </div>
    <div className="card mt-12 p-7"><h2 className="t-h2">The belief</h2><p className="mt-3 max-w-3xl text-[1rem] leading-relaxed text-[var(--color-muted)]">When alumni groups are organized, schools benefit: classmates reconnect, members support each other, and projects have the transparency needed to attract real contributions. SetHub exists to make that organization normal.</p></div>
  </section>;
}
