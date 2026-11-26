export const SCREEN_PAINT_DEADLINE_MS = 3_000;
export const SCREEN_CONTENT_DEADLINE_MS = 10_000;

interface PaintSignal {
  done: boolean;
  deadline: ReturnType<typeof setTimeout> | null;
  resolve: (() => void) | null;
  promise: Promise<void>;
}

function createPaintSignal(): PaintSignal {
  const signal: PaintSignal = {
    done: false,
    deadline: null,
    resolve: null,
    promise: Promise.resolve(),
  };
  signal.promise = new Promise<void>((resolve) => {
    signal.resolve = resolve;
  });
  return signal;
}

function settle(signal: PaintSignal): void {
  if (signal.done) return;
  signal.done = true;
  if (signal.deadline !== null) clearTimeout(signal.deadline);
  signal.deadline = null;
  signal.resolve?.();
  signal.resolve = null;
}

function waitWithDeadline(
  signal: PaintSignal,
  deadlineMs: number,
): Promise<void> {
  if (!signal.done && signal.deadline === null) {
    signal.deadline = setTimeout(
      () => settle(signal),
      Math.max(0, deadlineMs - performance.now()),
    );
  }
  return signal.promise;
}

let screen = createPaintSignal();
let content = createPaintSignal();

export function markScreenPainted(): void {
  settle(screen);
}

export function whenScreenPainted(): Promise<void> {
  return waitWithDeadline(screen, SCREEN_PAINT_DEADLINE_MS);
}

export function markScreenContentShown(): void {
  if (content.done) return;
  const shown = content;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => settle(shown));
  });
}

export function whenScreenContentShown(): Promise<void> {
  return waitWithDeadline(content, SCREEN_CONTENT_DEADLINE_MS);
}

export function resetScreenPaintForTest(): void {
  for (const signal of [screen, content]) {
    if (signal.deadline !== null) clearTimeout(signal.deadline);
  }
  screen = createPaintSignal();
  content = createPaintSignal();
}
