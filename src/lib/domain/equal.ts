/**
 * Content comparison for stored documents. Imports use it to skip writing a
 * row that already holds the same values, which is most rows on a re-run.
 */

/** Order-independent text for a value. Database bookkeeping fields and undefined values are ignored. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([key, v]) => v !== undefined && key !== "_id" && key !== "_creationTime")
      .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
      .map(([key, v]) => `${JSON.stringify(key)}:${stable(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

/** True when a stored document already holds exactly this content. */
export function sameContent(existing: unknown, incoming: unknown): boolean {
  return stable(existing) === stable(incoming);
}
