import { axe } from "vitest-axe";

/**
 * Run axe against a rendered container. Use in every component test:
 *
 *   const { container } = render(<Button>Save</Button>);
 *   expect(await runAxe(container)).toHaveNoViolations();
 */
export function runAxe(container: Element) {
  return axe(container, {
    rules: {
      // Color contrast is validated by hand against the tokens; jsdom has no layout.
      "color-contrast": { enabled: false },
    },
  });
}
