import { useEffect } from "react";
import { usePluginFrontendBootComplete } from "@/lib/plugin-frontend-boot-state";
import { usePluginSlotKind } from "@/lib/plugin-slots";
import { rememberMessageContentProviders } from "@/lib/plugin-surface-providers";

export function useRememberMessageContentProviders(): void {
  const bootComplete = usePluginFrontendBootComplete();
  const codeFenceRenderers = usePluginSlotKind("codeFenceRenderers");
  const messageDirectives = usePluginSlotKind("messageDirectives");
  const timelineRenderers = usePluginSlotKind("timelineRenderers");
  useEffect(() => {
    if (!bootComplete) return;
    rememberMessageContentProviders(
      [...codeFenceRenderers, ...messageDirectives, ...timelineRenderers].map(
        (slot) => slot.pluginId,
      ),
    );
  }, [bootComplete, codeFenceRenderers, messageDirectives, timelineRenderers]);
}
