"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signUp, type AuthState } from "../actions";
import { Alert, Field, SubmitButton } from "@/components/forms";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const params = useSearchParams();
  const invite = params.get("invite") ?? "";
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});

  return (
    <div className="animate-rise">
      <h1 className="t-h1">Create your account</h1>
      <p className="t-lead mt-2.5">
        One account for every school community you belong to — now and later.
      </p>

      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="invite" value={invite} />
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.message ? <Alert tone="success">{state.message}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="first_name" required autoComplete="given-name" placeholder="Omogbolade" />
          <Field label="Last name" name="last_name" required autoComplete="family-name" placeholder="Ajayi" />
        </div>
        <Field label="Email address" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        <Field
          label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="+234 800 000 0000"
          hint="Optional. Used for dues reminders if you turn them on."
        />
        <Field
          label="Password" name="password" type="password" required autoComplete="new-password"
          placeholder="At least 8 characters" hint="Use something you do not use anywhere else."
        />

        <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>

        <p className="text-center text-xs leading-relaxed text-[var(--color-subtle)]">
          By continuing you agree that your set&apos;s administrators can see the membership details
          you choose to share with that community.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--color-brand-dark)] hover:text-[var(--color-brand-deep)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
