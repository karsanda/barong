import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PNG } from "pngjs";

export const FIXTURE_PAGE = path.join(import.meta.dirname, "fixtures", "page.html");
export const FIXTURE_URL = pathToFileURL(FIXTURE_PAGE).href;

export function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "barong-test-"));
}

export function writeJSON(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/** A solid-color PNG, optionally with a rectangle painted in another color. */
export function solidPng(
  width: number,
  height: number,
  color: [number, number, number],
  rect?: { x: number; y: number; width: number; height: number; color: [number, number, number] },
): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside =
        rect && x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
      const [r, g, b] = inside ? rect.color : color;
      const i = (y * width + x) * 4;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

export function readPng(file: string): PNG {
  return PNG.sync.read(fs.readFileSync(file));
}

export function pixel(png: PNG, x: number, y: number): [number, number, number] {
  const i = (y * png.width + x) * 4;
  return [png.data[i] ?? 0, png.data[i + 1] ?? 0, png.data[i + 2] ?? 0];
}
