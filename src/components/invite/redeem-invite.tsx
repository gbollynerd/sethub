"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { IconArrow } from "@/components/icons";

export function RedeemInvite({
  token,
  departmentName,
}: {
  token: string;
  departmentName: string | null;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [course, setCourse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const accept = () => {
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc("redeem_invite", {
        p_token: token,
        p_profile: { nickname, course },
      });
      if (err) {
        setError(err.message);
        return;
      }
      const result = data as { set_id: string; department_id: string | null } | null;
      if (result?.set_id) {
        router.push(
          result.department_id
            ? `/s/${result.set_id}/departments/${result.department_id}?welcome=1`
            : `/s/${result.set_id}?welcome=1`,
        );
        router.refresh();
      }
    });
  };

  return (
    <div>
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        Add a couple of details so your classmates recognise you
        {departmentName ? `, then you will land in the ${departmentName} community` : ""}.
      </p>

      {error ? <div className="mt-4"><Alert tone="error">{error}</Alert></div> : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="invite-nickname">School nickname</label>
          <input
            id="invite-nickname"
            className="field"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="What were you called?"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="invite-course">Course or class</label>
          <input
            id="invite-course"
            className="field"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="B.Sc. Computer Science"
          />
        </div>
      </div>

      <button onClick={accept} disabled={pending} className="btn btn-primary mt-6 w-full">
        {pending ? <><Spinner /> Joining…</> : <>Accept invite <IconArrow size={17} /></>}
      </button>
    </div>
  );
}
