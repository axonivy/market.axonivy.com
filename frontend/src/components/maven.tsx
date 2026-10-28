import type { MavenArtifacts } from "@/components/product-details";
import { CodeBlock } from "@/components/ui/code-block";
import { Base, Code, H4 } from "@/components/ui/typography";
import { Trans, useTranslation } from "react-i18next";

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
            <H4 className="mb-2">{artifact.name}</H4>
            <CodeBlock code={snippet} lang={lang} className="w-full" />
          </section>
        );
      })}
    </div>
  );
}
