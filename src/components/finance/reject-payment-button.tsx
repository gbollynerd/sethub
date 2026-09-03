"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconClose } from "@/components/icons";

export function RejectPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const reject = () => {
    const reason = window.prompt("Why is this payment being rejected? The member will see this.");
    if (reason === null) return;
    start(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("payments")
        .update({
          status: "failed",
          rejected_reason: reason || "Rejected by an administrator",
          confirmed_by: user?.id ?? null,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", paymentId);
      router.refresh();
    });
  };

  return (
    <button onClick={reject} disabled={pending} className="btn btn-quiet btn-sm text-[var(--color-critical)] whitespace-nowrap">
      {pending ? <Spinner /> : <IconClose size={14} />} Reject
    </button>
  );
}
