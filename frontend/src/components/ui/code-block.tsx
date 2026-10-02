import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CodeBlockProps = { code: string; className?: string };

export function CodeBlock({ code, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        "bg-n100 text-n900 flex items-start justify-between gap-4 rounded-md p-4",
        className,
      )}
    >
      <code className="font-code min-w-0 flex-1 text-sm wrap-break-word whitespace-pre-wrap">
        {code}
      </code>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copyCode}
        aria-label={copied ? "Code copied" : "Copy code"}
      >
        {copied ? (
          <IconCheck className="size-4" aria-hidden="true" />
        ) : (
          <IconCopy className="size-4" aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
