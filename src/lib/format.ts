export function money(value: number | string | null | undefined, currency = "NGN") {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function compactMoney(value: number | string | null | undefined, currency = "NGN") {
  const n = Number(value ?? 0);
  if (Math.abs(n) < 1_000_000) return money(n, currency);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function num(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-NG").format(Number(value ?? 0));
}

export function pct(value: number | string | null | undefined, digits = 0) {
  return `${Number(value ?? 0).toFixed(digits)}%`;
}

const DATE_TZ = "Africa/Lagos";

export function formatDate(input: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DATE_TZ,
    ...opts,
  }).format(d);
}

export function formatDateTime(input: string | Date | null | undefined) {
  return formatDate(input, { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatTime(input: string | Date | null | undefined) {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: DATE_TZ,
  }).format(d);
}

export function relativeTime(input: string | Date | null | undefined) {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["week", 604_800_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export function countdown(input: string | Date | null | undefined) {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "closed";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${mins}m left`;
}

export function initials(name: string | null | undefined, fallback = "?") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}

/** Stable pastel from any string — used for avatar and department chips. */
export function tintFor(seed: string) {
  const palette = [
    "#0898A0", "#6E6B8F", "#0F9D74", "#D9791C",
    "#1E88E5", "#B5539C", "#C4622D", "#3C7A6B",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function titleCase(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.map(titleCase).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: DATE_TZ }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
