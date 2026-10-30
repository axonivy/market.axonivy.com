import { Markdown } from "@/components/product-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { H3, P } from "@/components/ui/typography";
import type { Lang } from "@/translation/ui";
import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import type { ChangelogRelease } from "../../scripts/fetch-changelog";

const majorVersion = (release: ChangelogRelease) =>
  Number(release.name.match(/\d+/)?.[0]);

/**
 * Even major versions are LTS releases, odd ones are Leading Edge releases.
 * Shows the two newest LTS versions, plus the newest Leading Edge version
 * if it is newer than both of them. Newest first.
 */
export function changelogVersions(changelog: ChangelogRelease[]) {
  const allVersions = Array.from(new Set(changelog.map(majorVersion))).sort(
    (a, b) => b - a,
  );
  const ltsVersions = allVersions.filter((v) => v % 2 === 0).slice(0, 2);
  const leadingEdge = allVersions.find((v) => v % 2 !== 0);
  return leadingEdge !== undefined &&
    leadingEdge > (ltsVersions[0] ?? -Infinity)
    ? [leadingEdge, ...ltsVersions]
    : ltsVersions;
}

export default function Changelog({
  changelog,
  lang,
}: {
  changelog: ChangelogRelease[];
  lang: Lang;
}) {
  const versions = changelogVersions(changelog);
  const [activeVersion, setActiveVersion] = useState(versions[0]);

  const activeReleases = changelog.filter(
    (release) => majorVersion(release) === activeVersion,
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-row flex-wrap gap-4">
        {versions.map((version) => (
          <Button
            key={version}
            onClick={() => setActiveVersion(version)}
            variant={version === activeVersion ? "default" : "outline"}
          >
            Version {version}
          </Button>
        ))}
      </div>
      {activeReleases.map((release) => (
        <Card key={release.url}>
          <Collapsible defaultOpen className="flex flex-col gap-2">
            <CardHeader className="gap-4">
              <div className="flex flex-row justify-between">
                <H3 className="flex flex-row items-center gap-4">
                  <a
                    href={release.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {release.name}
                  </a>
                  {release.latest && <Badge>Latest</Badge>}
                </H3>
                <CollapsibleTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
                    >
                      <IconChevronDown className="group-data-panel-open/button:rotate-180" />
                    </Button>
                  }
                />
              </div>

              <P className="text-n900">
                {new Date(release.publishedAt).toLocaleDateString(lang, {
                  timeZone: "UTC",
                })}
              </P>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <Markdown markdown={release.body} baseUrl="" lang={lang} />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
