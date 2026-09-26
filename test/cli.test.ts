import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { REPORT_ASSETS } from "../src/report.ts";
import { FIXTURE_PAGE, tempDir, writeJSON } from "./helpers.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(ROOT, "src", "cli.ts");

function barong(cwd: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  return { code: result.status, output: result.stdout + result.stderr };
}

describe("barong CLI", () => {
  let dir: string;
  let page: string;

  beforeAll(() => {
    if (!fs.existsSync(path.join(REPORT_ASSETS, "index.html"))) {
      execFileSync("pnpm", ["exec", "vite", "build", "report"], { cwd: ROOT, stdio: "ignore" });
    }
    dir = tempDir();
    page = path.join(dir, "page.html");
    fs.copyFileSync(FIXTURE_PAGE, page);
    writeJSON(path.join(dir, "barong.json"), { viewport: { width: 400, height: 300 } });
    writeJSON(path.join(dir, "scenarios", "page.json"), {
      label: "Page",
      url: pathToFileURL(page).href,
      captures: [
        { label: "Box", selector: "#box" },
        { label: "Top", clip: { x: 0, y: 0, width: 300, height: 200 } },
      ],
    });
  });

  it("init scaffolds a config and refuses to overwrite it", () => {
    const empty = tempDir();
    const first = barong(empty, "init");
    expect(first.code).toBe(0);
    expect(fs.existsSync(path.join(empty, "barong.json"))).toBe(true);
    expect(fs.readdirSync(path.join(empty, "scenarios")).length).toBeGreaterThan(0);

    const second = barong(empty, "init");
    expect(second.code).toBe(2);
    expect(second.output).toMatch(/already exists/);
  });

  it("exits with 2 and a readable message when the config is missing", () => {
    const result = barong(tempDir(), "test", "--no-open");
    expect(result.code).toBe(2);
    expect(result.output).toMatch(/Config file not found/);
  });

  it("runs reference → test → approve → test", () => {
    const reference = barong(dir, "reference");
    expect(reference.output).toMatch(/Saved 2 reference image\(s\)/);
    expect(reference.code).toBe(0);

    const unchanged = barong(dir, "test", "--no-open");
    expect(unchanged.output).toMatch(/2 passed/);
    expect(unchanged.code).toBe(0);

    // Make the box wider: both captures change.
    fs.writeFileSync(page, fs.readFileSync(page, "utf8").replace("width: 200px", "width: 260px"));
    const changed = barong(dir, "test", "--no-open");
    expect(changed.code).toBe(1);
    expect(changed.output).toMatch(/failed\s+Page › Box .*size changed/);
    expect(changed.output).toMatch(/2 failed/);

    const out = path.join(dir, "barong");
    expect(fs.existsSync(path.join(out, "diff", "page__top.png"))).toBe(true);
    const data = fs.readFileSync(path.join(out, "report", "data.js"), "utf8");
    expect(data).toMatch(/^window\.__BARONG__ = /);
    const report = JSON.parse(data.replace(/^window\.__BARONG__ = /, "").replace(/;\s*$/, ""));
    expect(report.summary).toMatchObject({ failed: 2, passed: 0 });
    expect(report.items[0].reference).toMatch(/^\.\.\/reference\/page__\w+\.png\?v=\d+$/);

    const approve = barong(dir, "approve", "--filter", "box");
    expect(approve.output).toMatch(/Approved 1 image/);

    const partly = barong(dir, "compare", "--no-open");
    expect(partly.code).toBe(1);
    expect(partly.output).toMatch(/1 failed · 1 passed/);

    barong(dir, "approve");
    const approved = barong(dir, "test", "--no-open");
    expect(approved.code).toBe(0);
  });
});
