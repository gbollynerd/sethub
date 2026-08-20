import Link from "next/link";
import { Logo } from "@/components/brand";

const links = [
  ["Why SetHub", "/why-sethub"],
  ["Who it's for", "/who-is-sethub-for"],
  ["About", "/about"],
  ["FAQs", "/faqs"],
  ["Talk to sales", "/talk-to-sales"],
];

export default function OuterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-[76rem] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Logo href="/" />
          <nav className="hidden items-center gap-5 text-sm font-medium text-[var(--color-muted)] lg:flex">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="transition hover:text-[var(--color-ink)]">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-quiet hidden sm:inline-flex">Sign in</Link>
            <Link href="/signup" className="btn btn-primary btn-sm">Get started</Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[var(--color-line)] bg-[var(--color-canvas-2)]">
        <div className="mx-auto flex max-w-[76rem] flex-col gap-5 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div><Logo href="/" /><p className="mt-2 max-w-md text-sm text-[var(--color-muted)]">SetHub helps school sets run membership, money, events, elections and shared memory with continuity.</p></div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-muted)]">
            {links.map(([label, href]) => <Link key={href} href={href} className="hover:text-[var(--color-ink)]">{label}</Link>)}
          </div>
        </div>
      </footer>
    </div>
  );
}
