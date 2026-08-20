"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "../actions";
import { Alert, Field, SubmitButton } from "@/components/forms";

export default function ResetPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});

  return (
    <div className="animate-rise">
      <h1 className="t-h1">Choose a new password</h1>
      <p className="t-lead mt-2.5">Pick something you do not use on any other site.</p>

      <form action={action} className="mt-8 space-y-4">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        <Field
          label="New password" name="password" type="password" required
          autoComplete="new-password" placeholder="At least 8 characters"
        />
        <SubmitButton pendingLabel="Saving…">Save password</SubmitButton>
      </form>
    </div>
  );
}
