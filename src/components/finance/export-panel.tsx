"use client";

import { useState } from "react";
import { IconDownload, IconGrid } from "@/components/icons";
import type { SetDepartment } from "@/lib/types";

const SCOPES = [
  { value: "ledger", label: "Full ledger", hint: "Every income and expense line" },
  { value: "payments", label: "Payments", hint: "Who paid what, when and how" },
  { value: "dues", label: "Dues position", hint: "Assigned, paid and outstanding per member" },
  { value: "expenses", label: "Expenses", hint: "Vendor, category, approver" },
  { value: "donations", label: "Donations", hint: "Campaign contributions" },
  { value: "members", label: "Member list", hint: "Directory with dues balances" },
  { value: "full_report", label: "Full financial report", hint: "Summary, monthly, categories, dues" },
];

/**
 * Export runs through an API route so the browser gets a proper file download
 * with a sensible filename; the permission check lives in the database.
 */
export function ExportPanel({ setId, departments }: { setId: string; departments: SetDepartment[] }) {
  const [scope, setScope] = useState("ledger");
  const [format, setFormat] = useState("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [department, setDepartment] = useState("");

  const href = () => {
    const q = new URLSearchParams({ scope, format });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (department) q.set("department", department);
    return `/api/sets/${setId}/finance/export?${q.toString()}`;
  };

  const active = SCOPES.find((s) => s.value === scope);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            onClick={() => setScope(s.value)}
            className={`rounded-[var(--radius-md)] border p-3 text-left transition ${
              scope === s.value
                ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
            }`}
          >
            <span className="block text-sm font-semibold">{s.label}</span>
            <span className="block text-xs text-[var(--color-muted)]">{s.hint}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="exp-from">From</label>
          <input id="exp-from" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="exp-to">To</label>
          <input id="exp-to" type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {departments.length ? (
        <div className="mt-3">
          <label className="field-label" htmlFor="exp-dept">Department</label>
          <select id="exp-dept" className="field" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Whole set</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      ) : null}

      <div className="mt-4">
        <label className="field-label">Format</label>
        <div className="flex gap-2">
          {[
            { value: "csv", label: "CSV / Excel" },
            { value: "json", label: "JSON" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={`btn btn-sm ${format === f.value ? "btn-primary" : "btn-ghost"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--color-subtle)]">
          CSV files carry a UTF-8 marker so Excel opens Naira amounts and names correctly.
        </p>
      </div>

      <a href={href()} download className="btn btn-primary mt-5 w-full">
        <IconDownload size={16} /> Download {active?.label.toLowerCase()}
      </a>

      <a
        href={`/s/${setId}/finances/reports/print${from || to ? `?from=${from}&to=${to}` : ""}`}
        target="_blank"
        rel="noreferrer"
        className="btn btn-ghost mt-2 w-full"
      >
        <IconGrid size={16} /> Open printable report (save as PDF)
      </a>
    </div>
  );
}
