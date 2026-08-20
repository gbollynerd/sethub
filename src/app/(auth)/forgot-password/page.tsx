"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "../actions";
import { Alert, Field, SubmitButton } from "@/components/forms";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, {});

  return (
    <div className="animate-rise">
      <h1 className="t-h1">Reset your password</h1>
      <p className="t-lead mt-2.5">
        Enter the email on your account and we will send you a link to set a new password.
      </p>

      <form action={action} className="mt-8 space-y-4">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.message ? <Alert tone="success">{state.message}</Alert> : null}
        <Field label="Email address" name="email" type="email" required autoComplete="email" />
        <SubmitButton pendingLabel="Sending the link…">Send reset link</SubmitButton>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--color-muted)]">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-[var(--color-brand-dark)]">Back to sign in</Link>
      </p>
    </div>
  );
}
