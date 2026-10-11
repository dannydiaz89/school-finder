import { fixturesDataSource } from "@/lib/data/fixtures";
import type { CdsCode, SchoolDetail, SchoolSummary } from "@/lib/schemas";

/** Real schools from src/fixtures/schools.json, by CDS code. */
export const CDS = {
  judah: "34674396034292" as CdsCode, // Theodore Judah Elementary, district K–6
  sacHigh: "34674390102038" as CdsCode, // Sacramento Charter High, charter 9–12
  stFrancis: "34674396976575" as CdsCode, // St. Francis of Assisi Elementary, private K–8
  legion: "34674393430154" as CdsCode, // American Legion High, continuation
};

export async function loadDetail(cds: CdsCode): Promise<SchoolDetail> {
  const detail = await fixturesDataSource.getSchool({ cds });
  if (!detail) throw new Error(`fixture missing: ${cds}`);
  return detail;
}

export function loadNearby(cds: CdsCode, limit = 5): Promise<SchoolSummary[]> {
  return fixturesDataSource.getNearby({ cds, limit });
}
