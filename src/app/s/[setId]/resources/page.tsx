import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/workspace";
import { Badge, PageHeader } from "@/components/ui";
import { IconArrow, IconDocument, IconLink, IconPhoto } from "@/components/icons";

export const metadata = { title: "Resources" };
export const dynamic = "force-dynamic";

export default async function ResourcesPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const [albums, documents, links] = await Promise.all([
    supabase.from("albums").select("id", { count: "exact", head: true }).eq("set_id", setId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("set_id", setId),
    supabase.from("useful_links").select("id", { count: "exact", head: true }).eq("set_id", setId),
  ]);

  const tiles = [
    {
      href: `/s/${setId}/resources/albums`, icon: IconPhoto, title: "Albums & galleries",
      body: "Graduation day, reunions, school visits, EXCO handovers — the pictures nobody else has.",
      count: albums.count ?? 0, unit: "albums", tone: "bg-[var(--color-plum-soft)] text-[var(--color-plum)]",
    },
    {
      href: `/s/${setId}/resources/documents`, icon: IconDocument, title: "Documents",
      body: "Constitution, meeting minutes, financial reports, election records, school correspondence.",
      count: documents.count ?? 0, unit: "files", tone: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
    },
    {
      href: `/s/${setId}/resources/links`, icon: IconLink, title: "Useful links",
      body: "School website, alumni portal, payment page, the WhatsApp group, shared drives.",
      count: links.count ?? 0, unit: "links", tone: "bg-[var(--color-caution-soft)] text-[var(--color-caution)]",
    },
  ];

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Resources"
        description="The institutional memory of your set — kept somewhere the next EXCO can actually find it."
      />
      <div className="stagger grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card card-hover group flex flex-col p-6">
            <span className={`grid h-12 w-12 place-items-center rounded-[var(--radius-md)] ${t.tone}`}>
              <t.icon size={22} />
            </span>
            <div className="mt-4 flex items-center gap-2.5">
              <h2 className="t-h3">{t.title}</h2>
              <Badge>{t.count}</Badge>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">{t.body}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-dark)]">
              Open <IconArrow size={15} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
