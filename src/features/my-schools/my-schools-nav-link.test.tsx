import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/components/ui/test-utils";
import type { CdsCode } from "@/lib/schemas";
import { runAxe } from "@/test/a11y";
import { MySchoolsNavLink } from "./my-schools-nav-link";
import { MySchoolsToggle } from "./my-schools-toggle";
import { browserSavedSchools, resetMySchoolsStoreForTests } from "./store";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={`/en${href}`} {...rest} />
  ),
}));

const A = "34674396034292" as CdsCode;
const B = "34674390102038" as CdsCode;

beforeEach(() => resetMySchoolsStoreForTests());

describe("MySchoolsNavLink and MySchoolsToggle", () => {
  it("is the plain link when nothing is saved", async () => {
    const { container } = renderWithIntl(<MySchoolsNavLink />);
    expect(screen.getByRole("link", { name: "My schools" })).toHaveAttribute(
      "href",
      "/en/my-schools",
    );
    expect(await runAxe(container)).toHaveNoViolations();
  });

  it("shows the count and carries the list, and follows the toggle", async () => {
    renderWithIntl(
      <>
        <MySchoolsNavLink />
        <MySchoolsToggle cds={A} />
      </>,
    );
    const button = screen.getByRole("button", { name: "Add to My schools" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "In My schools" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("link", { name: "My schools (1)" })).toHaveAttribute(
      "href",
      `/en/my-schools?schools=${A}`,
    );
    act(() =>
      browserSavedSchools.write([
        ...browserSavedSchools.getSnapshot(),
        { cds: B, addedAt: "2026-10-12T18:00:00.000Z" },
      ]),
    );
    expect(screen.getByRole("link", { name: "My schools (2)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "In My schools" }));
    expect(screen.getByRole("link", { name: "My schools (1)" })).toHaveAttribute(
      "href",
      `/en/my-schools?schools=${B}`,
    );
  });
});
