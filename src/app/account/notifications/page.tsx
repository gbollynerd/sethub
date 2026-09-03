import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/workspace";
import { Card, PageHeader, SectionHeader } from "@/components/ui";
import { Field, Select, SubmitButton, Toggle } from "@/components/forms";

export const metadata = { title: "Notification preferences" };
export const dynamic = "force-dynamic";

const DIGEST_OPTIONS = [
  { value: "off", label: "Don't send a digest — in-app only" },
  { value: "realtime", label: "As things happen" },
  { value: "daily", label: "Once a day" },
  { value: "weekly", label: "Once a week" },
];

const TOPICS: Array<{ name: string; label: string; hint?: string }> = [
  { name: "announcements", label: "Announcements", hint: "Posts from your set's administrators" },
  { name: "events", label: "Events", hint: "New events added to the calendar" },
  { name: "elections", label: "Elections", hint: "Nominations opening, voting reminders" },
  { name: "polls_quizzes", label: "Polls & quizzes", hint: "New polls and quizzes to take part in" },
  { name: "projects", label: "Projects", hint: "New projects proposed by your sets" },
  { name: "dues", label: "Dues", hint: "Dues assignments and reminders" },
  { name: "payments", label: "Payments", hint: "Payment confirmations and receipts" },
  { name: "admin_actions", label: "Administrative actions", hint: "Membership approvals, EXCO appointments, and similar decisions about you" },
  { name: "messages", label: "Messages", hint: "New messages in channels you're part of" },
  { name: "mentions", label: "Mentions", hint: "Whenever someone @mentions you" },
];

export default async function NotificationPreferencesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  async function save(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const me = await getUser();
    if (!me) return;

    const payload: Record<string, unknown> = {
      user_id: me.id,
      digest_frequency: String(formData.get("digest_frequency") ?? "daily"),
      quiet_hours_start: String(formData.get("quiet_hours_start") ?? "") || null,
      quiet_hours_end: String(formData.get("quiet_hours_end") ?? "") || null,
    };
    for (const t of TOPICS) {
      payload[t.name] = Boolean(formData.get(t.name));
    }

    await supabase.from("notification_preferences").upsert(payload, { onConflict: "user_id" });

    redirect("/account/notifications?saved=1");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Global account"
        title="Notification preferences"
        description="Choose what shows up in your notification bell. This applies across every community you belong to."
      />

      <Card>
        <form action={save} className="space-y-6">
          <section>
            <SectionHeader title="What to notify me about" />
            <div className="space-y-3.5">
              {TOPICS.map((t) => (
                <Toggle
                  key={t.name}
                  label={t.label}
                  name={t.name}
                  hint={t.hint}
                  defaultChecked={(prefs?.[t.name] as boolean | undefined) ?? true}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-[var(--color-line)] pt-6">
            <SectionHeader title="Delivery" hint="In-app notifications always show in the bell — this only affects any email digest." />
            <Select
              label="Email digest"
              name="digest_frequency"
              options={DIGEST_OPTIONS}
              defaultValue={prefs?.digest_frequency ?? "daily"}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Quiet hours start"
                name="quiet_hours_start"
                type="time"
                defaultValue={prefs?.quiet_hours_start ?? ""}
                hint="No push notifications during quiet hours."
              />
              <Field
                label="Quiet hours end"
                name="quiet_hours_end"
                type="time"
                defaultValue={prefs?.quiet_hours_end ?? ""}
              />
            </div>
          </section>

          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save preferences
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
