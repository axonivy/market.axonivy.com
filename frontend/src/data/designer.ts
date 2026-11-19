import { useSyncExternalStore } from "react";

export const DESIGNER_PARAMS = {
  viewer: "ivy-viewer",
  version: "ivy-version",
  newVersion: "ivy.version",
  designerViewer: "designer-market",
  vscodeViewer: "vscode-market",
  restClient: "resultsOnly",
};

export type DesignerEnv = {
  isDesigner: boolean;
  isRestClient: boolean;
  version?: string;
};

export type VscodeEnv = { isVscode: boolean; isRestClient: boolean };

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

export function getVscodeEnv(): VscodeEnv {
  if (typeof document === "undefined") {
    return { isVscode: false, isRestClient: false };
  }
  const { restClient } = document.documentElement.dataset;
  return {
    isVscode: document.documentElement.dataset.vscode !== undefined,
    isRestClient: restClient !== undefined,
  };
}

export function useIsDesigner(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => getDesignerEnv().isDesigner,
    () => false,
  );
}

export function useIsVscode(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => getVscodeEnv().isVscode,
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
