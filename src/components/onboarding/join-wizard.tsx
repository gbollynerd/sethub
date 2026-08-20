"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, Spinner } from "@/components/forms";
import { Avatar, Badge } from "@/components/ui";
import {
  IconArrow, IconCheck, IconPlus, IconSchool, IconSearch, IconDepartment, IconChevron,
} from "@/components/icons";

interface Institution {
  id: string;
  name: string;
  short_name: string | null;
  type: string;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  has_houses: boolean;
  has_hostels: boolean;
  has_departments: boolean;
  has_prefects: boolean;
}

interface SetRow {
  id: string;
  name: string;
  graduation_year: number;
  member_count: number;
  join_policy: string;
  departments_enabled: boolean;
  programme_level: string;
}

interface Ref { id: string; name: string }

const TYPES = [
  { value: "", label: "All institution types" },
  { value: "secondary_school", label: "Secondary school" },
  { value: "university", label: "University" },
  { value: "polytechnic", label: "Polytechnic" },
  { value: "college_of_education", label: "College of education" },
  { value: "technical_school", label: "Technical school" },
  { value: "primary_school", label: "Primary school" },
  { value: "vocational", label: "Vocational institution" },
];

const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

const YEARS = Array.from({ length: new Date().getFullYear() + 6 - 1960 + 1 }, (_, i) => 1960 + i).reverse();

export function JoinWizard({ mode }: { mode: "join" | "create" }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(false);
  const [institution, setInstitution] = useState<Institution | null>(null);

  const [sets, setSets] = useState<SetRow[]>([]);
  const [chosenSet, setChosenSet] = useState<SetRow | null>(null);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());

  const [departments, setDepartments] = useState<Ref[]>([]);
  const [houses, setHouses] = useState<Ref[]>([]);
  const [hostels, setHostels] = useState<Ref[]>([]);

  const [form, setForm] = useState({
    nickname: "", student_id: "", course: "", class_arm: "",
    department_id: "", house_id: "", hostel_id: "",
    was_prefect: false, prefect_position: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /* Institution search */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      let q = supabase
        .from("institutions")
        .select("id, name, short_name, type, city, state, logo_url, has_houses, has_hostels, has_departments, has_prefects")
        .eq("is_active", true)
        .order("name")
        .limit(24);
      if (query.trim().length >= 2) q = q.ilike("name", `%${query.trim()}%`);
      if (typeFilter) q = q.eq("type", typeFilter);
      const { data } = await q;
      if (!cancelled) {
        setInstitutions((data ?? []) as Institution[]);
        setLoading(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, typeFilter, supabase]);

  /* Reference data once an institution is chosen */
  useEffect(() => {
    if (!institution) return;
    (async () => {
      const [setsRes, housesRes, hostelsRes] = await Promise.all([
        supabase
          .from("sets")
          .select("id, name, graduation_year, member_count, join_policy, departments_enabled, programme_level")
          .eq("institution_id", institution.id)
          .is("archived_at", null)
          .order("graduation_year", { ascending: false }),
        institution.has_houses
          ? supabase.from("institution_houses").select("id, name").eq("institution_id", institution.id).order("sort_order")
          : Promise.resolve({ data: [] }),
        institution.has_hostels
          ? supabase.from("institution_hostels").select("id, name").eq("institution_id", institution.id).order("sort_order")
          : Promise.resolve({ data: [] }),
      ]);
      setSets((setsRes.data ?? []) as SetRow[]);
      setHouses((housesRes.data ?? []) as Ref[]);
      setHostels((hostelsRes.data ?? []) as Ref[]);
    })();
  }, [institution, supabase]);

  /* Department list for the chosen set */
  useEffect(() => {
    if (!chosenSet?.departments_enabled) { setDepartments([]); return; }
    (async () => {
      const { data } = await supabase
        .from("set_departments")
        .select("id, name")
        .eq("set_id", chosenSet.id)
        .is("archived_at", null)
        .order("name");
      setDepartments((data ?? []) as Ref[]);
    })();
  }, [chosenSet, supabase]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        let setId = chosenSet?.id;

        if (!setId) {
          if (!institution) throw new Error("Choose an institution first.");
          const { data, error: createErr } = await supabase.rpc("create_set", {
            p_institution_id: institution.id,
            p_graduation_year: newYear,
            p_name: `Class of ${newYear}`,
            p_programme_level: "main",
            p_description: null,
            p_departments_enabled: institution.has_departments,
          });
          if (createErr) throw createErr;
          setId = data as string;
          router.push(`/s/${setId}?welcome=1`);
          router.refresh();
          return;
        }

        const { error: joinErr } = await supabase.rpc("join_set", {
          p_set_id: setId,
          p_department_id: form.department_id || null,
          p_profile: {
            nickname: form.nickname,
            student_id: form.student_id,
            course: form.course,
            class_arm: form.class_arm,
            house_id: form.house_id,
            hostel_id: form.hostel_id,
            was_prefect: form.was_prefect,
            prefect_position: form.prefect_position,
          },
        });
        if (joinErr) throw joinErr;

        router.push(chosenSet?.join_policy === "open" ? `/s/${setId}?welcome=1` : `/app/pending/${setId}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
    });
  };

  const steps = ["Find your school", mode === "create" ? "Choose the year" : "Pick your set", "Your details"];

  return (
    <div>
      <ol className="mb-9 flex items-center gap-2">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  done ? "bg-[var(--color-brand)] text-white"
                  : step === n ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)] ring-2 ring-[var(--color-brand)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-subtle)]"
                }`}
              >
                {done ? <IconCheck size={14} /> : n}
              </span>
              <span className={`hidden text-sm font-semibold sm:block ${step === n ? "text-[var(--color-ink)]" : "text-[var(--color-subtle)]"}`}>
                {label}
              </span>
              {n < steps.length ? <span className="h-px flex-1 bg-[var(--color-line)]" /> : null}
            </li>
          );
        })}
      </ol>

      {error ? <div className="mb-5"><Alert tone="error">{error}</Alert></div> : null}

      {/* ── Step 1 ──────────────────────────────────────────────────────── */}
      {step === 1 ? (
        <div className="animate-rise">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <IconSearch size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for your school…"
                className="field pl-11"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="field sm:w-56">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="mt-5 space-y-2">
            {loading ? (
              [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[4.5rem] w-full" />)
            ) : institutions.length === 0 ? (
              <div className="card-tint p-8 text-center">
                <p className="font-display text-base font-semibold">No school matched that</p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--color-muted)]">
                  Your school may not be on the platform yet. Recommend it and we will review and add it.
                </p>
                <a href="/onboarding/recommend" className="btn btn-soft btn-sm mt-4">
                  <IconPlus size={15} /> Recommend a school
                </a>
              </div>
            ) : (
              institutions.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => { setInstitution(inst); setStep(2); }}
                  className="card card-hover flex w-full items-center gap-4 p-4 text-left"
                >
                  <Avatar name={inst.short_name ?? inst.name} src={inst.logo_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[0.98rem] font-semibold">{inst.name}</p>
                    <p className="truncate text-sm text-[var(--color-muted)]">
                      {TYPE_LABEL[inst.type] ?? "Institution"}
                      {inst.city ? ` · ${inst.city}` : ""}{inst.state ? `, ${inst.state}` : ""}
                    </p>
                  </div>
                  <IconChevron size={17} className="shrink-0 text-[var(--color-subtle)]" />
                </button>
              ))
            )}
          </div>

          <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
            School not on the list?{" "}
            <a href="/onboarding/recommend" className="font-semibold text-[var(--color-brand-dark)]">
              Recommend your school
            </a>
          </p>
        </div>
      ) : null}

      {/* ── Step 2 ──────────────────────────────────────────────────────── */}
      {step === 2 && institution ? (
        <div className="animate-rise">
          <div className="card mb-6 flex items-center gap-4 p-4">
            <Avatar name={institution.short_name ?? institution.name} src={institution.logo_url} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[0.98rem] font-semibold">{institution.name}</p>
              <p className="text-sm text-[var(--color-muted)]">{TYPE_LABEL[institution.type]}</p>
            </div>
            <button onClick={() => { setInstitution(null); setChosenSet(null); setStep(1); }} className="btn btn-quiet btn-sm">
              Change
            </button>
          </div>

          {mode === "join" && sets.length > 0 ? (
            <>
              <h2 className="t-h3 mb-3">Which set are you in?</h2>
              <div className="scroll-slim max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                {sets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setChosenSet(s); setStep(3); }}
                    className="card card-hover flex w-full items-center gap-4 p-4 text-left"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] font-display text-sm font-bold text-[var(--color-brand-deep)]">
                      {String(s.graduation_year).slice(-2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[0.96rem] font-semibold">{s.name}</p>
                      <p className="text-sm text-[var(--color-muted)]">
                        {s.member_count} members ·{" "}
                        {s.join_policy === "open" ? "Anyone can join" : "Approval required"}
                      </p>
                    </div>
                    {s.departments_enabled ? <Badge tone="plum" icon="department">Departments</Badge> : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <div className={sets.length && mode === "join" ? "mt-7 border-t border-[var(--color-line)] pt-6" : ""}>
            <h2 className="t-h3 mb-1.5">
              {mode === "create" ? "Which year did you graduate?" : "Do not see your set?"}
            </h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">
              Create it and you become its first custodian — you can transfer ownership to the EXCO later.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="field sm:w-56"
                aria-label="Graduation year"
              >
                {YEARS.map((y) => <option key={y} value={y}>Class of {y}</option>)}
              </select>
              <button
                onClick={() => { setChosenSet(null); submit(); }}
                disabled={pending || sets.some((s) => s.graduation_year === newYear && s.programme_level === "main")}
                className="btn btn-primary"
              >
                {pending ? <><Spinner /> Creating…</> : <><IconPlus size={16} /> Create Class of {newYear}</>}
              </button>
            </div>
            {sets.some((s) => s.graduation_year === newYear && s.programme_level === "main") ? (
              <p className="mt-2 text-xs text-[var(--color-caution)]">
                Class of {newYear} already exists — pick it from the list above instead.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── Step 3 ──────────────────────────────────────────────────────── */}
      {step === 3 && institution && chosenSet ? (
        <div className="animate-rise">
          <div className="card mb-6 flex items-center gap-4 p-4">
            <IconSchool size={22} className="shrink-0 text-[var(--color-brand)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[0.96rem] font-semibold">
                {institution.name} · {chosenSet.name}
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                {chosenSet.join_policy === "open"
                  ? "You will be added immediately."
                  : "An administrator will review your request."}
              </p>
            </div>
            <button onClick={() => setStep(2)} className="btn btn-quiet btn-sm">Change</button>
          </div>

          <h2 className="t-h3">Your details in this set</h2>
          <p className="mb-5 mt-1 text-sm text-[var(--color-muted)]">
            This information belongs to this community only. Your other sets never see it.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="School nickname" value={form.nickname} onChange={(v) => setForm({ ...form, nickname: v })} placeholder="What were you called?" />
            <Text
              label="Student ID / admission number" value={form.student_id}
              onChange={(v) => setForm({ ...form, student_id: v })}
              placeholder="Optional" hint="Never shown publicly — administrators only."
            />

            {chosenSet.departments_enabled && departments.length ? (
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="department">Department</label>
                <select
                  id="department" className="field" value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                >
                  <option value="">Choose your department…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-brand-dark)]">
                  <IconDepartment size={13} />
                  Your department is a closed community inside the set, with its own channels.
                </p>
              </div>
            ) : null}

            {institution.has_departments ? (
              <Text label="Course / programme" value={form.course} onChange={(v) => setForm({ ...form, course: v })} placeholder="B.Sc. Computer Science" />
            ) : (
              <Text label="Class / arm" value={form.class_arm} onChange={(v) => setForm({ ...form, class_arm: v })} placeholder="SS3 Science A" />
            )}

            {houses.length ? (
              <Picker label="House" value={form.house_id} onChange={(v) => setForm({ ...form, house_id: v })} options={houses} placeholder="Which house were you in?" />
            ) : null}
            {hostels.length ? (
              <Picker label="Hostel" value={form.hostel_id} onChange={(v) => setForm({ ...form, hostel_id: v })} options={hostels} placeholder="Where did you stay?" />
            ) : null}

            {institution.has_prefects ? (
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] p-3.5">
                  <input
                    type="checkbox" checked={form.was_prefect}
                    onChange={(e) => setForm({ ...form, was_prefect: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-brand)]"
                  />
                  <span className="text-sm font-semibold">I held a prefect position</span>
                </label>
                {form.was_prefect ? (
                  <div className="mt-3">
                    <Text label="Prefect position" value={form.prefect_position} onChange={(v) => setForm({ ...form, prefect_position: v })} placeholder="Senior Prefect" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={() => setStep(2)} className="btn btn-ghost">Back</button>
            <button onClick={submit} disabled={pending} className="btn btn-primary flex-1">
              {pending ? <><Spinner /> Joining…</> : <>Join {chosenSet.name} <IconArrow size={17} /></>}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Text({
  label, value, onChange, placeholder, hint,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint ? <p className="mt-1.5 text-xs text-[var(--color-subtle)]">{hint}</p> : null}
    </div>
  );
}

function Picker({
  label, value, onChange, options, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; options: Ref[]; placeholder: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
