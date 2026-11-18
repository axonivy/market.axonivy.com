import { Code, H4 } from "@/components/ui/typography";
import type { CallableProcess } from "@/data/product-types";
import type { Lang } from "@/translation/ui";
import { useTranslation } from "react-i18next";

export default function CallableProcesses({
  processes,
  lang,
}: {
  processes: CallableProcess[];
  lang: Lang;
}) {
  const { t } = useTranslation(undefined, { lng: lang });

  if (processes.length === 0) return null;

  return (
    <section className="space-y-2">
      <H4>{t("productDetails.tabs.processes")}</H4>
      <ul className="list-disc space-y-1 pl-5">
        {processes.map(({ name, processCall }) => (
          <li key={processCall}>
            <Code>{processCall}</Code>
            {name !== processCall && (
              <span className="text-muted-foreground"> ({name})</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
