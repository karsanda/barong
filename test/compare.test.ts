import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { compareOne, pngSize, type CompareOptions } from "../src/compare.ts";
import { readPng, solidPng, tempDir } from "./helpers.ts";

const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [255, 0, 0];

let options: CompareOptions;
const target = { name: "page__area", scenario: "Page", label: "Area" };

function write(dir: "referenceDir" | "testDir", png: Buffer) {
  fs.mkdirSync(options[dir], { recursive: true });
  fs.writeFileSync(path.join(options[dir], `${target.name}.png`), png);
}

beforeEach(() => {
  const root = tempDir();
  options = {
    referenceDir: path.join(root, "reference"),
    testDir: path.join(root, "test"),
    diffDir: path.join(root, "diff"),
    threshold: 0.1,
    maxDiffPercent: 0,
  };
  fs.mkdirSync(options.diffDir, { recursive: true });
});

describe("compareOne", () => {
  it("passes identical images", () => {
    write("referenceDir", solidPng(40, 20, WHITE));
    write("testDir", solidPng(40, 20, WHITE));

    const result = compareOne(target, options);
    expect(result).toMatchObject({
      status: "passed",
      diffPixels: 0,
      diffPercent: 0,
      sizeChanged: false,
      boxes: [],
    });
    expect(fs.existsSync(result.diff as string)).toBe(true);
  });

  it("fails changed images and locates the change", () => {
    write("referenceDir", solidPng(100, 100, WHITE));
    write(
      "testDir",
      solidPng(100, 100, WHITE, { x: 40, y: 50, width: 10, height: 10, color: RED }),
    );

    const result = compareOne(target, options);
    expect(result.status).toBe("failed");
    expect(result.diffPixels).toBe(100);
    expect(result.diffPercent).toBe(1);
    expect(result.boxes).toEqual([{ x: 32, y: 48, width: 32, height: 16 }]);

    const diff = readPng(result.diff as string);
    expect(diff.width).toBe(100);
  });

  it("tolerates differences up to maxDiffPercent", () => {
    write("referenceDir", solidPng(100, 100, WHITE));
    write("testDir", solidPng(100, 100, WHITE, { x: 0, y: 0, width: 10, height: 10, color: RED }));

    expect(compareOne(target, { ...options, maxDiffPercent: 1 }).status).toBe("passed");
    expect(compareOne(target, { ...options, maxDiffPercent: 0.5 }).status).toBe("failed");
  });

  it("fails when the size changed and pads to the larger canvas", () => {
    write("referenceDir", solidPng(50, 40, WHITE));
    write("testDir", solidPng(50, 60, WHITE));

    const result = compareOne(target, options);
    expect(result).toMatchObject({
      status: "failed",
      sizeChanged: true,
      size: { width: 50, height: 60 },
      referenceSize: { width: 50, height: 40 },
      testSize: { width: 50, height: 60 },
    });
  });

  it("reports new captures without a reference", () => {
    write("testDir", solidPng(10, 10, WHITE));
    expect(compareOne(target, options)).toMatchObject({
      status: "new",
      testSize: { width: 10, height: 10 },
    });
  });

  it("reports missing test images", () => {
    write("referenceDir", solidPng(10, 10, WHITE));
    expect(compareOne(target, options).status).toBe("missing");
  });

  it("reports capture errors and ignores a stale test image", () => {
    write("referenceDir", solidPng(10, 10, WHITE));
    write("testDir", solidPng(10, 10, WHITE));
    const result = compareOne({ ...target, error: "Timeout" }, options);
    expect(result).toMatchObject({ status: "error", error: "Timeout", test: undefined });
  });
});

describe("pngSize", () => {
  it("reads dimensions from the header", () => {
    const file = path.join(tempDir(), "a.png");
    fs.writeFileSync(file, solidPng(123, 45, WHITE));
    expect(pngSize(file)).toEqual({ width: 123, height: 45 });
  });
});
