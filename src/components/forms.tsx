"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { IconCheck, IconClose } from "@/components/icons";

export function SubmitButton({
  children,
  className = "btn btn-primary w-full",
  pendingLabel = "Working…",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Spinner /> {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Alert({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-[var(--color-critical-soft)] text-[var(--color-critical)]",
    success: "bg-[var(--color-positive-soft)] text-[var(--color-positive)]",
    info: "bg-[var(--color-brand-soft)] text-[var(--color-brand-deep)]",
  }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-[var(--radius-sm)] px-3.5 py-3 text-sm ${styles}`} role="status">
      <span className="mt-0.5 shrink-0">
        {tone === "error" ? <IconClose size={15} /> : <IconCheck size={15} />}
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
  hint,
  autoComplete,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  hint?: string;
  autoComplete?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
        {required ? <span className="ml-0.5 text-[var(--color-critical)]">*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className="field"
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
      />
      {hint ? <p className="mt-1.5 text-xs text-[var(--color-subtle)]">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  name,
  placeholder,
  required,
  defaultValue,
  hint,
  rows = 4,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
        {required ? <span className="ml-0.5 text-[var(--color-critical)]">*</span> : null}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        className="field"
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
      />
      {hint ? <p className="mt-1.5 text-xs text-[var(--color-subtle)]">{hint}</p> : null}
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  required,
  defaultValue,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  defaultValue?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={name}>
        {label}
        {required ? <span className="ml-0.5 text-[var(--color-critical)]">*</span> : null}
      </label>
      <select id={name} name={name} className="field" required={required} defaultValue={defaultValue ?? ""}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint ? <p className="mt-1.5 text-xs text-[var(--color-subtle)]">{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] p-3.5 transition hover:border-[var(--color-line-strong)]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--color-ink)]">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-[var(--color-muted)]">{hint}</span> : null}
      </span>
    </label>
  );
}
