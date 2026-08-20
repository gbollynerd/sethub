import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { can, getWorkspace } from "@/lib/workspace";
import { Badge, EmptyState, PageHeader, Table, Td, Tr } from "@/components/ui";
import { IconDocument, IconDownload, IconUpload } from "@/components/icons";
import { first } from "@/lib/rows";
import { formatDate, titleCase } from "@/lib/format";

export const metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

const CATEGORIES = [
  "", "constitution", "minutes", "financial", "project", "election",
  "correspondence", "form", "historical", "policy", "general",
];

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const ws = await getWorkspace(setId);
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select("id, title, description, category, file_name, mime_type, byte_size, version, created_at, set_departments ( name ), profiles ( display_name )")
    .eq("set_id", setId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (sp.category) query = query.eq("category", sp.category);

  const { data: documents } = await query;

  return (
    <div className="mx-auto max-w-[76rem]">
      <PageHeader
        eyebrow={ws.set.name}
        title="Documents"
        description="Constitution, minutes, financial statements, election records — the paperwork that outlives an executive."
        action={
          can(ws, "documents.manage") ? (
            <Link href={`/s/${setId}/resources/documents/new`} className="btn btn-primary btn-sm">
              <IconUpload size={15} /> Upload
            </Link>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c || "all"}
            href={c ? `/s/${setId}/resources/documents?category=${c}` : `/s/${setId}/resources/documents`}
            className={`chip transition ${(sp.category ?? "") === c ? "chip-brand" : "hover:border-[var(--color-ink)]"}`}
          >
            {c ? titleCase(c) : "All documents"}
          </Link>
        ))}
      </div>

      {!documents?.length ? (
        <EmptyState
          icon="document"
          title="No documents yet"
          description="Upload the constitution first — every new EXCO asks for it."
        />
      ) : (
        <Table headers={["Document", "Category", "Scope", "Uploaded", "Size", ""]}>
          {documents.map((d) => {
            const dept = first(d.set_departments) as { name: string } | null;
            const uploader = first(d.profiles) as { display_name: string | null } | null;
            return (
              <Tr key={d.id}>
                <Td>
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]">
                      <IconDocument size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className="block truncate text-xs text-[var(--color-subtle)]">
                        {d.file_name}{d.version > 1 ? ` · v${d.version}` : ""}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td><Badge>{titleCase(d.category)}</Badge></Td>
                <Td>{dept ? <Badge tone="plum">{dept.name}</Badge> : <span className="text-[var(--color-subtle)]">Set-wide</span>}</Td>
                <Td className="whitespace-nowrap text-[var(--color-muted)]">
                  {formatDate(d.created_at)}
                  {uploader?.display_name ? (
                    <span className="block text-xs text-[var(--color-subtle)]">{uploader.display_name}</span>
                  ) : null}
                </Td>
                <Td className="tabular whitespace-nowrap text-[var(--color-muted)]">
                  {d.byte_size ? `${(Number(d.byte_size) / 1024 / 1024).toFixed(1)} MB` : "—"}
                </Td>
                <Td className="text-right">
                  <span className="btn btn-quiet btn-sm"><IconDownload size={14} /> Open</span>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
