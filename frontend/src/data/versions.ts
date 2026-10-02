const QUALIFIER_RANK: Record<string, number> = {
  a: 1,
  alpha: 1,
  b: 2,
  beta: 2,
  m: 3,
  milestone: 3,
  rc: 4,
  cr: 4,
  "": 5,
  ga: 5,
  final: 5,
  release: 5,
};

function parseVersion(version: string) {
  const snapshot = isSnapshot(version);
  const [base, ...rest] = version.replace(/-SNAPSHOT$/, "").split("-");
  const numbers = base.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const qualifier = rest.join("-").toLowerCase();
  const match = /^([a-z]*)[.-]?(\d*)$/.exec(qualifier);
  return {
    numbers,
    qualifierRank: QUALIFIER_RANK[match?.[1] ?? qualifier] ?? 6,
    qualifierName: match?.[1] ?? qualifier,
    qualifierNumber: Number.parseInt(match?.[2] ?? "", 10) || 0,
    snapshot,
  };
}

export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  for (let i = 0; i < Math.max(va.numbers.length, vb.numbers.length); i++) {
    const diff = (va.numbers[i] ?? 0) - (vb.numbers[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (va.qualifierRank !== vb.qualifierRank) {
    return va.qualifierRank - vb.qualifierRank;
  }
  if (va.qualifierName !== vb.qualifierName) {
    return va.qualifierName.localeCompare(vb.qualifierName);
  }
  if (va.qualifierNumber !== vb.qualifierNumber) {
    return va.qualifierNumber - vb.qualifierNumber;
  }
  return Number(vb.snapshot) - Number(va.snapshot);
}

export const newestFirst = (a: string, b: string) => compareVersions(b, a);

export function isSnapshot(version: string) {
  return version.endsWith("-SNAPSHOT");
}

function bugfixVersion(version: string): string {
  return version.split("-")[0].split(".").slice(0, 3).join(".");
}

function isReleasedVersion(version: string): boolean {
  return !version.includes("-") && /^\d/.test(version);
}

function majorMinor(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

export function compatibilityRange(
  versions: string[],
  deprecated: boolean,
): string | undefined {
  const released = versions.filter(isReleasedVersion).sort(newestFirst);
  if (released.length === 0) return undefined;
  const suffix = deprecated ? "" : "+";
  const oldest = majorMinor(released.at(-1)!);
  const newest = majorMinor(released[0]);
  return oldest.split(".")[0] === newest.split(".")[0]
    ? `${oldest}${suffix}`
    : `${oldest} - ${newest}${suffix}`;
}

export function versionsToDisplay(
  versions: string[],
  showDevVersions: boolean,
): string[] {
  const released = versions.filter(isReleasedVersion);
  if (!showDevVersions && released.length > 0) return released;
  const releasedBugfixes = new Set(released.map(bugfixVersion));
  return versions.filter(
    (version) =>
      isReleasedVersion(version) ||
      !releasedBugfixes.has(bugfixVersion(version)),
  );
}
