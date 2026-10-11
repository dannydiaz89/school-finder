import { forwardRef } from "react";
import { Choice, type ChoiceProps } from "./choice";

export type RadioProps = ChoiceProps;

/**
 * A native radio with its label as the row. Group radios with the same
 * `name` inside a <fieldset> with a <legend>.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(props, ref) {
  return <Choice ref={ref} type="radio" {...props} />;
});
