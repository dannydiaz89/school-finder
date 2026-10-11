import { execFileSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/**
 * Download cache for source files. A file is fetched once into `.cache/` and
 * reused until deleted. Zips are expanded and the wanted member kept. Nothing
 * here runs at request time.
 */

export interface FetchOptions {
  /** For zip downloads: which member to keep (first match). */
  member?: RegExp;
  log?: (message: string) => void;
}

const USER_AGENT = "school-finder-import/0.1 (+https://github.com/dannydiaz89/school-finder)";

/** Make sure `dest` exists, downloading `url` when it does not. Returns `dest`. */
export async function ensureFile(
  url: string,
  dest: string,
  options: FetchOptions = {},
): Promise<string> {
  const log = options.log ?? (() => {});
  if (existsSync(dest) && statSync(dest).size > 0) {
    log(`cache hit ${dest}`);
    return dest;
  }
  mkdirSync(dirname(dest), { recursive: true });
  const work = await mkdtemp(join(tmpdir(), "school-finder-dl-"));
  try {
    const downloaded = join(work, basename(new URL(url).pathname) || "download");
    log(`downloading ${url}`);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
    if (!res.ok || !res.body) {
      throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
    }
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html") && !url.endsWith(".html")) {
      throw new Error(
        `GET ${url} returned an HTML page instead of a data file (bot protection?). ` +
          `Download it by hand and save it as ${dest}.`,
      );
    }
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(downloaded));
    log(`downloaded ${statSync(downloaded).size} bytes`);

    if (/\.zip$/i.test(downloaded) || type.includes("zip")) {
      const extracted = join(work, "extracted");
      mkdirSync(extracted);
      execFileSync("unzip", ["-o", "-q", downloaded, "-d", extracted]);
      const members = readdirSync(extracted, { recursive: true, encoding: "utf8" }).filter((m) =>
        statSync(join(extracted, m)).isFile(),
      );
      const wanted = options.member
        ? members.find((m) => options.member!.test(m))
        : (members.find((m) => basename(m) === basename(dest)) ?? members[0]);
      if (!wanted) throw new Error(`No member matching ${options.member} in ${url}: ${members}`);
      renameSync(join(extracted, wanted), dest);
    } else {
      renameSync(downloaded, dest);
    }
    return dest;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
