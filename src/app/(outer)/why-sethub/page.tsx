import Link from "next/link";

const reasons = [
  ["One account, every set", "Members can belong to secondary school, university, department and committee communities without juggling logins."],
  ["Continuity between EXCOs", "Roles, minutes, dues, decisions and project records stay in the workspace when leadership changes."],
  ["Transparency by default", "Ledgers, dues, expenses and exports help treasurers show the work instead of answering the same money questions."],
  ["Built around real school structures", "Sets, departments, committees and school-wide projects are first-class, not spreadsheet columns."],
];

export default function WhySetHubPage() {
  return <section className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
    <p className="t-eyebrow">Why SetHub</p>
    <h1 className="t-hero mt-4 max-w-4xl text-balance">Because your set deserves more than scattered chats and old spreadsheets.</h1>
    <p className="t-lead mt-6 max-w-2xl">SetHub gives alumni groups a permanent operating system for people, conversations, events, elections, dues and projects.</p>
    <div className="mt-12 grid gap-4 md:grid-cols-2">{reasons.map(([t,d]) => <article key={t} className="card card-hover p-6"><h2 className="t-h3">{t}</h2><p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--color-muted)]">{d}</p></article>)}</div>
    <div className="mt-10 flex flex-wrap gap-3"><Link href="/signup" className="btn btn-primary">Create your set</Link><Link href="/talk-to-sales" className="btn btn-ghost">Talk to sales</Link></div>
  </section>;
}
