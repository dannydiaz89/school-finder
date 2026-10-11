import { forwardRef } from "react";
import { Choice, type ChoiceProps } from "./choice";

export type CheckboxProps = ChoiceProps;

/**
 * A native checkbox with its label as the row. Native because the browser
 * already gives it Space toggling, form participation, and `indeterminate`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(props, ref) {
  return <Choice ref={ref} type="checkbox" {...props} />;
});
