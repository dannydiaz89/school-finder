import { z } from "zod";

/**
 * Coercions shared by the import row schemas. Source files are parsed into
 * plain string records; these turn CDE's spellings of "nothing" into
 * `null`/`undefined`, strip thousands separators, and zero-pad codes before
 * the typed schema sees them.
 */

const EMPTY = new Set(["", "*", "N/A", "No Data", "NA", "--"]);

/** "278,927.1" -> 278927.1; "*", "", "No Data" -> null */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, "").trim();
  if (EMPTY.has(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** A number column where blank, "*" (suppressed) and "No Data" mean null. */
export const NullableNumber = z.preprocess(toNumberOrNull, z.number().nullable());

/** A whole-number column with the same null handling. */
export const NullableCount = z.preprocess(
  toNumberOrNull,
  z.number().int().nonnegative().nullable(),
);

/** A text column where blank and "No Data" mean undefined. */
export const OptionalText = z.preprocess(
  (v) => (typeof v === "string" && EMPTY.has(v.trim()) ? undefined : v),
  z.string().trim().min(1).optional(),
);

/** CDE stores CDS codes as numbers in some files and drops the leading zero. */
export const PaddedCds = z.preprocess(
  (v) =>
    String(v ?? "")
      .replace(/\.0+$/, "")
      .trim()
      .padStart(14, "0"),
  z.string().regex(/^\d{14}$/),
);

/** A code column that is zero-padded to `width` digits ("7" -> "07"). */
export const paddedCode = (width: number) =>
  z.preprocess(
    (v) =>
      String(v ?? "")
        .trim()
        .padStart(width, "0"),
    z.string().regex(new RegExp(`^\\d{${width}}$`)),
  );

/** "2024-2025" or "2024-25" -> "2024-25" */
export const SchoolYearText = z.preprocess(
  (v) => {
    const m = /^(\d{4})-(\d{2})(\d{2})?$/.exec(String(v ?? "").trim());
    return m ? `${m[1]}-${m[3] ?? m[2]}` : v;
  },
  z.string().regex(/^\d{4}-\d{2}$/),
);

/** "Y"/"N"/blank as a boolean, blank meaning unknown. */
export const YesNoFlag = z.preprocess((v) => {
  const t = String(v ?? "")
    .trim()
    .toUpperCase();
  return t === "Y" || t === "YES" ? true : t === "N" || t === "NO" ? false : undefined;
}, z.boolean().optional());
