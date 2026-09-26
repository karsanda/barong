import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { summarize, type ReportData, type ResultItem } from "./types.ts";

/** Built report UI; `src/` and `dist/` both sit one level below the package root. */
export const REPORT_ASSETS = fileURLToPath(new URL("../report/dist", import.meta.url));

export interface WriteReportOptions {
  reportDir: string;
  items: ResultItem[];
  config: string;
  threshold: number;
  maxDiffPercent: number;
}

export function writeReport(options: WriteReportOptions): string {
  const { reportDir } = options;
  const index = path.join(REPORT_ASSETS, "index.html");
  if (!fs.existsSync(index)) {
    throw new Error(`Report UI is not built (missing ${index}). Run \`pnpm build\`.`);
  }

  fs.rmSync(reportDir, { recursive: true, force: true });
  fs.cpSync(REPORT_ASSETS, reportDir, { recursive: true });

  const version = Date.now();
  const toUrl = (file: string | undefined) =>
    file && `${path.relative(reportDir, file).split(path.sep).join("/")}?v=${version}`;

  const items = options.items.map((item) => ({
    ...item,
    reference: toUrl(item.reference),
    test: toUrl(item.test),
    diff: toUrl(item.diff),
  }));

  const data: ReportData = {
    generatedAt: new Date().toISOString(),
    config: options.config,
    threshold: options.threshold,
    maxDiffPercent: options.maxDiffPercent,
    summary: summarize(items),
    items,
  };

  // A classic script (not fetch) so the report also works when opened from file://.
  const json = JSON.stringify(data).replaceAll("<", "\\u003c");
  fs.writeFileSync(path.join(reportDir, "data.js"), `window.__BARONG__ = ${json};\n`);
  return path.join(reportDir, "index.html");
}

export async function openReport(indexFile: string): Promise<void> {
  const { default: open } = await import("open");
  await open(pathToFileURL(indexFile).href);
}
