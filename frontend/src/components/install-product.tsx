import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { P } from "@/components/ui/typography";
import { useIsDesigner } from "@/data/designer";
import {
  getInitialShowDevVersions,
  saveShowDevVersions,
} from "@/data/dev-versions";
import type { ProductInstallable } from "@/data/product-types";
import { newestFirst, versionsToDisplay } from "@/data/versions";
import { cn } from "@/lib/utils";
import { localePath } from "@/translation/language";
import "@/translation/ui";
import type { Lang } from "@/translation/ui";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

declare global {
  interface Window {
    install?: (url: string) => void;
  }
}

export default function InstallProduct({
  installable,
  deprecated,
  lang,
}: {
  installable: ProductInstallable[];
  deprecated?: boolean;
  lang: Lang;
}) {
  const { t } = useTranslation(undefined, { lng: lang });
  const isDesigner = useIsDesigner();
  const [showDevVersions, setShowDevVersions] = useState(
    getInitialShowDevVersions,
  );
  const [selectedVersion, setSelectedVersion] = useState<string>();
  const installClass = cn(
    "h-12 px-6 text-base",
    deprecated && "bg-warning hover:bg-warning/80 text-white",
  );

  if (installable.length === 0) {
    return (
      <Button disabled className="h-12 px-6 text-base">
        {t("productDetails.install.noInstaller")}
      </Button>
    );
  }

  if (!isDesigner) {
    return (
      <Popover>
        <PopoverTrigger
          render={
            <Button className={cn(installClass, "designer:invisible")}>
              {t("productDetails.install.title")}
            </Button>
          }
        />
        <PopoverContent align="end" className="w-80 gap-2">
          {deprecated && <P>{t("productDetails.install.deprecatedWarning")}</P>}
          <P>
            <Trans
              t={t}
              i18nKey="productDetails.install.openInDesigner"
              components={{
                market: (
                  <a className="underline" href={localePath(lang, "/")} />
                ),
                designer: (
                  <a
                    className="underline"
                    href={"https://developer.axonivy.com/download"}
                  />
                ),
              }}
            />
          </P>
        </PopoverContent>
      </Popover>
    );
  }

  function changeShowDevVersions(checked: boolean) {
    saveShowDevVersions(checked);
    setShowDevVersions(checked);
  }

  const versions = versionsToDisplay(
    installable.map(({ version }) => version).sort(newestFirst),
    showDevVersions,
  );
  const version =
    selectedVersion && versions.includes(selectedVersion)
      ? selectedVersion
      : versions[0];
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
    <div className="col-span-2 flex flex-col gap-1">
      <div className="flex flex-row gap-2">
        <NativeSelect
          className="flex-1 [&_select]:h-12 [&_select]:text-base"
          value={version}
          aria-label={t("productDetails.download.version")}
          onChange={(event) => setSelectedVersion(event.currentTarget.value)}
        >
          {versions.map((version) => (
            <NativeSelectOption key={version} value={version}>
              {t("productDetails.download.version")} {version}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button className={installClass} onClick={installInDesigner}>
          {t("productDetails.install.designerTitle")}
        </Button>
      </div>
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
