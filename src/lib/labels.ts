import type {
  Affiliation,
  DashboardIndicatorId,
  DashboardLevel,
  EducationalOption,
  Grade,
  GradeBand,
  InstructionLevel,
  Program,
  SchoolType,
  VirtualStatus,
} from "@/lib/schemas";

/**
 * Maps coded values to message keys under the `labels` namespace. Components
 * call `useTranslations("labels")` and pass these keys. This is the only
 * place a code becomes a human label, so wording changes happen in the
 * message files and nowhere else.
 */

export const schoolTypeKey = (type: SchoolType) => `schoolType.${type}` as const;
/** "District · public" / "Charter · public" / "Private" */
export const schoolTypeLongKey = (type: SchoolType) =>
  type === "private" ? ("schoolType.private" as const) : (`schoolType.${type}Public` as const);
export const levelKey = (level: DashboardLevel | null) => `level.${level ?? "none"}` as const;
export const indicatorKey = (id: DashboardIndicatorId) => `indicator.${id}` as const;
export const indicatorShortKey = (id: DashboardIndicatorId) => `indicator.${id}Short` as const;
export const gradeKey = (grade: Grade) => `grade.${grade}` as const;
export const gradeBandKey = (band: GradeBand) => `gradeBand.${band}` as const;
export const instructionLevelKey = (level: InstructionLevel) =>
  `instructionLevel.${level}` as const;
export const educationalOptionKey = (opt: EducationalOption) => `educationalOption.${opt}` as const;
export const virtualKey = (v: VirtualStatus) => `virtual.${v}` as const;
export const programKey = (p: Program) => `program.${p}` as const;
export const affiliationKey = (a: Affiliation) => `affiliation.${a}` as const;
export const yesNoKey = (value: boolean) =>
  value ? ("yesNo.yes" as const) : ("yesNo.no" as const);

/** Token-backed color per type, for dots and pins. */
export const typeColorVar: Record<SchoolType, string> = {
  district: "var(--type-district)",
  charter: "var(--type-charter)",
  private: "var(--type-private)",
};

export const levelColorVar: Record<DashboardLevel | "none", string> = {
  red: "var(--level-red)",
  orange: "var(--level-orange)",
  yellow: "var(--level-yellow)",
  green: "var(--level-green)",
  blue: "var(--level-blue)",
  none: "var(--level-none)",
};
