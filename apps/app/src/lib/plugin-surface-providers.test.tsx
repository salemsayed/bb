// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  markPluginFrontendBootStarted,
  markPluginFrontendsSettled,
  resetPluginFrontendBootStateForTest,
} from "./plugin-frontend-boot-state";
import {
  resetPluginSlotStoreForTest,
  setPluginSlotRegistrations,
} from "./plugin-slots";
import {
  expectedSurfaceProviderIds,
  frontendPriorityPluginIds,
  otherPluginsWaitForThreadContent,
  useRememberSurfaceProvider,
  type PluginSurface,
} from "./plugin-surface-providers";
import { makePluginRegistrationSet } from "@/test/fixtures/plugins";
import { useRememberMessageContentProviders } from "@/hooks/useRememberMessageContentProviders";

function renderProvider(surface: PluginSurface, pluginId: string | null) {
  return renderHook(
    ({ pluginId }) => useRememberSurfaceProvider(surface, pluginId),
    { initialProps: { pluginId } },
  );
}

afterEach(() => {
  cleanup();
  resetPluginSlotStoreForTest();
  resetPluginFrontendBootStateForTest();
  window.localStorage.clear();
});

describe("expectedSurfaceProviderIds", () => {
  it("expects bb's own composer, thread list and navigation before anything is remembered", () => {
    expect(expectedSurfaceProviderIds()).toEqual([
      "bb--composer",
      "thread-list",
      "navigation",
    ]);
  });

  it("lists each remembered provider once in place of the default", () => {
    renderProvider("composer", "lists");
    renderProvider("thread-list", "lists");
    renderProvider("sidebar-navigation", "lists");

    expect(expectedSurfaceProviderIds()).toEqual(["lists"]);
  });

  it("keeps the provider while plugins are still loading, and expects none once boot completes without one", () => {
    renderProvider("thread-list", "my-thread-list").unmount();
    markPluginFrontendBootStarted();

    renderProvider("thread-list", null);
    expect(expectedSurfaceProviderIds()).toEqual([
      "bb--composer",
      "my-thread-list",
      "navigation",
    ]);

    act(() => markPluginFrontendsSettled());
    expect(expectedSurfaceProviderIds()).toEqual([
      "bb--composer",
      "navigation",
    ]);
  });
});

const THREAD_PATH = "/projects/proj_a/threads/thr_a";

function Fence() {
  return null;
}

function registerFenceRenderer(pluginId: string) {
  setPluginSlotRegistrations(
    pluginId,
    makePluginRegistrationSet({
      codeFenceRenderers: [
        { id: "card", languages: ["card"], component: Fence },
      ],
    }),
  );
}

describe("message content providers", () => {
  it("leaves thread routes on the screen-paint rule until a finished boot records who draws message content", () => {
    registerFenceRenderer("cards");
    markPluginFrontendBootStarted();
    renderHook(() => useRememberMessageContentProviders());

    expect(otherPluginsWaitForThreadContent(THREAD_PATH)).toBe(false);
    expect(frontendPriorityPluginIds(THREAD_PATH)).not.toContain("cards");

    act(() => markPluginFrontendsSettled());
    expect(otherPluginsWaitForThreadContent(THREAD_PATH)).toBe(true);
    expect(frontendPriorityPluginIds(THREAD_PATH)).toContain("cards");
  });

  it("loads the remembered content plugins first only on thread routes", () => {
    registerFenceRenderer("cards");
    markPluginFrontendBootStarted();
    markPluginFrontendsSettled();
    renderHook(() => useRememberMessageContentProviders());

    expect(frontendPriorityPluginIds("/")).not.toContain("cards");
    expect(otherPluginsWaitForThreadContent("/")).toBe(false);
  });

  it("records an empty set once boot completes without content plugins, so threads still wait for their rows", () => {
    markPluginFrontendBootStarted();
    markPluginFrontendsSettled();
    renderHook(() => useRememberMessageContentProviders());

    expect(otherPluginsWaitForThreadContent(THREAD_PATH)).toBe(true);
    expect(frontendPriorityPluginIds(THREAD_PATH)).toEqual(
      expectedSurfaceProviderIds(),
    );
  });
});
