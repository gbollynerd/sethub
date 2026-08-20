import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, Card, EmptyState, PageHeader, SectionHeader } from "@/components/ui";
import { IconLink, IconPlus, IconWhatsapp, IconGlobe } from "@/components/icons";
import { titleCase } from "@/lib/format";

export const metadata = { title: "Useful links" };
export const dynamic = "force-dynamic";

const CATEGORIES = [
  { value: "school", label: "School" },
  { value: "alumni", label: "Alumni association" },
  { value: "payment", label: "Payment" },
  { value: "social", label: "Social / WhatsApp" },
  { value: "drive", label: "Shared drive" },
  { value: "project", label: "Project" },
  { value: "form", label: "Form" },
  { value: "other", label: "Other" },
];

export default async function LinksPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();
  const canManage = can(ws, "links.manage");

  const { data: links } = await supabase
    .from("useful_links")
    .select("id, title, url, description, category, is_pinned")
    .eq("set_id", setId)
    .order("is_pinned", { ascending: false })
    .order("sort_order");

  async function addLink(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const workspace = await getWorkspace(setId);
    if (!can(workspace, "links.manage")) return;

    await supabase.from("useful_links").insert({
      set_id: setId,
      title: String(formData.get("title") ?? "").trim(),
      url: String(formData.get("url") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      category: String(formData.get("category") ?? "other"),
      is_pinned: Boolean(formData.get("is_pinned")),
      created_by: workspace.userId,
    });

    redirect(`/s/${setId}/resources/links`);
  }

  return (
    <div className="mx-auto max-w-[62rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Useful links"
        description="The handful of URLs everybody keeps asking for — school website, payment portal, the WhatsApp group, the shared drive."
      />

      {!links?.length ? (
        <EmptyState icon="link" title="No links saved" description="Add the school website and the WhatsApp group to start." />
      ) : (
        <ul className="stagger mb-8 grid gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.id}>
              <a
                href={l.url} target="_blank" rel="noreferrer"
                className="card card-hover flex items-start gap-3.5 p-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                  {l.category === "social" ? <IconWhatsapp size={18} /> : l.category === "school" ? <IconGlobe size={18} /> : <IconLink size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display text-[0.95rem] font-semibold">{l.title}</span>
                    {l.is_pinned ? <Badge icon="pin">Pinned</Badge> : null}
                  </span>
                  {l.description ? (
                    <span className="mt-0.5 block truncate text-sm text-[var(--color-muted)]">{l.description}</span>
                  ) : null}
                  <span className="mt-1 block truncate text-xs text-[var(--color-subtle)]">{l.url}</span>
                </span>
                <Badge>{titleCase(l.category)}</Badge>
              </a>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <Card>
          <SectionHeader title="Add a link" />
          <form action={addLink} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="title">Title</label>
              <input id="title" name="title" required className="field" placeholder="Class of 2012 WhatsApp group" />
            </div>
            <div>
              <label className="field-label" htmlFor="url">URL</label>
              <input id="url" name="url" type="url" required className="field" placeholder="https://chat.whatsapp.com/…" />
            </div>
            <div>
              <label className="field-label" htmlFor="category">Category</label>
              <select id="category" name="category" className="field">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="description">Description</label>
              <input id="description" name="description" className="field" placeholder="Main group — everyone" />
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm sm:col-span-2">
              <input type="checkbox" name="is_pinned" className="h-4 w-4 accent-[var(--color-brand)]" />
              Pin to the top
            </label>
            <button className="btn btn-primary sm:col-span-2">
              <IconPlus size={16} /> Add link
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
