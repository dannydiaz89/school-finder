import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { runAxe } from "@/test/a11y";
import { KeyValueList } from "./key-value-list";

describe("KeyValueList", () => {
  it("renders labels as terms and values as definitions", async () => {
    const { container } = render(
      <KeyValueList
        items={[
          { key: "address", label: "Address", value: "3725 McKinley Blvd, Sacramento, CA 95816" },
          { key: "phone", label: "Phone", value: <a href="tel:+19163954890">(916) 395-4890</a> },
        ]}
      />,
    );
    expect(screen.getAllByRole("term").map((el) => el.textContent)).toEqual(["Address", "Phone"]);
    expect(screen.getAllByRole("definition")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "(916) 395-4890" })).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });
});
