import type { Route } from "next";
import { getTranslations } from "next-intl/server";
import Form from "next/form";
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
    loc: undefined,
    by: undefined,
    lat: undefined,
    lng: undefined,
    radius: undefined,
    page: undefined,
  });

  // On phones the field and the radius row stack with the components' own borders;
  // from `sm` they sit together inside one rounded pill.
  return (
    <Form
      // Navigates on the client when JavaScript is available and is an ordinary GET form when not.
      // The locale home ("/en", "/es") is a known route; getPathname returns a plain string.
      action={getPathname({ locale, href: "/" }) as Route}
      className="flex max-w-[690px] flex-wrap items-center gap-2 sm:flex-nowrap sm:rounded-full sm:border sm:border-border sm:bg-bg sm:py-[2px] sm:pl-4 sm:pr-[6px] sm:hover:border-border-strong"
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
        wrapperClassName="min-w-0 basis-full sm:flex-1 sm:basis-auto"
        className="text-lg sm:h-10 sm:rounded-sm sm:border-0 sm:bg-transparent sm:px-0 sm:hover:border-0"
      />
      <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-border sm:block" />
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
        className="sm:h-10 sm:rounded-sm sm:border-0 sm:bg-transparent sm:pl-2 sm:hover:border-0"
      />
      <Button type="submit" variant="primary" size="sm" className="h-11 shrink-0 sm:h-8">
        {t("submit")}
      </Button>
      {Array.from(hidden.entries(), ([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </Form>
  );
}
