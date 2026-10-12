import { screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";
import type { GradeSpan } from "@/lib/schemas";
import { gradeSpanText } from "./grade-span";
import { renderWithIntl } from "./test-utils";

function Span({ span }: { span: GradeSpan }) {
  const common = useTranslations("common");
  const labels = useTranslations("labels");
  return <p>{gradeSpanText(common, labels, span)}</p>;
}

describe("gradeSpanText", () => {
  it.each([
    [{ low: "TK", high: "5" }, "TK–5"],
    [{ low: "9", high: "12" }, "9–12"],
    // One grade reads as that grade, never "K–K".
    [{ low: "K", high: "K" }, "K"],
    [{ low: "P", high: "P" }, "Preschool"],
  ] as const)("%o reads %s", (span, text) => {
    renderWithIntl(<Span span={span} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
