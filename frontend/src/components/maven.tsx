import { CodeBlock } from "@/components/ui/code-block";
import { Base, Code, H4, H5 } from "@/components/ui/typography";
import type { ProductArtifact } from "@/data/product-types";
import type { Lang } from "@/translation/ui";
import { Trans, useTranslation } from "react-i18next";

export type MavenArtifacts = {
  artifacts: ProductArtifact[];
  mainArtifactId?: string;
  productName: string;
  version: string;
  lang: Lang;
};

export default function Maven({
  artifacts,
  mainArtifactId,
  productName,
  version,
  lang,
}: MavenArtifacts) {
  const { t } = useTranslation(undefined, { lng: lang });
  const orderedArtifacts = mainArtifactId
    ? [
        ...artifacts.filter(
          (artifact) => artifact.artifactId === mainArtifactId,
        ),
        ...artifacts.filter(
          (artifact) => artifact.artifactId !== mainArtifactId,
        ),
      ]
    : artifacts;

  return (
    <div className="space-y-8">
      <H4>{t("productDetails.tabs.dependencies.maven.title")}</H4>
      <Base>
        <Trans
          t={t}
          i18nKey="productDetails.tabs.dependencies.maven.description"
          components={{ code: <Code /> }}
        />
      </Base>
      {orderedArtifacts.map((artifact) => {
        const snippet = [
          `<!-- ${productName} - ${artifact.name} -->`,
          "<dependency>",
          `  <groupId>${artifact.groupId}</groupId>`,
          `  <artifactId>${artifact.artifactId}</artifactId>`,
          `  <version>${version}</version>`,
          `  <type>${artifact.type}</type>`,
          "</dependency>",
        ].join("\n");
        return (
          <section
            key={`${artifact.groupId}:${artifact.artifactId}`}
            className="w-full"
          >
            <H5 className="mb-2">{artifact.name}</H5>
            <CodeBlock code={snippet} lang={lang} className="w-full" />
          </section>
        );
      })}
    </div>
  );
}
