import type { Counts, ImportContext } from "../lib/runner";

export interface Source {
  name: string;
  /** School year used when --year is not given. Empty for sources without a year. */
  defaultYear: string;
  run(ctx: ImportContext): Promise<Counts>;
}
