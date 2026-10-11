import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

export type TextLinkTone = "link" | "accent" | "muted";

type Props = ComponentProps<typeof Link> & {
  /** `link` is the classic result-title blue, `accent` is the action blue, `muted` is gray. */
  tone?: TextLinkTone;
};

const tones: Record<TextLinkTone, string> = {
  link: "text-link visited:text-link-visited",
  accent: "text-accent",
  muted: "text-fg-muted hover:text-fg",
};

/**
 * Locale-aware internal link with the three text colors the design uses.
 * Underline appears on hover only, matching search-result conventions.
 */
export function TextLink({ tone = "accent", className, ...rest }: Props) {
  return (
    <Link
      className={["no-underline hover:underline rounded-sm", tones[tone], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}
