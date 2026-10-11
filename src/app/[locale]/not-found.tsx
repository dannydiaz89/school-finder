import { useTranslations } from "next-intl";
import { TextLink } from "@/components/ui/text-link";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <main className="flex flex-col gap-3 px-7 pt-10 pb-10 pl-[var(--left-offset)]">
      <h1 className="text-3xl font-normal">404</h1>
      <TextLink href="/">{t("nav.search")}</TextLink>
    </main>
  );
}
