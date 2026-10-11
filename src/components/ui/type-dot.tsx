import { useTranslations } from "next-intl";
import { schoolTypeLongKey } from "@/lib/labels";
import type { SchoolType } from "@/lib/schemas";
import { cx } from "./cx";
import { Dot } from "./dot";

export interface TypeDotProps {
  type: SchoolType;
  /** Extra text joined after the type label with the locale's separator: "District · public · K–6". */
  detail?: string;
  className?: string;
}

const typeClass: Record<SchoolType, string> = {
  district: "bg-type-district",
  charter: "bg-type-charter",
  private: "bg-type-private",
};

/**
 * School type as a colored dot plus the long label: "District · public",
 * "Charter · public", "Private". Charter schools are public and the label
 * says so.
 */
export function TypeDot({ type, detail, className }: TypeDotProps) {
  const labels = useTranslations("labels");
  const common = useTranslations("common");
  const label = labels(schoolTypeLongKey(type));
  const text = detail ? common("join", { a: label, b: detail }) : label;
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-base", className)}>
      <Dot size="sm" className={typeClass[type]} />
      <span>{text}</span>
    </span>
  );
}
