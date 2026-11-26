// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  SCREEN_CONTENT_DEADLINE_MS,
  SCREEN_PAINT_DEADLINE_MS,
  markScreenContentShown,
  resetScreenPaintForTest,
  whenScreenContentShown,
  whenScreenPainted,
} from "./screen-paint";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  resetScreenPaintForTest();
});

afterEach(() => {
  resetScreenPaintForTest();
  vi.useRealTimers();
});

it("releases waiters at the deadline when no screen ever signals that it painted", async () => {
  const released = vi.fn();
  void whenScreenPainted().then(released);

  await vi.advanceTimersByTimeAsync(SCREEN_PAINT_DEADLINE_MS - 1);
  expect(released).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(released).toHaveBeenCalledTimes(1);
});

it("counts the deadline from page start, so a waiter that arrives late is released at once", async () => {
  await vi.advanceTimersByTimeAsync(SCREEN_PAINT_DEADLINE_MS + 500);
  const released = vi.fn();
  void whenScreenPainted().then(released);

  await vi.advanceTimersByTimeAsync(0);
  expect(released).toHaveBeenCalledTimes(1);
});

it("releases content waiters two frames after the screen reports its content, before the deadline", async () => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "performance",
      "requestAnimationFrame",
    ],
  });
  const released = vi.fn();
  void whenScreenContentShown().then(released);

  markScreenContentShown();
  await vi.advanceTimersToNextFrame();
  expect(released).not.toHaveBeenCalled();
  await vi.advanceTimersToNextFrame();
  expect(released).toHaveBeenCalledTimes(1);
});

it("releases content waiters at the content deadline when no content ever shows", async () => {
  const released = vi.fn();
  void whenScreenContentShown().then(released);

  await vi.advanceTimersByTimeAsync(SCREEN_CONTENT_DEADLINE_MS - 1);
  expect(released).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(released).toHaveBeenCalledTimes(1);
});
