import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { serializeSearchParams, type SearchParams } from "@/lib/schemas";

/** Radii offered in the select, in miles. The current value is added if it is not one of these. */
const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 25];

/**
 * The address field: one rounded pill holding the address input, the
 * "within N mi" select, and the submit button, as in the mockup. A plain
 * GET form, so it works before JavaScript loads. Filters and sort travel
 * as hidden inputs so changing the address keeps them; lat/lng and page do
 * not, because a new address is geocoded again and starts at page one.
 */
export async function AddressForm({ locale, params }: { locale: Locale; params: SearchParams }) {
  const t = await getTranslations({ locale, namespace: "search" });
  const radii = RADIUS_OPTIONS.includes(params.radius)
    ? RADIUS_OPTIONS
    : [...RADIUS_OPTIONS, params.radius].sort((a, b) => a - b);
  const hidden = serializeSearchParams({
    ...params,
    address: undefined,
    lat: undefined,
    lng: undefined,
    radius: undefined,
    page: undefined,
  });

  return (
    <form
      method="get"
      action={getPathname({ locale, href: "/" })}
      className="flex max-w-[690px] items-center gap-2 rounded-full border border-border bg-bg py-[2px] pl-4 pr-[6px] hover:border-border-strong"
    >
      <TextField
        label={t("addressLabel")}
        hideLabel
        name="address"
        defaultValue={params.address ?? ""}
        placeholder={t("addressPlaceholder")}
        autoComplete="street-address"
        required
        minLength={3}
        maxLength={200}
        wrapperClassName="min-w-0 flex-1"
        className="h-10 rounded-sm border-0 bg-transparent px-0 text-lg hover:border-0"
      />
      <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />
      <Select
        label={t("radiusLabel")}
        hideLabel
        name="radius"
        defaultValue={String(params.radius)}
        options={radii.map((miles) => ({
          value: String(miles),
          label: t("radius", { miles }),
        }))}
        wrapperClassName="shrink-0"
        className="h-10 rounded-sm border-0 bg-transparent pl-2 hover:border-0"
      />
      <Button type="submit" variant="primary" size="sm" className="shrink-0">
        {t("submit")}
      </Button>
      {Array.from(hidden.entries(), ([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </form>
  );
}
