import { useSyncExternalStore } from "react";

export const DESIGNER_PARAMS = {
  viewer: "ivy-viewer",
  version: "ivy-version",
  newVersion: "ivy.version",
  designerViewer: "designer-market",
  restClient: "resultsOnly",
};

export type DesignerEnv = {
  isDesigner: boolean;
  isRestClient: boolean;
  version?: string;
};

export function getDesignerEnv(): DesignerEnv {
  if (typeof document === "undefined") {
    return { isDesigner: false, isRestClient: false };
  }
  const { designer: version, restClient } = document.documentElement.dataset;
  return {
    isDesigner: version !== undefined,
    isRestClient: restClient !== undefined,
    version: version || undefined,
  };
}

export function useIsDesigner(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => getDesignerEnv().isDesigner,
    () => false,
  );
}

export function useIsRestClient(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => getDesignerEnv().isRestClient,
    () => false,
  );
}

export function useDesignerVersion(): string | undefined {
  return useSyncExternalStore(
    noSubscription,
    () => getDesignerEnv().version,
    () => undefined,
  );
}

const noSubscription = () => () => {};
