"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconCheck } from "@/components/icons";

export function ConfirmPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from("payments")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id ?? null,
        })
        .eq("id", paymentId);
      router.refresh();
    });

  return (
    <button onClick={confirm} disabled={pending} className="btn btn-soft btn-sm whitespace-nowrap">
      {pending ? <Spinner /> : <IconCheck size={14} />} Confirm
    </button>
  );
}
