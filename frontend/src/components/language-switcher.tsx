import type { Lang } from "@/i18n/ui";
import { Button } from "@/components/ui/button";

const LABELS: Record<Lang, string> = { en: "EN", de: "DE" };

export function LanguageSwitcher({
  lang,
  urls,
}: {
  lang: Lang;
  urls: Record<Lang, string>;
}) {
  return (
    <div className="flex flex-row">
      {(Object.keys(urls) as Lang[]).map((code) => (
        <Button
          key={code}
          variant="ghost"
          size="sm"
          nativeButton={false}
          aria-current={code === lang ? "true" : undefined}
          className={code === lang ? "font-bold" : "text-muted-foreground"}
          render={<a href={urls[code]} hrefLang={code} />}
        >
          {LABELS[code]}
        </Button>
      ))}
    </div>
  );
}
