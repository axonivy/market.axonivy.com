import { describe, expect, it } from "vitest";
import type { ChangelogRelease } from "../../scripts/fetch-changelog";
import { changelogVersions } from "../../src/components/changelog";

function releases(...names: string[]): ChangelogRelease[] {
  return names.map((name) => ({
    name,
    publishedAt: "2026-01-01T00:00:00Z",
    url: `https://github.com/axonivy/demo/releases/${name}`,
    body: "",
    latest: false,
  }));
}

describe("changelogVersions", () => {
  it("keeps only the two newest LTS versions", () => {
    expect(
      changelogVersions(releases("14.0.0", "12.0.0", "10.0.0", "8.0.0")),
    ).toEqual([14, 12]);
  });

  it("adds the Leading Edge version if it is newer than the newest LTS", () => {
    expect(
      changelogVersions(releases("15.0.0", "14.0.0", "13.0.0", "12.0.0")),
    ).toEqual([15, 14, 12]);
  });

  it("drops the Leading Edge version once a newer LTS is released", () => {
    expect(
      changelogVersions(releases("14.0.0", "13.0.0", "12.0.0", "10.0.0")),
    ).toEqual([14, 12]);
  });

  it("returns each major version once, newest first", () => {
    expect(
      changelogVersions(releases("12.0.1", "14.0.2", "12.0.0", "14.0.0")),
    ).toEqual([14, 12]);
  });
});
