import { useFormatter, useTranslations } from "next-intl";
import { Bar } from "@/components/ui/bar";
import { ExternalLink } from "@/components/ui/external-link";
import { indicatorShortKey } from "@/lib/labels";
import {
  CaasppSubject,
  type CaasppComparison,
  type CaasppResult,
  type CdsCode,
} from "@/lib/schemas";
import { percent } from "./format";
import { caasppReportUrl } from "./links";
import { Section } from "./section";
import { TestsTrend } from "./tests-trend";

export interface TestsSectionProps {
  cds: CdsCode;
  comparison: CaasppComparison | null;
  /** All-grades results for every year on file. Adds the by-year table when there are two or more. */
  history?: CaasppResult[];
}

const LABEL_WIDTH = "10rem";

/**
 * CAASPP section: for ELA and Math, the share of students meeting or
 * exceeding standard at this school, its district, and California, as
 * three bars on one scale.
 */
export function TestsSection({ cds, comparison, history = [] }: TestsSectionProps) {
  const t = useTranslations("school");
  const common = useTranslations("common");
  const labels = useTranslations("labels");
  const format = useFormatter();

  const valueOf = (value: number | null) => ({
    value: value ?? 0,
    valueLabel: value === null ? common("notTested") : percent(format, value / 100),
  });

  return (
    <Section
      id="tests"
      title={t("sections.tests")}
      note={comparison ? t("sections.testsNote", { year: comparison.year }) : undefined}
    >
      {comparison === null ? (
        <p className="m-0 text-base text-fg-muted">{t("tests.empty")}</p>
      ) : (
        <>
          {CaasppSubject.options.map((subject) => {
            const result = comparison[subject];
            return (
              <div key={subject} className="flex flex-col gap-2">
                <Bar
                  label={t("tests.subject", { subject: labels(indicatorShortKey(subject)) })}
                  labelWidth={LABEL_WIDTH}
                  emphasis
                  {...valueOf(result.school)}
                />
                <Bar
                  label={t("compare.district")}
                  labelWidth={LABEL_WIDTH}
                  tone="secondary"
                  {...valueOf(result.district)}
                />
                <Bar
                  label={t("compare.state")}
                  labelWidth={LABEL_WIDTH}
                  tone="secondary"
                  {...valueOf(result.state)}
                />
              </div>
            );
          })}
          <TestsTrend rows={history} />
          <p className="m-0 text-base">
            <ExternalLink href={caasppReportUrl(cds, comparison.year)}>
              {t("tests.link")}
            </ExternalLink>
          </p>
        </>
      )}
    </Section>
  );
}
