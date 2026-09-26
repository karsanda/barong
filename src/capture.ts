import fs from "node:fs";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { chromium, type Browser, type Page } from "playwright";
import type { Action, ResolvedCapture } from "./config.ts";

export interface CaptureOptions {
  outDir: string;
  concurrency: number;
  timeout: number;
  headed?: boolean;
  onResult?: (result: CaptureResult) => void;
}

export interface CaptureResult {
  name: string;
  capture: ResolvedCapture;
  file?: string;
  error?: string;
  durationMs: number;
}

const FREEZE_CSS = `
*, *::before, *::after {
  transition: none !important;
  animation: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}`;

export async function captureAll(
  captures: ResolvedCapture[],
  options: CaptureOptions,
): Promise<CaptureResult[]> {
  fs.mkdirSync(options.outDir, { recursive: true });
  const browser = await chromium.launch({ headless: !options.headed });
  try {
    return await mapLimit(captures, options.concurrency, async (capture) => {
      const result = await captureOne(browser, capture, options);
      options.onResult?.(result);
      return result;
    });
  } finally {
    await browser.close();
  }
}

async function captureOne(
  browser: Browser,
  capture: ResolvedCapture,
  options: CaptureOptions,
): Promise<CaptureResult> {
  const started = performance.now();
  const file = path.join(options.outDir, `${capture.name}.png`);
  fs.rmSync(file, { force: true });

  // A fresh context per capture keeps captures independent of each other's actions.
  const context = await browser.newContext({
    viewport: capture.viewport,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  context.setDefaultTimeout(options.timeout);
  context.setDefaultNavigationTimeout(options.timeout);

  try {
    const page = await context.newPage();
    await page.goto(capture.url, { waitUntil: capture.waitUntil });
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.evaluate("document.fonts.ready");

    for (const action of capture.actions) await runAction(page, action);

    if (capture.hide.length > 0) {
      await page.addStyleTag({
        content: `${capture.hide.join(", ")} { visibility: hidden !important; }`,
      });
    }

    const screenshotOptions = {
      path: file,
      animations: "disabled" as const,
      caret: "hide" as const,
      mask: capture.mask.map((selector) => page.locator(selector)),
      maskColor: "#ff00ff",
    };

    if (capture.selector) {
      await page.locator(capture.selector).first().screenshot(screenshotOptions);
    } else {
      await page.screenshot({
        ...screenshotOptions,
        clip: capture.clip,
        fullPage: capture.fullPage,
      });
    }

    return { name: capture.name, capture, file, durationMs: performance.now() - started };
  } catch (error) {
    return {
      name: capture.name,
      capture,
      error: summarizeError((error as Error).message),
      durationMs: performance.now() - started,
    };
  } finally {
    await context.close();
  }
}

async function runAction(page: Page, action: Action): Promise<void> {
  if ("click" in action) await page.locator(action.click).first().click();
  else if ("hover" in action) await page.locator(action.hover).first().hover();
  else if ("fill" in action) await page.locator(action.fill).first().fill(action.value);
  else if ("press" in action) {
    if (action.selector) await page.locator(action.selector).first().press(action.press);
    else await page.keyboard.press(action.press);
  } else if ("scroll" in action) await page.locator(action.scroll).first().scrollIntoViewIfNeeded();
  else if ("waitFor" in action) await page.locator(action.waitFor).first().waitFor();
  else await page.waitForTimeout(action.wait);
}

/** Playwright errors carry a long call log; keep the headline and the first logged step. */
export function summarizeError(message: string): string {
  const lines = stripVTControlCharacters(message)
    .split("\n")
    .map((line) => line.trim());
  const headline = (lines[0] ?? "").replace(/\s*Call log:$/, "");
  const step = lines.find((line) => line.startsWith("- "));
  return step ? `${headline} (${step.slice(2)})` : headline;
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = Array.from<R>({ length: items.length });
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
