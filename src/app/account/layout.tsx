import Link from "next/link";
import { Logo } from "@/components/brand";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto flex max-w-[52rem] items-center justify-between px-5 py-4 sm:px-8">
          <Logo href="/app" />
          <div className="flex gap-2">
            <Link href="/account" className="btn btn-quiet btn-sm">Profile</Link>
            <Link href="/account/business" className="btn btn-quiet btn-sm">Business</Link>
            <Link href="/account/notifications" className="btn btn-quiet btn-sm">Notifications</Link>
            <Link href="/app" className="btn btn-ghost btn-sm">My communities</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[52rem] px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
