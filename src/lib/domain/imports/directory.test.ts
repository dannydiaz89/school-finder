import { describe, expect, it } from "vitest";
import { DirectoryRow } from "@/lib/schemas/imports/directory";
import { schoolFromDirectoryRow } from "./directory";

/** A raw directory record as csv-parse hands it over, with CDE's "No Data" spelling. */
function raw(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    CDSCode: "34674396034458",
    NCESDist: "0634410",
    NCESSchool: "05573",
    StatusType: "Active",
    County: "Sacramento",
    District: "Sacramento City Unified",
    School: "Test Elementary",
    Street: "1 Main Street",
    StreetAbr: "1 Main St.",
    City: "Sacramento",
    Zip: "95814-1234",
    State: "CA",
    MailStreet: "No Data",
    MailStrAbr: "No Data",
    MailCity: "No Data",
    MailZip: "No Data",
    MailState: "No Data",
    Phone: "(916) 555-0100",
    Ext: "No Data",
    FaxNumber: "No Data",
    WebSite: "www.scusd.edu/test",
    OpenDate: "8/9/2017",
    ClosedDate: "No Data",
    Charter: "N",
    CharterNum: "No Data",
    FundingType: "No Data",
    DOC: "54",
    DOCType: "Unified School District",
    SOC: "60",
    SOCType: "Elementary Schools (Public)",
    EdOpsCode: "TRAD",
    EdOpsName: "Traditional",
    EILCode: "ELEM",
    EILName: "Elementary",
    GSoffered: "K-6",
    GSserved: "K-5",
    Virtual: "N",
    Magnet: "N",
    YearRoundYN: "N",
    FederalDFCDistrictID: "No Data",
    Latitude: "38.5816",
    Longitude: "-121.4944",
    AdmFName: "No Data",
    AdmLName: "No Data",
    LastUpDate: "7/21/2026",
    Multilingual: "Y",
    ...overrides,
  };
}

const parse = (overrides: Record<string, string> = {}) =>
  schoolFromDirectoryRow(DirectoryRow.parse(raw(overrides)));

describe("schoolFromDirectoryRow", () => {
  it("maps a traditional district school", () => {
    const out = parse();
    expect(out.kind).toBe("school");
    if (out.kind !== "school") return;
    expect(out.school).toMatchObject({
      cds: "34674396034458",
      ncesId: "063441005573",
      name: "Test Elementary",
      type: "district",
      districtCds: "34674390000000",
      address: { street: "1 Main Street", city: "Sacramento", zip: "95814", state: "CA" },
      website: "https://www.scusd.edu/test",
      coordinates: { latitude: 38.5816, longitude: -121.4944 },
      gradesOffered: { low: "K", high: "6" },
      gradesServed: { low: "K", high: "5" },
      educationalOption: "TRAD",
      magnet: false,
      virtual: "N",
      multilingual: true,
      openDate: "2017-08-09",
      directoryUpdatedAt: "2026-07-21",
    });
    expect(out.school.charterNumber).toBeUndefined();
    expect(out.school.charterFunding).toBeUndefined();
  });

  it("maps a charter with funding type", () => {
    const out = parse({ Charter: "Y", CharterNum: "1234", FundingType: "Directly funded" });
    expect(out).toMatchObject({
      kind: "school",
      school: { type: "charter", charterNumber: "1234", charterFunding: "directly" },
    });
    expect(parse({ Charter: "Y", FundingType: "Locally funded" })).toMatchObject({
      school: { charterFunding: "locally" },
    });
    expect(parse({ Charter: "Y", FundingType: "Not in CS funding model" })).toMatchObject({
      school: { charterFunding: "notInModel" },
    });
  });

  it("fills the educational option from FRPM wording when the directory has none", () => {
    const row = DirectoryRow.parse(raw({ EdOpsCode: "No Data" }));
    expect(schoolFromDirectoryRow(row, "Continuation School")).toMatchObject({
      school: { educationalOption: "CON" },
    });
    expect(schoolFromDirectoryRow(row)).toMatchObject({ kind: "school" });
    const noOption = schoolFromDirectoryRow(row);
    if (noOption.kind === "school") expect(noOption.school.educationalOption).toBeUndefined();
  });

  it("keeps a school without coordinates but leaves them undefined", () => {
    const out = parse({ Latitude: "No Data", Longitude: "No Data" });
    expect(out.kind).toBe("school");
    if (out.kind === "school") expect(out.school.coordinates).toBeUndefined();
  });

  it.each([
    [{ StatusType: "Closed" }, "inactive"],
    [{ CDSCode: "34674390000000" }, "district"],
    [{ School: "No Data" }, "noName"],
    [{ Street: "No Data" }, "noAddress"],
    [{ Zip: "No Data" }, "noAddress"],
  ])("skips %j as %s", (overrides, reason) => {
    expect(parse(overrides)).toEqual({ kind: "skip", reason });
  });
});
