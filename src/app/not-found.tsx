"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand";
import { IconArrow } from "@/components/icons";

const REDIRECT_DELAY = 5;

/** A friendly, self-contained fallback for routes that do not exist. */
export default function NotFound() {
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_DELAY);

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      window.location.assign("/");
    }, REDIRECT_DELAY * 1000);

    const countdownTimer = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(redirectTimer);
      window.clearInterval(countdownTimer);
    };
  }, []);

  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-[var(--color-canvas)] px-5 py-6 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -left-28 top-28 h-72 w-72 rounded-full bg-[var(--color-gold)] opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -top-20 h-[30rem] w-[30rem] rounded-full bg-[var(--color-brand-mid)] opacity-35 blur-3xl animate-drift" />

      <header className="relative mx-auto flex w-full max-w-[76rem] items-center">
        <Logo href="/" />
      </header>

      <section className="relative mx-auto grid w-full max-w-[76rem] place-items-center py-10 text-center">
        <div className="animate-rise max-w-xl">
          <div className="relative mx-auto mb-8 grid h-32 w-32 place-items-center rounded-full border border-[var(--color-brand-tint)] bg-[var(--color-brand-soft)] shadow-[0_20px_50px_-30px_rgba(8,152,160,0.7)] sm:h-40 sm:w-40">
            <span className="font-display text-5xl font-semibold tracking-[-0.08em] text-[var(--color-brand-deep)] sm:text-6xl">404</span>
            <span className="absolute -right-2 top-2 h-5 w-5 rounded-full bg-[var(--color-gold)] ring-4 ring-[var(--color-canvas)]" />
            <svg className="absolute -bottom-5 h-7 w-24 text-[var(--color-brand)]" viewBox="0 0 96 28" fill="none" aria-hidden="true">
              <path d="M3 7c14 11 27 13 42 7 18-8 28-4 48 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 7" />
            </svg>
          </div>

          <p className="t-eyebrow">Wrong turn</p>
          <h1 className="t-h1 mt-3 text-balance">This page isn&apos;t part of the set.</h1>
          <p className="t-lead mt-4">
            The link may be out of date, or the page may have moved. We&apos;ll take you back to the SetHub home page shortly.
          </p>

          <Link href="/" className="btn btn-primary btn-lg mt-8 group">
            Take me home
            <IconArrow size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>

          <p className="mt-6 text-sm text-[var(--color-muted)]" aria-live="polite">
            Redirecting in <span className="font-semibold text-[var(--color-ink-2)]">{secondsLeft}</span> {secondsLeft === 1 ? "second" : "seconds"}…
          </p>
          <div className="mx-auto mt-3 h-1 w-40 overflow-hidden rounded-full bg-[var(--color-line)]" aria-hidden="true">
            <div className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-1000 ease-linear" style={{ width: `${((REDIRECT_DELAY - secondsLeft) / REDIRECT_DELAY) * 100}%` }} />
          </div>
        </div>
      </section>

      <footer className="relative mx-auto w-full max-w-[76rem] text-center text-xs text-[var(--color-subtle)]">
        SetHub brings every school community together.
      </footer>
    </main>
  );
}
