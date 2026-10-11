import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { runAxe } from "@/test/a11y";
import { LevelDot } from "./level-dot";
import { renderWithIntl } from "./test-utils";
import { TypeDot } from "./type-dot";

describe("LevelDot", () => {
  it("shows the level word next to a decorative dot", async () => {
    const { container } = renderWithIntl(<LevelDot level="green" />);
    expect(screen.getByText("Green")).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true']")).toHaveClass("bg-level-green");
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("prefixes the short indicator name and handles a missing level", () => {
    renderWithIntl(
      <>
        <LevelDot level="blue" indicator="ela" />
        <LevelDot level={null} indicator="chronicAbsenteeism" />
      </>,
    );
    expect(screen.getByText("ELA Blue")).toBeInTheDocument();
    expect(screen.getByText("Absenteeism No level")).toBeInTheDocument();
  });
});

describe("TypeDot", () => {
  it("says charter schools are public", async () => {
    const { container } = renderWithIntl(
      <>
        <TypeDot type="district" />
        <TypeDot type="charter" />
        <TypeDot type="private" />
      </>,
    );
    expect(screen.getByText("District · public")).toBeInTheDocument();
    expect(screen.getByText("Charter · public")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("joins extra detail with the locale separator", () => {
    renderWithIntl(<TypeDot type="charter" detail="K–8 · 1.4 mi" />);
    expect(screen.getByText("Charter · public · K–8 · 1.4 mi")).toBeInTheDocument();
  });
});
