import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

/** Flatten {a:{b:"x"}} to ["a.b"]. */
function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

/**
 * Top-level ICU argument names like {count} or {miles, number}. Nested plural
 * and select bodies such as "{# schools}" are skipped by tracking brace depth.
 */
function icuArgs(message: string): string[] {
  const names: string[] = [];
  let depth = 0;
  for (let i = 0; i < message.length; i++) {
    const ch = message[i];
    if (ch === "{") {
      depth += 1;
      if (depth === 1) {
        const m = /^\{\s*([A-Za-z_]\w*)/.exec(message.slice(i));
        if (m) names.push(m[1]);
      }
    } else if (ch === "}") {
      depth -= 1;
    }
  }
  return names.sort();
}

function flat(obj: unknown, prefix = ""): Record<string, string> {
  if (typeof obj === "string") return { [prefix]: obj };
  if (typeof obj !== "object" || obj === null) return {};
  return Object.assign(
    {},
    ...Object.entries(obj).map(([k, v]) => flat(v, prefix ? `${prefix}.${k}` : k)),
  );
}

describe("message files", () => {
  it("es has exactly the keys en has", () => {
    const enKeys = keys(en).sort();
    const esKeys = keys(es).sort();
    expect(esKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(enKeys.filter((k) => !esKeys.includes(k))).toEqual([]);
  });

  it("every translation uses the same ICU arguments as English", () => {
    const enFlat = flat(en);
    const esFlat = flat(es);
    const mismatches = Object.keys(enFlat).filter(
      (k) => icuArgs(enFlat[k]).join(",") !== icuArgs(esFlat[k] ?? "").join(","),
    );
    expect(mismatches).toEqual([]);
  });
});
