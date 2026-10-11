import { describe, expect, it } from "vitest";
import { AffidavitRow } from "@/lib/schemas/imports/affidavit";
import { PssRow } from "@/lib/schemas/imports/pss";
import { affidavitSchoolFromRow } from "./affidavit";
import {
  matchPrivateSchools,
  nameSimilarity,
  normalizeName,
  schoolFromPrivateMatch,
  typologyToAffiliation,
} from "./pss";

function affidavit(overrides: Record<string, string | number> = {}) {
  return affidavitSchoolFromRow(
    AffidavitRow.parse({
      "CDS Code": "3467439697657",
      County: "Sacramento",
      "Public School District": "Sacramento City Unified",
      "School Name": "St. Francis of Assisi Elementary School",
      "Grade K Enroll": "31",
      "Grade 1 Enroll": "34",
      "Grade 2 Enroll": "0",
      "Grade 3 Enroll": "30",
      "Grade 4 Enroll": "0",
      "Grade 5 Enroll": "0",
      "Grade 6 Enroll": "0",
      "Grade 7 Enroll": "0",
      "Grade 8 Enroll": "36",
      "Grade 9 Enroll": "0",
      "Grade 10 Enroll": "0",
      "Grade 11 Enroll": "0",
      "Grade 12 Enroll": "0",
      "Total Enrollment": "131",
      "Previous Year Grads": "0",
      "Full Time Teachers": "15",
      "Part Time Teachers": "3",
      Administrators: "2",
      "Other Staff": "26",
      ...overrides,
    }),
    "2024-25",
  );
}

function pss(overrides: Record<string, string> = {}) {
  return PssRow.parse({
    PPIN: "A0700302",
    PINST: "ST FRANCIS OF ASSISI ELEMENTARY SCHOOL",
    PADDRS: "2500 K ST",
    PCITY: "SACRAMENTO",
    PSTABB: "CA",
    PZIP: "95816",
    PPHONE: "9164425494",
    PCNTNM: "SACRAMENTO",
    PL_ADD: "",
    PL_CIT: "",
    PL_STABB: "",
    PL_ZIP: "",
    LATITUDE24: "38.57335",
    LONGITUDE24: "-121.473371",
    LOGR2024: "3",
    HIGR2024: "11",
    TYPOLOGY: "1",
    RELIG: "1",
    ORIENT: "1",
    NUMSTUDS: "294",
    ...overrides,
  });
}

describe("affidavitSchoolFromRow", () => {
  it("pads the cds, derives the grade span and the detail", () => {
    const out = affidavit();
    expect(out.cds).toBe("03467439697657");
    expect(out.gradesOffered).toEqual({ low: "K", high: "8" });
    expect(out.detail).toEqual({
      cds: "03467439697657",
      year: "2024-25",
      enrollmentByGrade: [
        { grade: "K", count: 31 },
        { grade: "1", count: 34 },
        { grade: "3", count: 30 },
        { grade: "8", count: 36 },
      ],
      totalEnrollment: 131,
      fullTimeTeachers: 15,
      partTimeTeachers: 3,
      administrators: 2,
      otherStaff: 26,
      previousYearGraduates: 0,
    });
  });

  it("falls back to the grade sum when the total is blank", () => {
    expect(affidavit({ "Total Enrollment": "" }).detail.totalEnrollment).toBe(131);
  });
});

describe("name matching", () => {
  it("normalizes saint and generic words", () => {
    expect(normalizeName("St. Francis of Assisi Elementary School")).toBe("st francis assisi");
    expect(normalizeName("SAINT FRANCIS OF ASSISI ELEMENTARY")).toBe("st francis assisi");
  });
  it("scores similar names high and different names low", () => {
    expect(nameSimilarity("St. Robert Catholic School", "ST ROBERT SCHOOL")).toBe(1);
    expect(nameSimilarity("Courtyard Private School", "COURTYARD SCHOOL")).toBe(1);
    expect(nameSimilarity("Capital Christian School", "Capitol Montessori")).toBeLessThan(0.5);
  });
  it("maps typology to affiliation", () => {
    expect(typologyToAffiliation("2")).toBe("catholic");
    expect(typologyToAffiliation("5")).toBe("otherReligious");
    expect(typologyToAffiliation("8")).toBe("nonsectarian");
    expect(typologyToAffiliation("")).toBeUndefined();
  });
});

describe("matchPrivateSchools", () => {
  it("matches by name within the county and uses each PSS row once", () => {
    const a = affidavit();
    const b = affidavit({
      "CDS Code": "3467439697666",
      "School Name": "St. Robert Catholic School",
    });
    const rows = [pss(), pss({ PPIN: "B1", PINST: "ST ROBERT SCHOOL" })];
    const out = matchPrivateSchools([a, b], rows, new Map());
    expect(
      out.map((m) => [m.affidavit.cds, m.kind, m.kind === "matched" ? m.pss.PPIN : null]),
    ).toEqual(
      expect.arrayContaining([
        ["03467439697657", "matched", "A0700302"],
        ["03467439697666", "matched", "B1"],
      ]),
    );
  });

  it("does not match across counties and reports low scores", () => {
    const out = matchPrivateSchools([affidavit()], [pss({ PCNTNM: "YOLO COUNTY" })], new Map());
    expect(out[0]).toMatchObject({ kind: "unmatched", reason: "noCandidate" });
    const low = matchPrivateSchools(
      [affidavit()],
      [pss({ PINST: "CAPITOL MONTESSORI" })],
      new Map(),
    );
    expect(low[0]).toMatchObject({ kind: "unmatched", reason: "lowScore" });
  });

  it("flags ties as ambiguous", () => {
    const rows = [
      pss({ PPIN: "X1", PINST: "ST FRANCIS OF ASSISI SCHOOL A" }),
      pss({ PPIN: "X2", PINST: "ST FRANCIS OF ASSISI SCHOOL B" }),
    ];
    const out = matchPrivateSchools([affidavit()], rows, new Map());
    expect(out[0]).toMatchObject({ kind: "unmatched", reason: "ambiguous" });
  });

  it("honors overrides, including forcing no match", () => {
    const rows = [pss(), pss({ PPIN: "Z9", PINST: "SOMETHING ELSE" })];
    const forced = matchPrivateSchools([affidavit()], rows, new Map([["03467439697657", "Z9"]]));
    expect(forced[0]).toMatchObject({ kind: "matched", via: "override", pss: { PPIN: "Z9" } });
    const none = matchPrivateSchools([affidavit()], rows, new Map([["03467439697657", null]]));
    expect(none[0]).toMatchObject({ kind: "unmatched", reason: "override" });
  });
});

describe("schoolFromPrivateMatch", () => {
  it("builds the School from the affidavit identity and the PSS location", () => {
    expect(schoolFromPrivateMatch(affidavit(), pss())).toEqual({
      cds: "03467439697657",
      name: "St. Francis of Assisi Elementary School",
      type: "private",
      district: "Sacramento City Unified",
      county: "Sacramento",
      address: { street: "2500 K ST", city: "Sacramento", zip: "95816", state: "CA" },
      phone: "9164425494",
      coordinates: { latitude: 38.57335, longitude: -121.473371 },
      gradesOffered: { low: "K", high: "8" },
      affiliation: "catholic",
      pssId: "A0700302",
    });
  });

  it("prefers the physical location columns when present", () => {
    const out = schoolFromPrivateMatch(
      affidavit(),
      pss({ PL_ADD: "1 Other Way", PL_CIT: "ELK GROVE", PL_ZIP: "95624" }),
    );
    expect(out?.address).toEqual({
      street: "1 Other Way",
      city: "Elk Grove",
      zip: "95624",
      state: "CA",
    });
  });

  it("is null without an address", () => {
    expect(schoolFromPrivateMatch(affidavit(), pss({ PADDRS: "" }))).toBeNull();
  });
});
