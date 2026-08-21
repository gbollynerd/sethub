import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { ElectionPositionBuilder } from "@/components/elections/election-position-builder";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";

export const metadata = { title: "Create an election" };

const ELIGIBILITY_OPTIONS = [
  { value: "active_members", label: "All active members" },
  { value: "verified_members", label: "Verified members only" },
  { value: "paid_up_members", label: "Members with dues paid" },
  { value: "department", label: "Members of the selected department" },
  { value: "custom", label: "A custom eligibility rule" },
];

function asDate(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function NewElectionPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const canManage = can(ws, "elections.manage");

  if (!can(ws, "elections.create")) redirect(`/s/${setId}/elections`);

  async function createElection(formData: FormData) {
    "use server";
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "elections.create")) redirect(`/s/${setId}/elections`);

    const title = String(formData.get("title") ?? "").trim();
    const eligibility = String(formData.get("eligibility") ?? "active_members");
    const departmentId = String(formData.get("department_id") ?? "") || null;
    const nominationsOpenAt = asDate(formData.get("nominations_open_at"));
    const nominationsCloseAt = asDate(formData.get("nominations_close_at"));
    const votingOpensAt = asDate(formData.get("voting_opens_at"));
    const votingClosesAt = asDate(formData.get("voting_closes_at"));

    if (!title || (eligibility === "department" && !departmentId)) return;
    const dates = [nominationsOpenAt, nominationsCloseAt, votingOpensAt, votingClosesAt];
    if (!nominationsOpenAt || !nominationsCloseAt || !votingOpensAt || !votingClosesAt || new Set(dates).size !== dates.length) return;
    if (!(nominationsOpenAt < nominationsCloseAt && nominationsCloseAt <= votingOpensAt && votingOpensAt < votingClosesAt)) return;

    const supabase = await createClient();
    const eligibilityQuery = supabase
      .from("set_memberships")
      .select("id", { count: "exact", head: true })
      .eq("set_id", setId)
      .eq("status", "active");
    const { count: eligibleCount } = await eligibilityQuery;

    const { data: election, error } = await supabase
      .from("elections")
      .insert({
        set_id: setId,
        department_id: departmentId,
        title,
        description: String(formData.get("description") ?? "").trim() || null,
        rules: String(formData.get("rules") ?? "").trim() || null,
        nominations_open_at: nominationsOpenAt,
        nominations_close_at: nominationsCloseAt,
        voting_opens_at: votingOpensAt,
        voting_closes_at: votingClosesAt,
        is_anonymous: Boolean(formData.get("is_anonymous")),
        eligibility,
        eligibility_note: String(formData.get("eligibility_note") ?? "").trim() || null,
        min_dues_paid: eligibility === "paid_up_members",
        eligible_count: eligibleCount ?? 0,
        created_by: workspace.userId,
      })
      .select("id")
      .single();

    if (error || !election) redirect(`/s/${setId}/elections/new`);

    if (can(workspace, "elections.manage")) {
      const titles = formData.getAll("position_title");
      const descriptions = formData.getAll("position_description");
      const seats = formData.getAll("position_seats");
      const positions = titles
        .map((rawTitle, index) => ({
          election_id: election.id,
          title: String(rawTitle).trim(),
          description: String(descriptions[index] ?? "").trim() || null,
          seats: Math.min(20, Math.max(1, Number(seats[index]) || 1)),
          sort_order: index,
        }))
        .filter((position) => position.title);
      if (positions.length) await supabase.from("election_positions").insert(positions);
    }

    redirect(`/s/${setId}/elections/${election.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/elections`} className="btn btn-quiet btn-sm mb-4">← Back to elections</Link>
      <h1 className="t-h1">Create an election</h1>
      <p className="t-lead mb-7 mt-2">Start with a private draft. Review the timetable, eligibility and positions before opening nominations.</p>

      <Card>
        <form action={createElection} className="space-y-6">
          <section className="space-y-4">
            <div><h2 className="font-display text-lg font-semibold">Election details</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Give members enough context to know what they are voting for.</p></div>
            <Field label="Election title" name="title" required placeholder="2026 Executive Committee Election" />
            <TextArea label="Description" name="description" rows={3} placeholder="A short overview of this election and the term it covers." />
            <TextArea label="Election rules" name="rules" rows={4} placeholder="Nomination requirements, campaign rules, tie-breaking process…" hint="These rules will be visible to every eligible voter." />
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div><h2 className="font-display text-lg font-semibold">Who can vote</h2><p className="mt-1 text-sm text-[var(--color-muted)]">The election stays a draft until you decide to open it.</p></div>
            <Select label="Voter eligibility" name="eligibility" options={ELIGIBILITY_OPTIONS} defaultValue="active_members" />
            {ws.departments.length ? <Select label="Department scope" name="department_id" options={ws.departments.map((department) => ({ value: department.id, label: department.name }))} placeholder="Whole set" hint="Required when eligibility is limited to a department." /> : null}
            <Field label="Eligibility note" name="eligibility_note" placeholder="e.g. Graduating class of 2016 only" hint="Add context members should see alongside the eligibility rule." />
            <Toggle label="Use a secret ballot" name="is_anonymous" defaultChecked hint="Members receive a receipt proving they voted, never how they voted." />
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div><h2 className="font-display text-lg font-semibold">Election timetable</h2><p className="mt-1 text-sm text-[var(--color-muted)]">All four dates are required and will be shown in the election record.</p></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Nominations open" name="nominations_open_at" type="datetime-local" required /><Field label="Nominations close" name="nominations_close_at" type="datetime-local" required /></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Voting opens" name="voting_opens_at" type="datetime-local" required /><Field label="Voting closes" name="voting_closes_at" type="datetime-local" required /></div>
          </section>

          {canManage ? <ElectionPositionBuilder /> : null}
          {!canManage ? <p className="rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] p-3.5 text-sm text-[var(--color-brand-deep)]">Your draft will be created without positions. An election manager can add the positions and review candidates.</p> : null}

          <SubmitButton pendingLabel="Creating draft…">Create election draft</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
