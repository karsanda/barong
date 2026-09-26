import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TEMPLATE_DIR = fileURLToPath(new URL("../templates/init", import.meta.url));

/** Copy the sample config into `cwd`. Returns the created files, relative to `cwd`. */
export function init(cwd: string, { force = false } = {}): string[] {
  const target = path.join(cwd, "barong.json");
  if (!force && fs.existsSync(target)) {
    throw new Error(`${target} already exists (use --force to overwrite)`);
  }
  fs.cpSync(TEMPLATE_DIR, cwd, { recursive: true, force });
  return fs
    .readdirSync(TEMPLATE_DIR, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".json"))
    .toSorted();
}
