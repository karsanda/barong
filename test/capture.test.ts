import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { captureAll, type CaptureResult } from "../src/capture.ts";
import { loadConfig } from "../src/config.ts";
import { FIXTURE_URL, pixel, readPng, tempDir, writeJSON } from "./helpers.ts";

const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const GREEN = [0, 255, 0];
const WHITE = [255, 255, 255];

describe("captureAll", () => {
  let results: Map<string, CaptureResult>;

  beforeAll(async () => {
    const dir = tempDir();
    writeJSON(path.join(dir, "barong.json"), { viewport: { width: 800, height: 600 } });
    writeJSON(path.join(dir, "scenarios", "fixture.json"), {
      label: "Fixture",
      url: FIXTURE_URL,
      captures: [
        { label: "Box", selector: "#box" },
        { label: "Clip", clip: { x: 0, y: 0, width: 50, height: 30 } },
        { label: "Viewport" },
        { label: "Full page", fullPage: true },
        { label: "Hovered", actions: [{ hover: "#hover" }], selector: "#hover" },
        { label: "Not hovered", selector: "#hover" },
        { label: "Panel", actions: [{ click: "#toggle" }], selector: "#panel" },
        { label: "Hidden box", clip: { x: 0, y: 0, width: 20, height: 20 }, hide: ["#box"] },
        { label: "Masked box", selector: "#box", mask: ["#box"] },
        { label: "Broken", selector: "#does-not-exist" },
      ],
    });
    writeJSON(path.join(dir, "scenarios", "mobile.json"), {
      label: "Mobile",
      url: FIXTURE_URL,
      viewport: { width: 375, height: 667 },
      captures: [{ label: "Viewport" }],
    });

    const config = loadConfig(dir);
    const list = await captureAll(config.captures, {
      outDir: path.join(dir, "out"),
      concurrency: 4,
      timeout: 3_000,
    });
    results = new Map(list.map((r) => [r.capture.label + "@" + r.capture.scenario, r]));
  });

  const image = (label: string, scenario = "Fixture") => {
    const result = results.get(`${label}@${scenario}`);
    expect(result?.error).toBeUndefined();
    return readPng(result?.file as string);
  };

  it("captures an element by selector", () => {
    const png = image("Box");
    expect([png.width, png.height]).toEqual([200, 100]);
    expect(pixel(png, 10, 10)).toEqual(RED);
  });

  it("captures a clip region", () => {
    const png = image("Clip");
    expect([png.width, png.height]).toEqual([50, 30]);
  });

  it("captures the viewport by default, honouring scenario viewports", () => {
    const desktop = image("Viewport");
    expect([desktop.width, desktop.height]).toEqual([800, 600]);
    const mobile = image("Viewport", "Mobile");
    expect([mobile.width, mobile.height]).toEqual([375, 667]);
  });

  it("captures the full page", () => {
    expect(image("Full page").height).toBeGreaterThan(3000);
  });

  it("runs hover actions with transitions frozen", () => {
    expect(pixel(image("Not hovered"), 5, 5)).toEqual(BLUE);
    expect(pixel(image("Hovered"), 5, 5)).toEqual(GREEN);
  });

  it("runs click actions before capturing", () => {
    const png = image("Panel");
    expect([png.width, png.height]).toEqual([120, 60]);
  });

  it("hides elements", () => {
    expect(pixel(image("Hidden box"), 5, 5)).toEqual(WHITE);
  });

  it("masks elements", () => {
    expect(pixel(image("Masked box"), 5, 5)).toEqual([255, 0, 255]);
  });

  it("reports failures per capture instead of aborting", () => {
    const broken = results.get("Broken@Fixture");
    expect(broken?.file).toBeUndefined();
    expect(broken?.error).toMatch(
      /^locator\.screenshot: Timeout .*exceeded\. \(waiting for locator\('#does-not-exist'\)/,
    );
  });
});
