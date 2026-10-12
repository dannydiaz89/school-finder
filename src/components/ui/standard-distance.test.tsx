import { screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";
import { standardDistanceText } from "./standard-distance";
import { renderWithIntl } from "./test-utils";

function Distance({ status, form }: { status: number; form?: "long" | "short" }) {
  const labels = useTranslations("labels");
  return <p>{standardDistanceText(labels, status, form)}</p>;
}

describe("standardDistanceText", () => {
  it.each([
    // Warren High, mathematics 2025: below standard, though the result rose 30.3 points.
    [-41.9, undefined, "41.9 pts below standard"],
    [51.3, undefined, "51.3 pts above standard"],
    [0, undefined, "At standard"],
    [-164.7, "short", "164.7 pts below"],
    [20.2, "short", "20.2 pts above"],
    [0, "short", "At standard"],
  ] as const)("%f (%s) reads %s", (status, form, text) => {
    renderWithIntl(<Distance status={status} form={form} />);
    expect(screen.getByText(text)).toBeInTheDocument();
    // Never a bare signed number, which reads as a change.
    expect(screen.queryByText(/[+\-\u2212]\d/)).toBeNull();
  });
});
