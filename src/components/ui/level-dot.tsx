import { useTranslations } from "next-intl";
import { indicatorShortKey, levelKey } from "@/lib/labels";
import type { DashboardIndicatorId, DashboardLevel } from "@/lib/schemas";
import { cx } from "./cx";
import { Dot } from "./dot";

export interface LevelDotProps {
  /** `null` renders the gray "No level" dot. */
  level: DashboardLevel | null;
  /** When given, the short indicator name precedes the level: "ELA Green". */
  indicator?: DashboardIndicatorId;
  className?: string;
}

const levelClass: Record<DashboardLevel | "none", string> = {
  red: "bg-level-red",
  orange: "bg-level-orange",
  yellow: "bg-level-yellow",
  green: "bg-level-green",
  blue: "bg-level-blue",
  none: "bg-level-none",
};

/**
 * California School Dashboard level as a colored dot plus the level word.
 * The word always appears; color never carries the meaning alone.
 */
export function LevelDot({ level, indicator, className }: LevelDotProps) {
  const labels = useTranslations("labels");
  const common = useTranslations("common");
  const word = labels(levelKey(level));
  const text = indicator
    ? common("indicatorLevel", { indicator: labels(indicatorShortKey(indicator)), level: word })
    : word;
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-base text-fg", className)}>
      <Dot size="md" className={levelClass[level ?? "none"]} />
      {text}
    </span>
  );
}
