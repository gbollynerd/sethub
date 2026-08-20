import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/format";

const SCOPES = [
  "ledger", "payments", "dues", "expenses", "donations", "members", "full_report",
] as const;

type Scope = (typeof SCOPES)[number];

/**
 * Financial export. The database function does the permission check
 * (`finance.export`) and the row shaping; this handler only serialises.
 *
 *   GET /api/sets/:setId/finance/export?scope=ledger&format=csv&from=2026-01-01
 *
 * `format=csv` is written with a UTF-8 BOM so Excel opens it cleanly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> },
) {
  const { setId } = await params;
  const url = new URL(request.url);

  const scope = (url.searchParams.get("scope") ?? "ledger") as Scope;
  const format = url.searchParams.get("format") ?? "csv";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const departmentId = url.searchParams.get("department");

  if (!SCOPES.includes(scope)) {
    return NextResponse.json({ error: `Unknown scope "${scope}"` }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supabase.rpc("finance_export_data", {
    p_set_id: setId,
    p_scope: scope,
    p_from: from || null,
    p_to: to || null,
    p_department_id: departmentId || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const base = `sethub-${scope}-${stamp}`;

  // Record the export so the audit trail shows who pulled what.
  await supabase.from("finance_exports").insert({
    set_id: setId,
    department_id: departmentId || null,
    scope,
    format: format === "json" ? "json" : "csv",
    period_start: from || null,
    period_end: to || null,
    status: "ready",
    row_count: Array.isArray(data) ? data.length : null,
    file_name: `${base}.${format === "json" ? "json" : "csv"}`,
    requested_by: user.id,
    completed_at: new Date().toISOString(),
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${base}.json"`,
      },
    });
  }

  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : flatten(data);
  const csv = rows.length ? toCsv(rows) : "No data for the selected period";

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${base}.csv"`,
      "cache-control": "no-store",
    },
  });
}

/** The full_report scope returns an object of sections; flatten it for CSV. */
function flatten(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];
  const out: Record<string, unknown>[] = [];
  for (const [section, value] of Object.entries(data as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const row of value) {
        out.push({ section, ...(row as Record<string, unknown>) });
      }
    } else if (value && typeof value === "object") {
      out.push({ section, ...(value as Record<string, unknown>) });
    }
  }
  return out;
}
