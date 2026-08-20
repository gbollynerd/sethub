import Link from "next/link";

export default function TalkToSalesPage() {
  return <section className="mx-auto grid max-w-[76rem] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_0.9fr]">
    <div><p className="t-eyebrow">Talk to sales</p><h1 className="t-hero mt-4 text-balance">Bring SetHub to your association, school or umbrella body.</h1><p className="t-lead mt-6 max-w-2xl">Tell us about your sets, departments, member count and current workflow. We will help you plan rollout, imports, permissions and launch communications.</p></div>
    <div className="card p-7">
      <h2 className="t-h2">Start the conversation</h2>
      <div className="mt-6 space-y-4 text-[0.95rem] text-[var(--color-muted)]">
        <p><strong className="text-[var(--color-ink)]">Email:</strong> sales@sethub.app</p>
        <p><strong className="text-[var(--color-ink)]">Best for:</strong> associations with multiple sets, formal EXCO structures, finance reporting needs or school-wide projects.</p>
        <p><strong className="text-[var(--color-ink)]">Include:</strong> institution name, graduating years, estimated members and the biggest problem you want to solve first.</p>
      </div>
      <Link href="mailto:sales@sethub.app?subject=SetHub%20sales%20conversation" className="btn btn-primary mt-7 w-full">Email sales</Link>
    </div>
  </section>;
}
