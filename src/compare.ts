import fs from "node:fs";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import type { Box, ResultItem, Size } from "./types.ts";

export interface CompareTarget {
  name: string;
  scenario: string;
  label: string;
  url?: string;
  /** Set when capturing failed; the item is reported as `error`. */
  error?: string;
}

export interface CompareOptions {
  referenceDir: string;
  testDir: string;
  diffDir: string;
  threshold: number;
  maxDiffPercent: number;
}

const DIFF_COLOR: [number, number, number] = [255, 87, 34];
const CELL = 16;
const MAX_BOXES = 50;

export function compareAll(targets: CompareTarget[], options: CompareOptions): ResultItem[] {
  fs.mkdirSync(options.diffDir, { recursive: true });
  return targets.map((target) => compareOne(target, options));
}

export function compareOne(target: CompareTarget, options: CompareOptions): ResultItem {
  const { name, scenario, label, url } = target;
  const referenceFile = path.join(options.referenceDir, `${name}.png`);
  const testFile = path.join(options.testDir, `${name}.png`);
  const diffFile = path.join(options.diffDir, `${name}.png`);
  fs.rmSync(diffFile, { force: true });

  const hasReference = fs.existsSync(referenceFile);
  const hasTest = !target.error && fs.existsSync(testFile);
  const item: ResultItem = {
    name,
    scenario,
    label,
    url,
    status: "passed",
    reference: hasReference ? referenceFile : undefined,
    test: hasTest ? testFile : undefined,
    referenceSize: hasReference ? pngSize(referenceFile) : undefined,
    testSize: hasTest ? pngSize(testFile) : undefined,
  };

  if (target.error) return { ...item, status: "error", error: target.error };
  if (!hasTest) return { ...item, status: "missing" };
  if (!hasReference) return { ...item, status: "new" };

  const reference = PNG.sync.read(fs.readFileSync(referenceFile));
  const test = PNG.sync.read(fs.readFileSync(testFile));
  const size: Size = {
    width: Math.max(reference.width, test.width),
    height: Math.max(reference.height, test.height),
  };
  const sizeChanged = reference.width !== test.width || reference.height !== test.height;

  const diff = new PNG(size);
  const diffPixels = pixelmatch(
    pad(reference, size),
    pad(test, size),
    diff.data,
    size.width,
    size.height,
    { threshold: options.threshold, diffColor: DIFF_COLOR, alpha: 0.2 },
  );
  const diffPercent = round((diffPixels / (size.width * size.height)) * 100);
  fs.writeFileSync(diffFile, PNG.sync.write(diff));

  return {
    ...item,
    status: sizeChanged || diffPercent > options.maxDiffPercent ? "failed" : "passed",
    diff: diffFile,
    diffPixels,
    diffPercent,
    size,
    sizeChanged,
    boxes: diffPixels > 0 ? findBoxes(diff, DIFF_COLOR) : [],
  };
}

/** Read width/height from the PNG IHDR chunk without decoding the image. */
export function pngSize(file: string): Size {
  const header = Buffer.alloc(24);
  const fd = fs.openSync(file, "r");
  try {
    fs.readSync(fd, header, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

/** Copy the image onto a transparent canvas of `size` (no-op when it already fits). */
function pad(image: PNG, size: Size): Buffer {
  if (image.width === size.width && image.height === size.height) return image.data;
  const out = new PNG(size);
  PNG.bitblt(image, out, 0, 0, image.width, image.height, 0, 0);
  return out.data;
}

/**
 * Group diff pixels into coarse rectangles: mark every CELL×CELL cell that contains a
 * diff pixel, then merge 8-connected cells. Returns the largest boxes first.
 */
export function findBoxes(diff: PNG, color: readonly [number, number, number]): Box[] {
  const cols = Math.ceil(diff.width / CELL);
  const rows = Math.ceil(diff.height / CELL);
  const marked = new Uint8Array(cols * rows);

  for (let y = 0; y < diff.height; y++) {
    for (let x = 0; x < diff.width; x++) {
      const i = (y * diff.width + x) * 4;
      if (
        diff.data[i] === color[0] &&
        diff.data[i + 1] === color[1] &&
        diff.data[i + 2] === color[2]
      ) {
        marked[Math.floor(y / CELL) * cols + Math.floor(x / CELL)] = 1;
      }
    }
  }

  const boxes: Box[] = [];
  const stack: number[] = [];
  for (let start = 0; start < marked.length; start++) {
    if (marked[start] !== 1) continue;
    marked[start] = 2;
    stack.push(start);
    let minX = cols;
    let minY = rows;
    let maxX = 0;
    let maxY = 0;
    while (stack.length > 0) {
      const cell = stack.pop() as number;
      const cx = cell % cols;
      const cy = Math.floor(cell / cols);
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx);
      maxY = Math.max(maxY, cy);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const neighbour = ny * cols + nx;
          if (marked[neighbour] === 1) {
            marked[neighbour] = 2;
            stack.push(neighbour);
          }
        }
      }
    }
    const x = minX * CELL;
    const y = minY * CELL;
    boxes.push({
      x,
      y,
      width: Math.min((maxX + 1) * CELL, diff.width) - x,
      height: Math.min((maxY + 1) * CELL, diff.height) - y,
    });
  }

  return boxes.toSorted((a, b) => b.width * b.height - a.width * a.height).slice(0, MAX_BOXES);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
