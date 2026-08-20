/**
 * PostgREST returns an embedded relation either as an object (to-one) or as an
 * array (to-many), and the generated types are not always sure which. `first`
 * normalises both shapes so pages can read `.name` without ceremony.
 */
export function first<T>(value: T | T[] | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function many<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
