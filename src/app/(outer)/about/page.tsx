import Link from "next/link";

export default function AboutPage() {
  return <section className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
    <p className="t-eyebrow">About SetHub</p>
    <h1 className="t-hero mt-4 max-w-4xl text-balance">A digital home for alumni communities with real responsibilities.</h1>
    <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="card-brand p-7"><p className="text-lg leading-relaxed text-white/86">We are building SetHub for the classmates, secretaries, treasurers and volunteers who keep associations moving long after graduation day.</p></div>
      <div className="space-y-5 text-[1rem] leading-relaxed text-[var(--color-muted)]">
        <p>School sets are powerful networks, but their operations often live across phones, bank alerts, paper minutes and informal memory. That makes it hard to trust records, onboard new members or hand over cleanly.</p>
        <p>SetHub turns the set into a shared workspace: member identity, departments, announcements, elections, dues, projects, documents and exports all connected to the same community.</p>
        <p>Our goal is simple: help every set preserve its history and run its next chapter with less stress.</p>
      </div>
    </div>
    <div className="mt-10 flex flex-wrap gap-3"><Link href="/why-building-sethub" className="btn btn-primary">Why we're building it</Link><Link href="/faqs" className="btn btn-ghost">Read FAQs</Link></div>
  </section>;
}
