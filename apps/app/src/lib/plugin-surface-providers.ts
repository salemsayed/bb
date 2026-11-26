import { useEffect } from "react";
import { z } from "zod";
import { createLastKnownCache } from "@/lib/last-known-cache";
import { usePluginFrontendBootComplete } from "@/lib/plugin-frontend-boot-state";
import {
  getRouteOwnerPluginId,
  getThreadRouteThreadId,
} from "@/lib/route-paths";

const PLUGIN_SURFACES = [
  "composer",
  "thread-list",
  "sidebar-navigation",
  "thread-panel-tab",
] as const;

export type PluginSurface = (typeof PLUGIN_SURFACES)[number];

const DEFAULT_SURFACE_PROVIDERS: Record<PluginSurface, string | null> = {
  composer: "bb--composer",
  "thread-list": "thread-list",
  "sidebar-navigation": "navigation",
  "thread-panel-tab": null,
};

const surfaceProviderCache = createLastKnownCache({
  prefix: "bb.plugin-surface-provider",
  version: "2",
  schema: z.object({ pluginId: z.string().min(1).nullable() }),
});

export function expectedSurfaceProviderIds(): string[] {
  const ids = PLUGIN_SURFACES.flatMap((surface) => {
    const remembered = surfaceProviderCache.read(
      surfaceProviderCache.key(surface),
    );
    const pluginId =
      remembered === null
        ? DEFAULT_SURFACE_PROVIDERS[surface]
        : remembered.pluginId;
    return pluginId === null ? [] : [pluginId];
  });
  return [...new Set(ids)];
}

const messageContentProviderCache = createLastKnownCache({
  prefix: "bb.plugin-message-content-providers",
  version: "1",
  schema: z.object({ pluginIds: z.array(z.string().min(1)) }),
});

function rememberedMessageContentProviderIds(): string[] | null {
  return (
    messageContentProviderCache.read(messageContentProviderCache.key())
      ?.pluginIds ?? null
  );
}

export function frontendPriorityPluginIds(pathname: string): string[] {
  const routePluginId = getRouteOwnerPluginId(pathname);
  const messageContentProviderIds =
    getThreadRouteThreadId(pathname) === null
      ? []
      : (rememberedMessageContentProviderIds() ?? []);
  return [
    ...new Set([
      ...(routePluginId === null ? [] : [routePluginId]),
      ...expectedSurfaceProviderIds(),
      ...messageContentProviderIds,
    ]),
  ];
}

export function otherPluginsWaitForThreadContent(pathname: string): boolean {
  return (
    getThreadRouteThreadId(pathname) !== null &&
    rememberedMessageContentProviderIds() !== null
  );
}

export function rememberMessageContentProviders(
  pluginIds: readonly string[],
): void {
  const sorted = [...new Set(pluginIds)].sort();
  const key = messageContentProviderCache.key();
  const remembered = messageContentProviderCache.read(key)?.pluginIds;
  if (remembered?.join("\n") !== sorted.join("\n")) {
    messageContentProviderCache.write(key, { pluginIds: sorted });
  }
}

export function useRememberSurfaceProvider(
  surface: PluginSurface,
  pluginId: string | null,
): void {
  const bootComplete = usePluginFrontendBootComplete();
  useEffect(() => {
    if (pluginId === null && !bootComplete) return;
    const key = surfaceProviderCache.key(surface);
    if (surfaceProviderCache.read(key)?.pluginId !== pluginId) {
      surfaceProviderCache.write(key, { pluginId });
    }
  }, [bootComplete, pluginId, surface]);
}
