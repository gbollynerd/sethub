import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunities, getUser } from "@/lib/workspace";
import { Badge, Card, PageHeader, SectionHeader } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea } from "@/components/forms";
import { IconLock } from "@/components/icons";
import { ProfilePhotoUploader } from "@/components/account/profile-photo-uploader";

export const metadata = { title: "My account" };
export const dynamic = "force-dynamic";

const EMPLOYMENT = [
  { value: "employed", label: "Employed" },
  { value: "self_employed", label: "Self-employed" },
  { value: "business_owner", label: "Business owner" },
  { value: "seeking", label: "Looking for work" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

const PRIVACY = [
  { value: "public", label: "Everyone on SetHub" },
  { value: "set_members", label: "Members of my sets" },
  { value: "department", label: "My department only" },
  { value: "admins", label: "Administrators only" },
  { value: "private", label: "Only me" },
];

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: profile }, { data: privacy }, communities] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("profile_privacy").select("*").eq("user_id", user.id).maybeSingle(),
    getCommunities(),
  ]);

  async function saveProfile(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const me = await getUser();
    if (!me) return;

    await supabase
      .from("profiles")
      .update({
        first_name: String(formData.get("first_name") ?? "").trim(),
        last_name: String(formData.get("last_name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim() || null,
        date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
        bio: String(formData.get("bio") ?? "").trim() || null,
        city: String(formData.get("city") ?? "").trim() || null,
        state: String(formData.get("state") ?? "").trim() || null,
        country: String(formData.get("country") ?? "").trim() || null,
        employment: String(formData.get("employment") ?? "") || null,
        profession: String(formData.get("profession") ?? "").trim() || null,
        employer: String(formData.get("employer") ?? "").trim() || null,
        linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
        website_url: String(formData.get("website_url") ?? "").trim() || null,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", me.id);

    redirect("/account?saved=1");
  }

  async function savePrivacy(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const me = await getUser();
    if (!me) return;

    await supabase.from("profile_privacy").upsert({
      user_id: me.id,
      date_of_birth: String(formData.get("date_of_birth") ?? "set_members"),
      phone: String(formData.get("phone") ?? "set_members"),
      email: String(formData.get("email") ?? "admins"),
      employment: String(formData.get("employment") ?? "set_members"),
      business: String(formData.get("business") ?? "public"),
      location: String(formData.get("location") ?? "set_members"),
      hostel: String(formData.get("hostel") ?? "set_members"),
      house: String(formData.get("house") ?? "set_members"),
    });

    redirect("/account?privacy=1");
  }

  const communityLabel = `${communities.length} ${communities.length === 1 ? "Community" : "Communities"}`;

  return (
    <div>
      <PageHeader
        eyebrow="Global account"
        title="My account"
        description="One account, shared across every set you belong to. School-specific details live on each membership, not here."
      />

      <Card className="mb-6">
        <div className="space-y-6">
          <div>
            <h2 className="t-h3">Profile</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Manage your personal information and profile photo.</p>
          </div>

          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-tight">{profile?.display_name ?? "Your name"}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{communityLabel}</Badge>
            </div>
          </div>

          <div className="border-t border-[var(--color-line)] pt-5">
            <ProfilePhotoUploader userId={user.id} name={profile?.display_name} currentUrl={profile?.avatar_url} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={profile?.display_name} src={profile?.avatar_url} size={64} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold">{profile?.display_name ?? "Your name"}</p>
              <p className="text-sm text-[var(--color-muted)]">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge icon="school">{communities.length} communities</Badge>
            </div>
          </div>
          <ProfilePhotoUploader userId={user.id} name={profile?.display_name} currentUrl={profile?.avatar_url} />
        </div>
      </Card>

      <Card className="mb-6">
        <SectionHeader title="About you" hint="Shared with the sets you belong to, subject to your privacy settings" />
        <form action={saveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="first_name" required defaultValue={profile?.first_name ?? ""} />
            <Field label="Last name" name="last_name" required defaultValue={profile?.last_name ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
            <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={profile?.date_of_birth ?? ""} />
          </div>
          <TextArea label="Bio" name="bio" rows={3} defaultValue={profile?.bio ?? ""} placeholder="A couple of lines about you today" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" name="city" defaultValue={profile?.city ?? ""} />
            <Field label="State" name="state" defaultValue={profile?.state ?? ""} />
            <Field label="Country" name="country" defaultValue={profile?.country ?? "Nigeria"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Employment" name="employment" options={EMPLOYMENT} defaultValue={profile?.employment ?? ""} placeholder="Choose…" />
            <Field label="Profession" name="profession" defaultValue={profile?.profession ?? ""} placeholder="Software engineer" />
            <Field label="Organisation" name="employer" defaultValue={profile?.employer ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="LinkedIn" name="linkedin_url" type="url" defaultValue={profile?.linkedin_url ?? ""} />
            <Field label="Website" name="website_url" type="url" defaultValue={profile?.website_url ?? ""} />
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save profile</SubmitButton>
        </form>
      </Card>

      <Card>
        <SectionHeader
          title="Privacy"
          hint="Decide who sees each field. Student ID numbers are never public, whatever you choose."
        />
        <form action={savePrivacy} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Date of birth" name="date_of_birth" options={PRIVACY} defaultValue={privacy?.date_of_birth ?? "set_members"} />
            <Select label="Phone number" name="phone" options={PRIVACY} defaultValue={privacy?.phone ?? "set_members"} />
            <Select label="Email address" name="email" options={PRIVACY} defaultValue={privacy?.email ?? "admins"} />
            <Select label="Employment" name="employment" options={PRIVACY} defaultValue={privacy?.employment ?? "set_members"} />
            <Select label="Business" name="business" options={PRIVACY} defaultValue={privacy?.business ?? "public"} />
            <Select label="Location" name="location" options={PRIVACY} defaultValue={privacy?.location ?? "set_members"} />
            <Select label="Hostel" name="hostel" options={PRIVACY} defaultValue={privacy?.hostel ?? "set_members"} />
            <Select label="House" name="house" options={PRIVACY} defaultValue={privacy?.house ?? "set_members"} />
          </div>
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save privacy settings</SubmitButton>
          <p className="flex items-center gap-2 text-xs text-[var(--color-subtle)]">
            <IconLock size={13} /> These settings apply everywhere — in every set you belong to.
          </p>
        </form>
      </Card>
    </div>
  );
}
