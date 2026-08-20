import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/workspace";
import { Alert, Field, Select, SubmitButton, TextArea } from "@/components/forms";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Recommend a school" };

const TYPES = [
  { value: "secondary_school", label: "Secondary school" },
  { value: "university", label: "University" },
  { value: "polytechnic", label: "Polytechnic" },
  { value: "college_of_education", label: "College of education" },
  { value: "technical_school", label: "Technical school" },
  { value: "primary_school", label: "Primary school" },
  { value: "vocational", label: "Vocational institution" },
  { value: "seminary", label: "Seminary" },
  { value: "other", label: "Other" },
];

async function submitRecommendation(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  await supabase.from("school_recommendations").insert({
    submitted_by: user.id,
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "other"),
    city: String(formData.get("city") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    founded_year: Number(formData.get("founded_year")) || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  revalidatePath("/onboarding/recommend");
}

export default async function RecommendPage() {
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("school_recommendations")
    .select("id, name, type, status, created_at, review_note")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="animate-rise">
      <h1 className="t-h1">Your school is not on the list?</h1>
      <p className="t-lead mb-9 mt-2.5 max-w-xl">
        Tell us about it. Our team reviews every recommendation, and once it is approved the
        school appears in the directory for everyone — you included.
      </p>

      <form action={submitRecommendation} className="card space-y-4 p-6">
        <Field label="School name" name="name" required placeholder="Federal Government College, Odogbolu" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Institution type" name="type" required options={TYPES} placeholder="Choose a type…" />
          <Field label="Year founded" name="founded_year" type="number" min={1700} max={new Date().getFullYear()} placeholder="1978" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City / town" name="city" placeholder="Odogbolu" />
          <Field label="State" name="state" placeholder="Ogun" />
        </div>
        <Field label="Website" name="website" type="url" placeholder="https://…" hint="Helps us verify the school faster." />
        <TextArea
          label="Anything else we should know?" name="notes" rows={3}
          placeholder="Boys only, boarding, has six houses…"
        />
        <SubmitButton pendingLabel="Submitting…">Submit recommendation</SubmitButton>
      </form>

      {mine?.length ? (
        <section className="mt-10">
          <h2 className="t-h3 mb-3">Your recommendations</h2>
          <ul className="space-y-2">
            {mine.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold">{r.name}</p>
                  <p className="text-xs text-[var(--color-subtle)]">
                    Submitted {formatDate(r.created_at)}
                    {r.review_note ? ` · ${r.review_note}` : ""}
                  </p>
                </div>
                <Badge
                  tone={r.status === "verified" ? "positive" : r.status === "rejected" ? "critical" : "caution"}
                >
                  {r.status === "verified" ? "Approved" : r.status === "rejected" ? "Not approved" : "Under review"}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8">
        <Alert tone="info">
          While you wait, you can still join any other set you belong to.{" "}
          <Link href="/onboarding/join" className="font-semibold underline">Search the directory</Link>
        </Alert>
      </div>
    </div>
  );
}

// Personalised to the signed-in user — never prerender at build time.
export const dynamic = "force-dynamic";
