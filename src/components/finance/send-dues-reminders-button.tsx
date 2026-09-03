"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconBell } from "@/components/icons";

export function SendDuesRemindersButton({ duesId }: { duesId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<number | null>(null);

  const send = () =>
    start(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("send_dues_reminders", { p_dues_id: duesId });
      if (!error) {
        setSent((data as number) ?? 0);
        router.refresh();
      }
    });

  return (
    <button onClick={send} disabled={pending} className="btn btn-soft btn-sm">
      {pending ? <Spinner /> : <IconBell size={14} />}
      {sent !== null ? `Reminded ${sent}` : "Remind everyone owing"}
    </button>
  );
}
