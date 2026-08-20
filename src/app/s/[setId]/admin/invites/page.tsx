import Link from "next/link";
import { redirect } from "next/navigation";
import { can, getWorkspace } from "@/lib/workspace";
import { Card, PageHeader, SectionHeader } from "@/components/ui";
import { InviteManager } from "@/components/admin/invite-manager";
import { IconDepartment, IconLock, IconWhatsapp } from "@/components/icons";

export const metadata = { title: "Invite links" };
export const dynamic = "force-dynamic";

export default async function InvitesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);

  const canInviteSet = can(ws, "members.invite");
  const myDeptAdminships = ws.departments.filter((d) => ws.departmentAdminIds.includes(d.id));

  if (!canInviteSet && myDeptAdminships.length === 0) redirect(`/s/${setId}`);

  return (
    <div className="mx-auto max-w-[62rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Invite links"
        description="One link, dropped in the WhatsApp group, is how most sets fill up. Codes and QR work too — useful when you are reading it out at a meeting."
      />

      {canInviteSet ? (
        <Card className="mb-6">
          <SectionHeader
            title={`Invite to ${ws.set.name}`}
            hint="New members land in the set-wide space and can pick a department afterwards"
          />
          <InviteManager setId={setId} scopeLabel={`${ws.set.institution.name} — ${ws.set.name}`} />
        </Card>
      ) : null}

      {myDeptAdminships.length ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2.5">
            <IconDepartment size={19} className="text-[var(--color-brand)]" />
            <h2 className="t-h3">Department invites you can issue</h2>
          </div>
          {myDeptAdminships.map((d) => (
            <Card key={d.id}>
              <SectionHeader
                title={d.name}
                hint="Recipients join the set and this department in one step"
                href={`/s/${setId}/departments/${d.id}`}
                linkLabel="Open department"
              />
              <InviteManager setId={setId} departmentId={d.id} scopeLabel={d.name} />
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="mt-6 !bg-[var(--color-surface-2)]">
        <SectionHeader title="How invites behave" />
        <ul className="space-y-3 text-sm leading-relaxed text-[var(--color-muted)]">
          <li className="flex gap-3">
            <IconWhatsapp size={17} className="mt-0.5 shrink-0 text-[var(--color-positive)]" />
            <span>
              <strong className="text-[var(--color-ink)]">Share anywhere.</strong> The WhatsApp button
              opens a pre-written message. The QR code is handy for a printed reunion flyer.
            </span>
          </li>
          <li className="flex gap-3">
            <IconLock size={17} className="mt-0.5 shrink-0 text-[var(--color-brand)]" />
            <span>
              <strong className="text-[var(--color-ink)]">Auto-approve or review.</strong> Turn
              auto-approve off and every arrival still needs an administrator to say yes.
            </span>
          </li>
          <li className="flex gap-3">
            <IconDepartment size={17} className="mt-0.5 shrink-0 text-[var(--color-plum)]" />
            <span>
              <strong className="text-[var(--color-ink)]">Department admins have their own.</strong>{" "}
              A department administrator can invite straight into their community without needing
              set-wide permission.
            </span>
          </li>
        </ul>
        <Link href={`/s/${setId}/admin/members`} className="btn btn-ghost btn-sm mt-5">
          Review who has joined
        </Link>
      </Card>
    </div>
  );
}
