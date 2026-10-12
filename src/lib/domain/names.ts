/**
 * Matching and ranking for school-name search. Pure, so the fixtures backend
 * and Convex order results the same way, and so the rule is one a database
 * can reproduce (Postgres: every word as an ILIKE prefix).
 */

/** Lowercase, no accents, punctuation as spaces: "St. Mary's" -> "st mary s". */
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const tokens = (text: string) => normalizeName(text).split(" ").filter(Boolean);

/** True when every word typed begins some word of the name: "judah elem" matches "Theodore Judah Elementary". */
export function matchesName(name: string, query: string): boolean {
  const words = tokens(name);
  const typed = tokens(query);
  return typed.length > 0 && typed.every((t) => words.some((w) => w.startsWith(t)));
}

/**
 * Lower is better. An exact name first, then names that start with what was
 * typed, then names that contain the words in order, then any other match.
 */
export function nameRank(name: string, query: string): number {
  const n = normalizeName(name);
  const q = normalizeName(query);
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q)) return 2;
  return 3;
}

/** The text a school is searchable by: its name, then its city and district to tell namesakes apart. */
export function searchTextOf(name: string, city: string, district: string): string {
  return normalizeName(`${name} ${city} ${district}`);
}

/**
 * Keep the schools that match, best first. Every word typed must begin a word
 * of the name or of the context (city and district), so "washington
 * elementary sacramento" finds the one in Sacramento. Schools whose name
 * accounts for more of the words come first, then closer name matches, then
 * alphabetically by name and context.
 */
export function rankByName<T>(
  items: T[],
  query: string,
  nameOf: (item: T) => string,
  contextOf: (item: T) => string = () => "",
): T[] {
  const typed = tokens(query);
  const scored = items
    .filter((item) => matchesName(`${nameOf(item)} ${contextOf(item)}`, query))
    .map((item) => {
      const words = tokens(nameOf(item));
      const inName = typed.filter((t) => words.some((w) => w.startsWith(t)));
      return { item, hits: inName.length, rank: nameRank(nameOf(item), inName.join(" ")) };
    });
  return scored
    .sort(
      (a, b) =>
        b.hits - a.hits ||
        a.rank - b.rank ||
        nameOf(a.item).localeCompare(nameOf(b.item)) ||
        contextOf(a.item).localeCompare(contextOf(b.item)),
    )
    .map((s) => s.item);
}
