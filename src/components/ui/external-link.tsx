import type { AnchorHTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { VisuallyHidden } from "./visually-hidden";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * Link to another site. Opens in a new tab with the security attributes set
 * and tells screen reader users that it leaves the app.
 */
export function ExternalLink({ className, children, ...rest }: Props) {
  const t = useTranslations("common");
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={["text-accent no-underline hover:underline rounded-sm", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
      <VisuallyHidden> ({t("actions.website")})</VisuallyHidden>
    </a>
  );
}
