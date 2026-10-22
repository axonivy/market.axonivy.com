import { useSyncExternalStore } from "react";

export const DESIGNER_PARAMS = {
  viewer: "ivy-viewer",
  version: "ivy-version",
  newVersion: "ivy.version",
  designerViewer: "designer-market",
};

export type DesignerEnv = { isDesigner: boolean; version?: string };

export function getDesignerEnv(): DesignerEnv {
  if (typeof document === "undefined") {
    return { isDesigner: false };
  }
  const version = document.documentElement.dataset.designer;
  return { isDesigner: version !== undefined, version: version || undefined };
}

export function useIsDesigner(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => getDesignerEnv().isDesigner,
    () => false,
  );
}

const noSubscription = () => () => {};
