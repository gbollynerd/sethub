import Link from "next/link";

/** SetHub wordmark — the interlocking "S" ring reads as a class coming together. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="var(--color-brand-deep)" />
      <circle cx="20" cy="20" r="12.4" stroke="var(--color-brand-mid)" strokeWidth="2" opacity="0.5" />
      <path
        d="M25.6 14.6c-1.6-1.5-3.6-2.2-5.9-2.2-3.2 0-5.4 1.6-5.4 4 0 2.2 1.6 3.3 4.9 4.1l1.6.4c3.6.9 5.6 2.4 5.6 5.3 0 3-2.8 5-6.7 5-2.6 0-4.9-.8-6.6-2.4"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="29.6" cy="11.4" r="3" fill="var(--color-gold)" />
    </svg>
  );
}

export function Logo({ compact = false, href = "/app" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5">
      <LogoMark size={compact ? 28 : 32} />
      {!compact ? (
        <span className="font-display text-[1.28rem] font-semibold tracking-tight text-[var(--color-ink)]">
          SetHub
        </span>
      ) : (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-[var(--color-ink)]">
          SetHub
        </span>
      )}
    </Link>
  );
}
