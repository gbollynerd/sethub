const faqs = [
  ["Can one person belong to multiple sets?", "Yes. SetHub is designed around one account that can switch between every school, set, department and committee a member belongs to."],
  ["Do we have to leave WhatsApp?", "No. WhatsApp can remain the broadcast and conversation habit; SetHub keeps the permanent record, workflows and searchable source of truth."],
  ["Can departments run separately?", "Yes. Departments can have private spaces, admins, channels, dues and events while still participating in set-wide activity."],
  ["Who can manage money and members?", "Owners and administrators can assign roles and permissions so EXCO officers, treasurers, auditors and committee leads only see the tools they need."],
  ["Is SetHub only for Nigerian schools?", "The product is shaped by Nigerian alumni associations, but the structure works for any school community organized around graduating classes."],
  ["How do we start?", "Create an account, find or recommend your institution, create the set year and invite classmates with a link or QR code."],
];

export default function FaqsPage() {
  return <section className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 sm:py-28">
    <p className="t-eyebrow">FAQs</p>
    <h1 className="t-hero mt-4 max-w-4xl text-balance">Questions before you bring the set in?</h1>
    <div className="mt-12 grid gap-4 md:grid-cols-2">{faqs.map(([q,a]) => <article key={q} className="card p-6"><h2 className="t-h3">{q}</h2><p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--color-muted)]">{a}</p></article>)}</div>
  </section>;
}
