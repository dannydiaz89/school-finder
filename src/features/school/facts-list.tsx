import { useFormatter, useTranslations } from "next-intl";
import { KeyValueList, type KeyValueItem } from "@/components/ui/key-value-list";
import { TypeDot } from "@/components/ui/type-dot";
import { formatMiles, haversineMeters } from "@/lib/domain/geo";
import {
  affiliationKey,
  educationalOptionKey,
  instructionLevelKey,
  virtualKey,
  yesNoKey,
} from "@/lib/labels";
import type { Coordinates, PrivateSchoolDetail, School } from "@/lib/schemas";
import { gradeSpanText, joinParts } from "./format";
import { addressLine, isoDateToDate, telHref } from "./links";

export interface FactsListProps {
  school: School;
  privateDetail: PrivateSchoolDetail | null;
  /** The visitor's home, when the URL carries lat and lng; adds a "From home" row. */
  home?: Coordinates;
  /** The city or ZIP code searched, when the location is its center rather than a home address. */
  place?: string;
}

/**
 * The right-column facts, straight from the directory (and the affidavit
 * for private schools). Nothing here is interpreted: codes become labels
 * through the label layer and that is all.
 */
export function FactsList({ school, privateDetail, home, place }: FactsListProps) {
  const t = useTranslations("school");
  const common = useTranslations("common");
  const labels = useTranslations("labels");
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(isoDateToDate(iso), { dateStyle: "medium" });

  const items: KeyValueItem[] = [];
  const add = (key: string, label: string, value: KeyValueItem["value"] | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") items.push({ key, label, value });
  };

  add("address", t("facts.address"), addressLine(school.address));
  if (home && school.coordinates) {
    add(
      "fromHome",
      place ? t("facts.fromPlace", { place }) : t("facts.fromHome"),
      common("miles", { count: formatMiles(haversineMeters(home, school.coordinates)) }),
    );
  }
  if (school.phone) {
    add("phone", t("facts.phone"), <a href={telHref(school.phone)}>{school.phone}</a>);
  }

  const offered = school.gradesOffered;
  const served = school.gradesServed;
  if (offered && served && (offered.low !== served.low || offered.high !== served.high)) {
    add(
      "grades",
      t("facts.grades"),
      joinParts(common, [
        t("facts.gradesOffered", { span: gradeSpanText(common, labels, offered) }),
        t("facts.gradesServed", { span: gradeSpanText(common, labels, served) }),
      ]),
    );
  } else {
    const span = served ?? offered;
    add("grades", t("facts.grades"), span ? gradeSpanText(common, labels, span) : null);
  }

  add(
    "type",
    t("facts.type"),
    <TypeDot
      type={school.type}
      detail={
        joinParts(common, [
          school.educationalOption ? labels(educationalOptionKey(school.educationalOption)) : null,
          school.instructionLevel ? labels(instructionLevelKey(school.instructionLevel)) : null,
        ]) || undefined
      }
    />,
  );

  if (school.type === "charter") {
    add("charterNumber", t("facts.charterNumber"), school.charterNumber);
    add(
      "funding",
      t("facts.funding"),
      school.charterFunding ? t(`facts.fundingType.${school.charterFunding}`) : null,
    );
  }
  if (school.type === "private") {
    add(
      "affiliation",
      t("facts.affiliation"),
      school.affiliation ? labels(affiliationKey(school.affiliation)) : null,
    );
    if (privateDetail) {
      add("teachers", t("facts.teachers"), format.number(privateDetail.fullTimeTeachers));
      add(
        "partTimeTeachers",
        t("facts.partTimeTeachers"),
        format.number(privateDetail.partTimeTeachers),
      );
    }
  } else {
    if (school.magnet !== undefined)
      add("magnet", t("facts.magnet"), labels(yesNoKey(school.magnet)));
    if (school.virtual) add("virtual", t("facts.virtual"), labels(virtualKey(school.virtual)));
    if (school.multilingual !== undefined) {
      add("multilingual", t("facts.multilingual"), labels(yesNoKey(school.multilingual)));
    }
  }

  if (school.openDate) add("opened", t("facts.opened"), date(school.openDate));
  add("cds", t("facts.cds"), <span className="tabular-nums">{school.cds}</span>);
  if (school.ncesId)
    add("nces", t("facts.nces"), <span className="tabular-nums">{school.ncesId}</span>);
  if (school.pssId)
    add("pss", t("facts.pss"), <span className="tabular-nums">{school.pssId}</span>);
  if (school.directoryUpdatedAt) {
    add("lastUpdated", t("facts.lastUpdated"), date(school.directoryUpdatedAt));
  }

  return (
    <section aria-labelledby="facts-heading" className="flex flex-col gap-2">
      <h2 id="facts-heading" className="m-0 text-xl font-medium text-fg">
        {t("sections.facts")}
      </h2>
      <KeyValueList items={items} labelWidth="9rem" />
    </section>
  );
}
