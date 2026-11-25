import { Button } from "@/components/ui/button";
import { getVscodeEnv } from "@/data/designer";
import { cn } from "@/lib/utils";
import type { Lang } from "@/translation/ui";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type CodeBlockProps = { code: string; className?: string; lang: Lang };

export function CodeBlock({ code, className, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation(undefined, { lng: lang });

  async function copyCode() {
    if (getVscodeEnv().isVscode && window.parent !== window) {
      window.parent.postMessage(
        { source: "axonivy-market", type: "copy-to-clipboard", text: code },
        "*",
      );
    } else {
      await navigator.clipboard.writeText(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("bg-n100 text-n900 relative rounded-md p-4", className)}>
      <code className="font-code block text-sm wrap-break-word whitespace-pre-wrap">
        {code}
      </code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copyCode}
        aria-label={copied ? t("codeBlock.copied") : t("codeBlock.copy")}
        className="absolute top-2 right-2"
      >
        {copied ? (
          <IconCheck className="size-4" aria-hidden="true" />
        ) : (
          <IconCopy className="size-4" aria-hidden="true" />
        )}
        {copied ? t("codeBlock.copied") : t("codeBlock.copy")}
      </Button>
    </div>
  );
}
