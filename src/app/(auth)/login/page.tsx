"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn, type AuthState } from "../actions";
import { Alert, Field, SubmitButton } from "@/components/forms";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const [state, action] = useActionState<AuthState, FormData>(signIn, {});

  return (
    <div className="animate-rise">
      <h1 className="t-h1">Welcome back</h1>
      <p className="t-lead mt-2.5">
        Sign in once and every set you belong to is waiting for you.
      </p>

      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.message ? <Alert tone="success">{state.message}</Alert> : null}

        <Field label="Email address" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-[var(--color-brand-dark)] hover:text-[var(--color-brand-deep)]">
            Forgot password?
          </Link>
        </div>

        <SubmitButton pendingLabel="Signing you in…">Sign in</SubmitButton>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--color-muted)]">
        New to SetHub?{" "}
        <Link href="/signup" className="font-semibold text-[var(--color-brand-dark)] hover:text-[var(--color-brand-deep)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}
