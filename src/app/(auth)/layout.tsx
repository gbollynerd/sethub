import Link from "next/link";
import { Logo } from "@/components/brand";

const PROOF = [
  { k: "One account", v: "Belong to your secondary school, university and every other set." },
  { k: "Private by default", v: "What happens in one set never leaks into another." },
  { k: "Open books", v: "Every naira in and out, visible to the whole set." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-14">
        <Logo href="/" />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-xs text-[var(--color-subtle)] lg:text-left">
          © {new Date().getFullYear()} SetHub ·{" "}
          <Link href="/" className="hover:text-[var(--color-ink)]">Back to home</Link>
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-[var(--color-brand-deep)] lg:block">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[var(--color-brand)] opacity-50 blur-3xl animate-drift" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[var(--color-gold)] opacity-25 blur-3xl" />
        <div className="grain relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div />
          <div className="max-w-lg">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-mid)]">
              The digital alumni workspace
            </p>
            <h2 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-white text-balance">
              Your set deserves better than a WhatsApp group and a spreadsheet.
            </h2>
            <ul className="mt-10 space-y-5">
              {PROOF.map((p) => (
                <li key={p.k}>
                  <p className="font-display text-base font-semibold text-white">{p.k}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{p.v}</p>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/45">
            Secondary schools · Universities · Polytechnics · Colleges of education
          </p>
        </div>
      </aside>
    </div>
  );
}
