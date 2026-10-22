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
import { isDownloadable, type ProductArtifact } from "@/data/product-types";
import { newestFirst, versionsToDisplay } from "@/data/versions";
import "@/translation/ui";
import type { Lang } from "@/translation/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function DownloadProduct({
  artifacts,
  mainArtifactId,
  lang,
}: {
  artifacts: ProductArtifact[];
  mainArtifactId?: string;
  lang: Lang;
}) {
  const { t } = useTranslation(undefined, { lng: lang });
  const downloadable = artifacts.filter(isDownloadable);
  const [artifactId, setArtifactId] = useState(mainArtifactId);
  const [showDevVersions, setShowDevVersions] = useState(
    getInitialShowDevVersions,
  );
  const [selectedVersion, setSelectedVersion] = useState<string>();
  const isDesigner = useIsDesigner();

  function changeShowDevVersions(checked: boolean) {
    saveShowDevVersions(checked);
    setShowDevVersions(checked);
  }

  const allVersions = [
    ...new Set(
      downloadable.flatMap((artifact) =>
        artifact.versions.map(({ version }) => version),
      ),
    ),
  ].sort(newestFirst);
  const versions = versionsToDisplay(allVersions, showDevVersions);
  const version =
    selectedVersion && versions.includes(selectedVersion)
      ? selectedVersion
      : versions[0];
  const urlFor = (artifact: ProductArtifact) =>
    artifact.versions.find(
      (artifactVersion) => artifactVersion.version === version,
    )?.url;
  const available = downloadable.filter(urlFor);
  const artifact =
    available.find((artifact) => artifact.artifactId === artifactId) ??
    available[0];
  if (!artifact || isDesigner) return null;
  const downloadUrl = urlFor(artifact);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="designer:invisible h-12 px-6 text-base"
          >
            {t("common.download")}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 gap-4">
        <div className="flex flex-col gap-1">
          <P>{t("productDetails.download.artifact")}</P>
          <NativeSelect
            className="w-full"
            value={artifact.artifactId}
            onChange={(event) => setArtifactId(event.currentTarget.value)}
          >
            {available.map(({ artifactId, name, type }) => (
              <NativeSelectOption key={artifactId} value={artifactId}>
                {name} ({type})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <P>{t("productDetails.download.targetPlatform")}</P>
          <NativeSelect
            className="w-full"
            value={version}
            onChange={(event) => setSelectedVersion(event.currentTarget.value)}
          >
            {versions.map((version) => (
              <NativeSelectOption key={version} value={version}>
                {t("productDetails.download.version")} {version}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <div className="flex items-center gap-1">
            <Checkbox
              checked={showDevVersions}
              onCheckedChange={changeShowDevVersions}
            />
            <P className="text-xs">{t("productDetails.download.devVersion")}</P>
          </div>
        </div>
        <Button
          className="w-fit self-end"
          nativeButton={false}
          render={<a href={downloadUrl} download />}
        >
          {t("common.download")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
