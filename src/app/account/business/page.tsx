import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/workspace";
import { Card, PageHeader, SectionHeader } from "@/components/ui";
import { Field, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { slugify } from "@/lib/slug";

export const metadata = { title: "My business" };
export const dynamic = "force-dynamic";

export default async function BusinessPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  async function save(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const me = await getUser();
    if (!me) return;

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    const payload = {
      owner_id: me.id,
      name,
      slug: `${slugify(name)}-${me.id.slice(0, 6)}`,
      category: String(formData.get("category") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      website: String(formData.get("website") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
      instagram: String(formData.get("instagram") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      state: String(formData.get("state") ?? "").trim() || null,
      offerings: String(formData.get("offerings") ?? "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
      is_published: Boolean(formData.get("is_published")),
    };

    const { data: existing } = await supabase
      .from("businesses").select("id").eq("owner_id", me.id).maybeSingle();

    if (existing) {
      await supabase.from("businesses").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("businesses").insert(payload);
    }

    redirect("/account/business?saved=1");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Global account"
        title="My business"
        description="Listed once, discoverable in every set you belong to. Alumni buying from alumni is the quietest, most useful thing an association does."
      />

      <Card>
        <SectionHeader title="Business details" />
        <form action={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" name="name" required defaultValue={business?.name ?? ""} />
            <Field label="Category" name="category" defaultValue={business?.category ?? ""} placeholder="Interior design" />
          </div>
          <TextArea
            label="What you do" name="description" rows={3}
            defaultValue={business?.description ?? ""}
            placeholder="Two or three sentences a classmate could forward to someone else"
          />
          <Field
            label="Products & services" name="offerings"
            defaultValue={(business?.offerings ?? []).join(", ")}
            placeholder="Space planning, furniture sourcing, project management"
            hint="Separate them with commas."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" name="phone" type="tel" defaultValue={business?.phone ?? ""} />
            <Field label="WhatsApp" name="whatsapp" type="tel" defaultValue={business?.whatsapp ?? ""} hint="With country code, e.g. 2348012345678" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" name="email" type="email" defaultValue={business?.email ?? ""} />
            <Field label="Website" name="website" type="url" defaultValue={business?.website ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Instagram" name="instagram" defaultValue={business?.instagram ?? ""} placeholder="@handle" />
            <Field label="City" name="city" defaultValue={business?.city ?? ""} />
            <Field label="State" name="state" defaultValue={business?.state ?? ""} />
          </div>
          <Toggle
            label="List it in my sets' business directories" name="is_published"
            defaultChecked={business?.is_published ?? true}
          />
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            {business ? "Update my business" : "List my business"}
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
