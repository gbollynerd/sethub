import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Card, PageHeader, SectionHeader } from "@/components/ui";
import { Field, Select, SubmitButton, TextArea, Toggle } from "@/components/forms";
import { IconLock } from "@/components/icons";

export const metadata = { title: "My set profile" };
export const dynamic = "force-dynamic";

export default async function SetProfilePage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [{ data: membership }, { data: houses }, { data: hostels }] = await Promise.all([
    supabase
      .from("set_memberships")
      .select("id, nickname, school_name_used, student_id, admission_year, graduation_year, class_arm, course, house_id, hostel_id, hostel_room, was_prefect, prefect_position, prefect_year, clubs, fun_fact, department_id")
      .eq("id", ws.membershipId)
      .maybeSingle(),
    ws.set.institution.has_houses
      ? supabase.from("institution_houses").select("id, name").eq("institution_id", ws.set.institution.id).order("sort_order")
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    ws.set.institution.has_hostels
      ? supabase.from("institution_hostels").select("id, name").eq("institution_id", ws.set.institution.id).order("sort_order")
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);

  async function save(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);

    await supabase
      .from("set_memberships")
      .update({
        nickname: String(formData.get("nickname") ?? "").trim() || null,
        school_name_used: String(formData.get("school_name_used") ?? "").trim() || null,
        student_id: String(formData.get("student_id") ?? "").trim() || null,
        admission_year: Number(formData.get("admission_year")) || null,
        graduation_year: Number(formData.get("graduation_year")) || null,
        class_arm: String(formData.get("class_arm") ?? "").trim() || null,
        course: String(formData.get("course") ?? "").trim() || null,
        house_id: String(formData.get("house_id") ?? "") || null,
        hostel_id: String(formData.get("hostel_id") ?? "") || null,
        hostel_room: String(formData.get("hostel_room") ?? "").trim() || null,
        was_prefect: Boolean(formData.get("was_prefect")),
        prefect_position: String(formData.get("prefect_position") ?? "").trim() || null,
        prefect_year: Number(formData.get("prefect_year")) || null,
        clubs: String(formData.get("clubs") ?? "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        fun_fact: String(formData.get("fun_fact") ?? "").trim() || null,
      })
      .eq("id", workspace.membershipId);

    redirect(`/s/${setId}/settings/profile?saved=1`);
  }

  return (
    <div className="mx-auto max-w-[52rem]">
      <PageHeader
        eyebrow={`${ws.set.institution.name} · ${ws.set.name}`}
        title="My profile in this set"
        description="This information belongs to this community only. Your other sets never see it — and your global account details stay separate."
      />

      <Card>
        <SectionHeader title="Who you were here" />
        <form action={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="School nickname" name="nickname" defaultValue={membership?.nickname ?? ""} placeholder="What were you called?" />
            <Field label="Name you were known by" name="school_name_used" defaultValue={membership?.school_name_used ?? ""} placeholder="If it differs from your name today" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Admission year" name="admission_year" type="number" min={1950} max={2100} defaultValue={membership?.admission_year ?? ""} />
            <Field label="Graduation year" name="graduation_year" type="number" min={1950} max={2100} defaultValue={membership?.graduation_year ?? ws.set.graduation_year} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {ws.set.institution.has_departments ? (
              <Field label="Course / programme" name="course" defaultValue={membership?.course ?? ""} placeholder="B.Sc. Computer Science" />
            ) : (
              <Field label="Class / arm" name="class_arm" defaultValue={membership?.class_arm ?? ""} placeholder="SS3 Science A" />
            )}
            <Field
              label="Student ID" name="student_id" defaultValue={membership?.student_id ?? ""}
              hint="Never shown publicly — administrators only."
            />
          </div>

          {houses?.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="House" name="house_id" placeholder="Choose your house"
                defaultValue={membership?.house_id ?? ""}
                options={houses.map((h) => ({ value: h.id, label: h.name }))}
              />
              {hostels?.length ? (
                <Select
                  label="Hostel" name="hostel_id" placeholder="Choose your hostel"
                  defaultValue={membership?.hostel_id ?? ""}
                  options={hostels.map((h) => ({ value: h.id, label: h.name }))}
                />
              ) : null}
            </div>
          ) : hostels?.length ? (
            <Select
              label="Hostel / hall" name="hostel_id" placeholder="Choose your hall"
              defaultValue={membership?.hostel_id ?? ""}
              options={hostels.map((h) => ({ value: h.id, label: h.name }))}
            />
          ) : null}

          {hostels?.length ? (
            <Field label="Room" name="hostel_room" defaultValue={membership?.hostel_room ?? ""} placeholder="Room 14, bunk 3" />
          ) : null}

          {ws.set.institution.has_prefects ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
              <Toggle label="I held a prefect position" name="was_prefect" defaultChecked={membership?.was_prefect} />
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Position" name="prefect_position" defaultValue={membership?.prefect_position ?? ""} placeholder="Senior Prefect" />
                <Field label="Year" name="prefect_year" type="number" min={1950} max={2100} defaultValue={membership?.prefect_year ?? ""} />
              </div>
            </div>
          ) : null}

          <Field
            label="Clubs & societies" name="clubs"
            defaultValue={(membership?.clubs ?? []).join(", ")}
            placeholder="Press Club, JETS, Choir"
            hint="Separate them with commas."
          />

          <TextArea
            label="One thing about you back then" name="fun_fact" rows={2}
            defaultValue={membership?.fun_fact ?? ""}
            placeholder="Captained the football team, never once won a match"
          />

          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">Save my set profile</SubmitButton>

          <p className="flex items-center gap-2 text-xs text-[var(--color-subtle)]">
            <IconLock size={13} />
            Student identification numbers are never displayed publicly, in any set.
          </p>
        </form>
      </Card>
    </div>
  );
}
