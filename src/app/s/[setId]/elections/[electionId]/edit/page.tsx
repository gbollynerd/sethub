import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Card } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { DeleteElectionButton } from "@/components/elections/delete-election-button";
import { ElectionPositionEditor } from "@/components/elections/election-position-editor";

export const metadata = { title: "Edit election" };
export const dynamic = "force-dynamic";

const ELIGIBILITY_OPTIONS = [
  { value: "active_members", label: "All active members" },
  { value: "verified_members", label: "Verified members only" },
  { value: "paid_up_members", label: "Members with dues paid" },
  { value: "department", label: "Members of the selected department" },
  { value: "custom", label: "A custom eligibility rule" },
];

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in the viewer's local time,
// not the UTC ISO string Postgres hands back.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function asDate(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function EditElectionPage({
  params,
}: {
  params: Promise<{ setId: string; electionId: string }>;
}) {
  const { setId, electionId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: election } = await supabase
    .from("elections")
    .select(
      "id, title, description, rules, eligibility, eligibility_note, is_anonymous, department_id, nominations_open_at, nominations_close_at, voting_opens_at, voting_closes_at",
    )
    .eq("id", electionId)
    .eq("set_id", setId)
    .maybeSingle();

  if (!election) notFound();
  if (!can(ws, "elections.manage", election.department_id as string | null)) {
    redirect(`/s/${setId}/elections/${electionId}`);
  }

  const { data: positions } = await supabase
    .from("election_positions")
    .select("id, title, description, seats, sort_order")
    .eq("election_id", electionId)
    .order("sort_order");

  async function updateElection(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);

    const { data: existing } = await supabase
      .from("elections")
      .select("id, department_id")
      .eq("id", electionId)
      .eq("set_id", setId)
      .maybeSingle();
    if (!existing) redirect(`/s/${setId}/elections`);
    if (!can(workspace, "elections.manage", existing.department_id as string | null)) {
      redirect(`/s/${setId}/elections/${electionId}`);
    }

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

    await supabase
      .from("elections")
      .update({
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
      })
      .eq("id", electionId)
      .eq("set_id", setId);

    redirect(`/s/${setId}/elections/${electionId}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/s/${setId}/elections/${electionId}`} className="btn btn-quiet btn-sm mb-4">← Back to election</Link>
      <h1 className="t-h1">Edit election</h1>
      <p className="t-lead mb-7 mt-2">Changes apply immediately to the election record.</p>

      <Card>
        <form action={updateElection} className="space-y-6">
          <section className="space-y-4">
            <div><h2 className="font-display text-lg font-semibold">Election details</h2></div>
            <Field label="Election title" name="title" required defaultValue={election.title} />
            <TextArea label="Description" name="description" rows={3} defaultValue={election.description ?? ""} />
            <TextArea label="Election rules" name="rules" rows={4} defaultValue={election.rules ?? ""} />
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div><h2 className="font-display text-lg font-semibold">Who can vote</h2></div>
            <Select label="Voter eligibility" name="eligibility" options={ELIGIBILITY_OPTIONS} defaultValue={election.eligibility} />
            {ws.departments.length ? (
              <Select
                label="Department scope" name="department_id"
                options={ws.departments.map((d) => ({ value: d.id, label: d.name }))}
                defaultValue={election.department_id ?? ""}
                placeholder="Whole set"
              />
            ) : null}
            <Field label="Eligibility note" name="eligibility_note" defaultValue={election.eligibility_note ?? ""} />
            <Toggle label="Use a secret ballot" name="is_anonymous" defaultChecked={election.is_anonymous} hint="Members receive a receipt proving they voted, never how they voted." />
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <div><h2 className="font-display text-lg font-semibold">Election timetable</h2></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nominations open" name="nominations_open_at" type="datetime-local" required defaultValue={toLocalInput(election.nominations_open_at)} />
              <Field label="Nominations close" name="nominations_close_at" type="datetime-local" required defaultValue={toLocalInput(election.nominations_close_at)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Voting opens" name="voting_opens_at" type="datetime-local" required defaultValue={toLocalInput(election.voting_opens_at)} />
              <Field label="Voting closes" name="voting_closes_at" type="datetime-local" required defaultValue={toLocalInput(election.voting_closes_at)} />
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
            <DeleteElectionButton setId={setId} electionId={electionId} />
            <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <ElectionPositionEditor
          electionId={electionId}
          positions={(positions ?? []).map((p) => ({
            id: p.id as string,
            title: p.title as string,
            description: p.description as string | null,
            seats: p.seats as number,
            sortOrder: p.sort_order as number,
          }))}
        />
      </div>
    </div>
  );
}
