import { PrivateSchoolDetail, type GradeCount, type GradeSpan } from "@/lib/schemas";
import type { AffidavitRow } from "@/lib/schemas/imports/affidavit";

/**
 * Private School Affidavit row -> PrivateSchoolDetail plus the identifying
 * fields the PSS join needs. Pure. The grade span is derived from the grades
 * with students, because the affidavit has no grade-span column.
 */

const GRADE_COLUMNS = [
  ["Grade K Enroll", "K"],
  ["Grade 1 Enroll", "1"],
  ["Grade 2 Enroll", "2"],
  ["Grade 3 Enroll", "3"],
  ["Grade 4 Enroll", "4"],
  ["Grade 5 Enroll", "5"],
  ["Grade 6 Enroll", "6"],
  ["Grade 7 Enroll", "7"],
  ["Grade 8 Enroll", "8"],
  ["Grade 9 Enroll", "9"],
  ["Grade 10 Enroll", "10"],
  ["Grade 11 Enroll", "11"],
  ["Grade 12 Enroll", "12"],
] as const satisfies readonly [keyof AffidavitRow, GradeCount["grade"]][];

export interface AffidavitSchool {
  cds: string;
  name: string;
  county: string;
  district: string;
  gradesOffered: GradeSpan | undefined;
  detail: PrivateSchoolDetail;
}

export function affidavitSchoolFromRow(row: AffidavitRow, year: string): AffidavitSchool {
  const byGrade: GradeCount[] = [];
  for (const [column, grade] of GRADE_COLUMNS) {
    const count = row[column];
    if (count !== null && count > 0) byGrade.push({ grade, count });
  }
  const gradesOffered =
    byGrade.length > 0
      ? { low: byGrade[0].grade, high: byGrade[byGrade.length - 1].grade }
      : undefined;
  const detail = PrivateSchoolDetail.parse({
    cds: row["CDS Code"],
    year,
    enrollmentByGrade: byGrade,
    totalEnrollment: row["Total Enrollment"] ?? byGrade.reduce((sum, g) => sum + g.count, 0),
    fullTimeTeachers: row["Full Time Teachers"] ?? 0,
    partTimeTeachers: row["Part Time Teachers"] ?? 0,
    administrators: row.Administrators ?? 0,
    otherStaff: row["Other Staff"] ?? 0,
    previousYearGraduates: row["Previous Year Grads"],
  });
  return {
    cds: row["CDS Code"],
    name: row["School Name"],
    county: row.County,
    district: row["Public School District"] ?? "Unknown",
    gradesOffered,
    detail,
  };
}
