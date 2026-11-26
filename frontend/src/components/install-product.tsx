import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { P } from "@/components/ui/typography";
import {
  useDesignerVersion,
  useIsDesigner,
  useIsVscode,
} from "@/data/designer";
import {
  getInitialShowDevVersions,
  saveShowDevVersions,
} from "@/data/dev-versions";
import type { ProductInstallable } from "@/data/product-types";
import {
  bestMatchVersion,
  newestFirst,
  versionsToDisplay,
} from "@/data/versions";
import { cn } from "@/lib/utils";
import { IconBook } from "@tabler/icons-react";
import "@/translation/ui";
import type { Lang } from "@/translation/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

declare global {
  interface Window {
    install?: (url: string) => void;
  }
}

export default function InstallProduct({
  installable,
  productName,
  deprecated,
  lang,
  className,
  documentationUrl,
}: {
  installable: ProductInstallable[];
  productName: string;
  deprecated?: boolean;
  lang: Lang;
  className?: string;
  documentationUrl?: string;
}) {
  const { t } = useTranslation(undefined, { lng: lang });
  const isDesigner = useIsDesigner();
  const isVscode = useIsVscode();
  const designerVersion = useDesignerVersion();
  const [showDevVersions, setShowDevVersions] = useState(
    getInitialShowDevVersions,
  );
  const [selectedVersion, setSelectedVersion] = useState<string>();
  const installClass = cn(
    "h-12 px-6 text-base",
    deprecated && "bg-warning hover:bg-warning/80 text-white",
    className,
  );
  const documentationButton =
    isDesigner && documentationUrl ? (
      <a
        href={documentationUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("productDetails.documentation")}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-12 px-4 text-base",
        )}
      >
        <IconBook className="size-6" />
      </a>
    ) : null;

  if (installable.length === 0) {
    const button = (
      <Button disabled className={cn("h-12 px-6 text-base", className)}>
        {t("productDetails.install.noInstaller")}
      </Button>
    );
    return documentationButton ? (
      <div className={cn("flex items-center gap-2", className)}>
        {button}
        {documentationButton}
      </div>
    ) : (
      button
    );
  }

  if (isVscode) {
    return (
      <Button
        nativeButton={false}
        render={
          <a
            href="command:ivyProjects.installMarketProduct"
            onClick={(event) => {
              if (window.parent !== window) {
                event.preventDefault();
                window.parent.postMessage(
                  { type: "ivy.market.install", productName },
                  "*",
                );
              }
            }}
          />
        }
        className={installClass}
      >
        {t("productDetails.install.title")}
      </Button>
    );
  }

  if (!isDesigner) {
    return;
  }

  function changeShowDevVersions(checked: boolean) {
    saveShowDevVersions(checked);
    setShowDevVersions(checked);
  }

  const versions = versionsToDisplay(
    installable.map(({ version }) => version).sort(newestFirst),
    showDevVersions,
  );
  const designerMajorVersion = designerVersion?.split(".")[0];
  const compatibleVersions =
    designerMajorVersion === "10" || designerMajorVersion === "12"
      ? versions.filter(
          (version) =>
            Number.parseInt(version.split(".")[0], 10) <=
            Number.parseInt(designerMajorVersion, 10),
        )
      : versions;
  const version =
    selectedVersion && compatibleVersions.includes(selectedVersion)
      ? selectedVersion
      : bestMatchVersion(compatibleVersions, designerVersion);
  const url = installable.find(
    (installable) => installable.version === version,
  )?.url;

  function installInDesigner() {
    if (!url) return;
    if (typeof window.install !== "function") {
      console.warn("install() is only available inside the Axon Ivy Designer");
      return;
    }
    try {
      window.install(new URL(url, window.location.origin).href);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className={cn("col-span-2 flex flex-col gap-2", className)}>
      {compatibleVersions.length > 0 ? (
        <div className="designer:max-sm:flex-col flex flex-row gap-2">
          <NativeSelect
            className="designer:max-sm:w-full flex-1 [&_select]:h-12 [&_select]:text-base"
            value={version}
            aria-label={t("productDetails.download.version")}
            onChange={(event) => setSelectedVersion(event.currentTarget.value)}
          >
            {compatibleVersions.map((version) => (
              <NativeSelectOption key={version} value={version}>
                {t("productDetails.download.version")} {version}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <div className="flex items-center gap-2">
            {url && (
              <Button
                className={cn(installClass, "designer:flex-1 flex-1")}
                onClick={installInDesigner}
              >
                {t("productDetails.install.designerTitle")}
              </Button>
            )}
            {documentationButton}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <P role="status" className="text-sm">
            {t("productDetails.install.noCompatibleVersion", {
              version: designerMajorVersion,
            })}
          </P>
          {documentationButton}
        </div>
      )}
      <label className="flex items-center gap-1">
        <Checkbox
          checked={showDevVersions}
          onCheckedChange={changeShowDevVersions}
        />
        <P className="text-xs">{t("productDetails.download.devVersion")}</P>
      </label>
    </div>
  );
}
