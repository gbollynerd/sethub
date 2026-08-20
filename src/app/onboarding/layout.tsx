import Link from "next/link";
import { Logo } from "@/components/brand";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto flex max-w-[52rem] items-center justify-between px-5 py-4 sm:px-8">
          <Logo href="/app" />
          <Link href="/app" className="btn btn-quiet btn-sm">My communities</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[52rem] px-5 py-12 sm:px-8 sm:py-16">{children}</main>
    </div>
  );
}
