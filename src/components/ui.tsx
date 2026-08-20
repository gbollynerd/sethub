import Link from "next/link";
import type { ReactNode } from "react";
import { initials, tintFor } from "@/lib/format";
import { Icon, IconArrow } from "@/components/icons";

/* ── Layout primitives ──────────────────────────────────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="t-eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="t-h1 text-balance">{title}</h1>
        {description ? (
          <p className="t-lead mt-2 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  hint,
  href,
  linkLabel = "See all",
}: {
  title: string;
  hint?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <div>
        <h2 className="t-h3">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-[var(--color-subtle)]">{hint}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-dark)] hover:text-[var(--color-brand-deep)]"
        >
          {linkLabel}
          <IconArrow size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <As className={`card p-5 sm:p-6 ${className}`}>{children}</As>;
}

export function EmptyState({
  icon = "sparkle",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-tint flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="t-h3">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/* ── Data display ───────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = "default",
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: string;
  tone?: "default" | "brand" | "positive" | "caution" | "critical" | "info";
  href?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
    brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
    positive: "bg-[var(--color-positive-soft)] text-[var(--color-positive)]",
    caution: "bg-[var(--color-caution-soft)] text-[var(--color-caution)]",
    critical: "bg-[var(--color-critical-soft)] text-[var(--color-critical)]",
    info: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  };

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.09em] text-[var(--color-subtle)]">
          {label}
        </p>
        {icon ? (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tones[tone]}`}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <p className="tabular mt-3 font-display text-[1.85rem] leading-none tracking-tight text-[var(--color-ink)]">
        {value}
      </p>
      {sub ? <p className="mt-2 text-sm text-[var(--color-muted)]">{sub}</p> : null}
    </>
  );

  const cls = "card card-hover block p-5";
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Avatar({
  name,
  src,
  size = 40,
  ring = false,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const color = tintFor(name ?? "sethub");
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.36) };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "Member"}
        style={style}
        className={`shrink-0 rounded-full object-cover ${ring ? "ring-2 ring-white" : ""}`}
      />
    );
  }
  return (
    <span
      style={{ ...style, backgroundColor: `${color}1f`, color }}
      className={`grid shrink-0 place-items-center rounded-full font-display font-semibold ${
        ring ? "ring-2 ring-white" : ""
      }`}
    >
      {initials(name)}
    </span>
  );
}

export function Progress({
  value,
  max = 100,
  tone = "brand",
  height = 8,
  label,
}: {
  value: number;
  max?: number;
  tone?: "brand" | "positive" | "caution" | "critical";
  height?: number;
  label?: string;
}) {
  const pctValue = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const colors: Record<string, string> = {
    brand: "var(--color-brand)",
    positive: "var(--color-positive)",
    caution: "var(--color-caution)",
    critical: "var(--color-critical)",
  };
  return (
    <div>
      {label ? (
        <div className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-[var(--color-muted)]">
          <span>{label}</span>
          <span className="tabular">{pctValue.toFixed(0)}%</span>
        </div>
      ) : null}
      <div
        className="w-full overflow-hidden rounded-full bg-[var(--color-line)]"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(pctValue)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bar-grow h-full rounded-full"
          style={{ width: `${pctValue}%`, background: colors[tone] }}
        />
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
  icon,
}: {
  children: ReactNode;
  tone?: "default" | "brand" | "positive" | "caution" | "critical" | "info" | "plum";
  icon?: string;
}) {
  const map: Record<string, string> = {
    default: "chip",
    brand: "chip chip-brand",
    positive: "chip chip-positive",
    caution: "chip chip-caution",
    critical: "chip chip-critical",
    info: "chip chip-info",
    plum: "chip chip-plum",
  };
  return (
    <span className={map[tone]}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}

export function Table({
  headers,
  children,
  dense = false,
}: {
  headers: string[];
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[38rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
              {headers.map((h) => (
                <th
                  key={h}
                  className={`whitespace-nowrap px-4 text-left text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--color-subtle)] ${
                    dense ? "py-2.5" : "py-3.5"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function Td({
  children,
  className = "",
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3.5 align-middle ${className}`}>
      {children}
    </td>
  );
}

export function Tr({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <tr className={`border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-surface-2)] ${className}`}>
      {children}
    </tr>
  );
}

/* ── Charts (dependency-free SVG) ───────────────────────────────────────── */

const CHART_COLORS = [
  "#0898A0", "#6E6B8F", "#0F9D74", "#D9791C",
  "#1E88E5", "#B5539C", "#3C7A6B", "#C4622D",
];

export function Donut({
  data,
  size = 168,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--color-line)" strokeWidth={thickness}
        />
        {total > 0 &&
          data.map((d, i) => {
            const frac = Math.max(0, d.value) / total;
            const dash = frac * c;
            const el = (
              <circle
                key={d.label}
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke={d.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += dash;
            return el;
          })}
        {centerValue ? (
          <>
            <text
              x="50%" y="47%" textAnchor="middle"
              className="font-display"
              style={{ fontSize: size * 0.15, fontWeight: 600, fill: "var(--color-ink)" }}
            >
              {centerValue}
            </text>
            <text
              x="50%" y="61%" textAnchor="middle"
              style={{ fontSize: size * 0.075, fill: "var(--color-subtle)" }}
            >
              {centerLabel}
            </text>
          </>
        ) : null}
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-[var(--color-muted)]">{d.label}</span>
            <span className="tabular font-semibold">
              {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarPair({
  data,
  height = 190,
  formatValue = (n: number) => String(n),
}: {
  data: Array<{ label: string; a: number; b: number }>;
  height?: number;
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  return (
    <div>
      <div className="flex items-end gap-3 sm:gap-4" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                className="group relative w-1/2 max-w-[26px] rounded-t-md bg-[var(--color-brand)] transition-all"
                style={{ height: `${(d.a / max) * 100}%`, minHeight: d.a > 0 ? 4 : 0 }}
                title={`Income ${formatValue(d.a)}`}
              />
              <div
                className="w-1/2 max-w-[26px] rounded-t-md bg-[var(--color-plum)] opacity-70"
                style={{ height: `${(d.b / max) * 100}%`, minHeight: d.b > 0 ? 4 : 0 }}
                title={`Expense ${formatValue(d.b)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[0.68rem] font-semibold text-[var(--color-subtle)]">
              {d.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-5 text-xs font-semibold text-[var(--color-muted)]">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-brand)]" /> Income
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-plum)] opacity-70" /> Expenses
        </span>
      </div>
    </div>
  );
}

export function Sparkline({
  points,
  width = 220,
  height = 56,
  color = "var(--color-brand)",
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((p - min) / span) * height).toFixed(1)}`)
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={`${path} L${width},${height} L0,${height} Z`} fill={color} opacity={0.1} />
      <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
