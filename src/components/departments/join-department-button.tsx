"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/forms";
import { IconArrow } from "@/components/icons";

export function JoinDepartmentButton({
  departmentId,
  setId,
  name,
  primary = false,
}: {
  departmentId: string;
  setId: string;
  name: string;
  primary?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const join = () =>
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error: err } = await supabase.rpc("join_department", {
        p_department_id: departmentId,
        p_primary: primary,
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/s/${setId}/departments/${departmentId}?welcome=1`);
      router.refresh();
    });

  return (
    <div>
      <button onClick={join} disabled={pending} className="btn btn-primary btn-sm w-full">
        {pending ? <><Spinner /> Joining…</> : <>Join {name} <IconArrow size={15} /></>}
      </button>
      {error ? <p className="mt-1.5 text-xs text-[var(--color-critical)]">{error}</p> : null}
    </div>
  );
}
