const SHOW_DEV_VERSIONS_KEY = "showDevVersions";

export function getInitialShowDevVersions(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(SHOW_DEV_VERSIONS_KEY) === "true";
}

export function saveShowDevVersions(checked: boolean) {
  localStorage.setItem(SHOW_DEV_VERSIONS_KEY, String(checked));
}
