import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { IconPhoto, IconPlus } from "@/components/icons";
import { first } from "@/lib/rows";
import { formatDate, titleCase } from "@/lib/format";

export const metadata = { title: "Albums" };
export const dynamic = "force-dynamic";

export default async function AlbumsPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  const { data: albums } = await supabase
    .from("albums")
    .select("id, title, description, cover_url, kind, taken_on, media_count, created_at, set_departments ( name )")
    .eq("set_id", setId)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Albums & galleries"
        description="Every reunion, school visit and graduation photograph in one place — the archive nobody else is keeping."
        action={
          can(ws, "albums.manage") ? (
            <Link href={`/s/${setId}/resources/albums/new`} className="btn btn-primary btn-sm">
              <IconPlus size={15} /> New album
            </Link>
          ) : undefined
        }
      />

      {!albums?.length ? (
        <EmptyState
          icon="photo"
          title="No albums yet"
          description="Start with the graduation photos. Somebody always has them on an old phone."
          action={
            can(ws, "albums.manage") ? (
              <Link href={`/s/${setId}/resources/albums/new`} className="btn btn-primary btn-sm">Create the first album</Link>
            ) : undefined
          }
        />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => {
            const dept = first(a.set_departments) as { name: string } | null;
            return (
              <Link key={a.id} href={`/s/${setId}/resources/albums/${a.id}`} className="card card-hover overflow-hidden p-0">
                <div className="relative aspect-[4/3] bg-[var(--color-surface-2)]">
                  {a.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover_url} alt={a.title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[var(--color-line-strong)]">
                      <IconPhoto size={46} />
                    </span>
                  )}
                  <span className="absolute bottom-2.5 right-2.5 chip bg-[var(--color-surface)]/92">
                    {a.media_count} photos
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="truncate font-display text-[0.98rem] font-semibold">{a.title}</h2>
                  <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">
                    {a.taken_on ? formatDate(a.taken_on) : formatDate(a.created_at)}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Badge>{titleCase(a.kind)}</Badge>
                    {dept ? <Badge tone="plum">{dept.name}</Badge> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
