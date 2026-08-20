import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/workspace";
import { Logo } from "@/components/brand";
import { Avatar, Badge } from "@/components/ui";
import { IconDepartment, IconPeople, IconSchool } from "@/components/icons";
import { RedeemInvite } from "@/components/invite/redeem-invite";

export const metadata = { title: "You have been invited" };

interface Preview {
  invite_id: string;
  scope: string;
  set_id: string;
  set_name: string;
  institution_name: string;
  institution_logo: string | null;
  graduation_year: number;
  department_id: string | null;
  department_name: string | null;
  member_count: number;
  is_valid: boolean;
  reason: string | null;
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const user = await getUser();

  const { data } = await supabase.rpc("preview_invite", { p_token: token });
  const invite = (Array.isArray(data) ? data[0] : data) as Preview | undefined;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-[var(--color-line)]">
        <div className="mx-auto flex max-w-[44rem] items-center justify-between px-5 py-4 sm:px-8">
          <Logo href="/" />
          {!user ? <Link href="/login" className="btn btn-quiet btn-sm">Sign in</Link> : null}
        </div>
      </header>

      <main className="mx-auto max-w-[44rem] px-5 py-14 sm:px-8">
        {!invite ? (
          <div className="card animate-rise p-10 text-center">
            <h1 className="t-h2">This invite link is not valid</h1>
            <p className="t-lead mx-auto mt-3 max-w-sm">
              It may have been mistyped or revoked. Ask whoever shared it to send you a fresh link.
            </p>
            <Link href="/onboarding/join" className="btn btn-primary mt-7">Find my set instead</Link>
          </div>
        ) : (
          <div className="card animate-rise overflow-hidden p-0">
            <div className="relative overflow-hidden bg-gradient-to-br from-[var(--color-brand-deep)] to-[var(--color-brand)] px-8 py-10 text-center text-white">
              <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <Avatar
                  name={invite.institution_name}
                  src={invite.institution_logo}
                  size={64}
                  ring
                />
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-white/65">
                  You have been invited to join
                </p>
                <h1 className="mt-2 font-display text-[1.9rem] font-semibold leading-tight tracking-tight">
                  {invite.institution_name}
                </h1>
                <p className="mt-1 text-white/80">{invite.set_name}</p>

                {invite.department_name ? (
                  <span className="chip mt-4 border-white/25 bg-white/15 text-white">
                    <IconDepartment size={14} /> {invite.department_name} department
                  </span>
                ) : null}
              </div>
            </div>

            <div className="p-7 sm:p-8">
              <div className="mb-6 flex flex-wrap gap-2">
                <Badge icon="people">{invite.member_count} members</Badge>
                <Badge icon="school">Class of {invite.graduation_year}</Badge>
                {invite.scope === "department" ? (
                  <Badge tone="plum" icon="department">Department invite</Badge>
                ) : null}
              </div>

              {!invite.is_valid ? (
                <div className="rounded-[var(--radius-sm)] bg-[var(--color-critical-soft)] px-4 py-3.5 text-sm text-[var(--color-critical)]">
                  {invite.reason ?? "This invite is no longer usable."}
                </div>
              ) : user ? (
                <RedeemInvite token={token} departmentName={invite.department_name} />
              ) : (
                <div>
                  <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                    Create your SetHub account — or sign in — and you will be dropped straight into
                    this community. One account covers every set you belong to.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/signup?invite=${encodeURIComponent(token)}`}
                      className="btn btn-primary flex-1"
                    >
                      Create account & join
                    </Link>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                      className="btn btn-ghost flex-1"
                    >
                      I already have an account
                    </Link>
                  </div>
                </div>
              )}

              <div className="mt-8 grid gap-3 border-t border-[var(--color-line)] pt-6 sm:grid-cols-3">
                {[
                  { i: IconSchool, t: "Private to this set", d: "Nothing you post here reaches your other communities." },
                  { i: IconPeople, t: "Find your people", d: "Search by house, hostel, department or profession." },
                  { i: IconDepartment, t: "Open books", d: "Dues, expenses and project spending in plain view." },
                ].map((f) => (
                  <div key={f.t}>
                    <f.i size={18} className="text-[var(--color-brand)]" />
                    <p className="mt-2 text-sm font-semibold">{f.t}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]">{f.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Personalised to the signed-in user — never prerender at build time.
export const dynamic = "force-dynamic";
