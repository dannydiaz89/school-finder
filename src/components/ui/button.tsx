import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "text";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium select-none " +
  "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors";

const variants: Record<ButtonVariant, string> = {
  // Filled, fully rounded. Reserved for the one main action on a surface (Apply, Find schools).
  primary: "rounded-full bg-accent text-fg-on-accent hover:bg-accent-hover",
  // Hairline outline, fully rounded. Secondary actions (Larger map, More schools).
  secondary: "rounded-full border border-border bg-bg text-accent hover:bg-bg-subtle",
  // Looks like a link. Inline actions inside lists and tables (Add to compare, Remove).
  text: "rounded-sm text-accent hover:underline px-0",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
};

/**
 * The only button. Three variants, two sizes. Always a real <button> with a
 * type, so it is keyboard reachable and never submits a form by accident.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", type = "button", className, ...rest },
  ref,
) {
  const sizing = variant === "text" ? (size === "sm" ? "text-sm" : "text-base") : sizes[size];
  return (
    <button
      ref={ref}
      type={type}
      className={[base, variants[variant], sizing, className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
});
