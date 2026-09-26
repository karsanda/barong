import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { captureAll, type CaptureResult } from "./capture.ts";
import { compareAll, type CompareTarget } from "./compare.ts";
import { filterCaptures, loadConfig, outputDirs, type ResolvedConfig } from "./config.ts";
import { openReport, writeReport } from "./report.ts";
import { STATUSES, summarize, type ResultItem, type Status } from "./types.ts";

export interface CommandOptions {
  cwd: string;
  config?: string;
  filter?: string;
  concurrency?: number;
  headed?: boolean;
  /** Open the report in a browser (default true). */
  open?: boolean;
  log?: (line: string) => void;
}

const STATUS_COLOR: Record<Status, (s: string) => string> = {
  passed: pc.green,
  failed: pc.red,
  error: pc.red,
  new: pc.cyan,
  missing: pc.yellow,
};

function setup(options: CommandOptions) {
  const config = loadConfig(options.cwd, options.config);
  const captures = filterCaptures(config.captures, options.filter);
  if (captures.length === 0) throw new Error(`No captures match filter "${options.filter}"`);
  return { config, captures, dirs: outputDirs(config), log: options.log ?? console.log };
}

async function runCaptures(
  config: ResolvedConfig,
  captures: ResolvedConfig["captures"],
  outDir: string,
  options: CommandOptions,
  log: (line: string) => void,
): Promise<CaptureResult[]> {
  log(
    pc.dim(
      `Capturing ${captures.length} screenshot(s) into ${path.relative(options.cwd, outDir)}/`,
    ),
  );
  return captureAll(captures, {
    outDir,
    concurrency: options.concurrency ?? config.concurrency,
    timeout: config.timeout,
    headed: options.headed,
    onResult: (r) => {
      const title = `${r.capture.scenario} ${pc.dim("›")} ${r.capture.label}`;
      const time = pc.dim(`(${(r.durationMs / 1000).toFixed(1)}s)`);
      log(
        r.error
          ? `  ${pc.red("✗")} ${title} ${time}\n    ${pc.red(r.error)}`
          : `  ${pc.green("✓")} ${title} ${time}`,
      );
    },
  });
}

export async function referenceCommand(options: CommandOptions): Promise<number> {
  const { config, captures, dirs, log } = setup(options);
  const results = await runCaptures(config, captures, dirs.reference, options, log);
  const failed = results.filter((r) => r.error).length;
  log(
    failed
      ? pc.red(`\n${failed} capture(s) failed.`)
      : pc.green(`\nSaved ${results.length} reference image(s).`),
  );
  return failed ? 1 : 0;
}

export async function testCommand(options: CommandOptions): Promise<number> {
  const { config, captures, dirs, log } = setup(options);
  const results = await runCaptures(config, captures, dirs.test, options, log);
  const targets: CompareTarget[] = results.map((r) => ({
    name: r.name,
    scenario: r.capture.scenario,
    label: r.capture.label,
    url: r.capture.url,
    error: r.error,
  }));
  return finish(config, compareTargets(config, targets), options, log);
}

export async function compareCommand(options: CommandOptions): Promise<number> {
  const { config, captures, log } = setup(options);
  const targets = captures.map((c) => ({
    name: c.name,
    scenario: c.scenario,
    label: c.label,
    url: c.url,
  }));
  return finish(config, compareTargets(config, targets), options, log);
}

function compareTargets(config: ResolvedConfig, targets: CompareTarget[]): ResultItem[] {
  const dirs = outputDirs(config);
  return compareAll(targets, {
    referenceDir: dirs.reference,
    testDir: dirs.test,
    diffDir: dirs.diff,
    threshold: config.threshold,
    maxDiffPercent: config.maxDiffPercent,
  });
}

async function finish(
  config: ResolvedConfig,
  items: ResultItem[],
  options: CommandOptions,
  log: (line: string) => void,
): Promise<number> {
  log("");
  for (const item of items) {
    if (item.status === "passed") continue;
    const detail =
      item.status === "failed"
        ? `${item.diffPercent}% different${item.sizeChanged ? ", size changed" : ""}`
        : item.status === "new"
          ? "no reference image yet"
          : item.status === "missing"
            ? "no test image"
            : (item.error ?? "");
    log(
      `  ${STATUS_COLOR[item.status](item.status.padEnd(7))} ${item.scenario} ${pc.dim("›")} ${item.label} ${pc.dim(detail)}`,
    );
  }

  const summary = summarize(items);
  log(
    `\n${STATUSES.filter((s) => summary[s] > 0)
      .map((s) => STATUS_COLOR[s](`${summary[s]} ${s}`))
      .join(pc.dim(" · "))}`,
  );

  const dirs = outputDirs(config);
  const index = writeReport({
    reportDir: dirs.report,
    items,
    config: path.relative(options.cwd, config.configFile),
    threshold: config.threshold,
    maxDiffPercent: config.maxDiffPercent,
  });
  log(pc.dim(`Report: ${index}`));
  if (options.open !== false) await openReport(index);

  const ok = summary.passed === items.length;
  if (!ok)
    log(
      pc.dim(`Accept changes with ${pc.bold("barong approve")} (use --filter to pick captures).`),
    );
  return ok ? 0 : 1;
}

export async function approveCommand(options: CommandOptions): Promise<number> {
  const { captures, dirs, log } = setup(options);
  fs.mkdirSync(dirs.reference, { recursive: true });
  let approved = 0;
  for (const capture of captures) {
    const test = path.join(dirs.test, `${capture.name}.png`);
    if (!fs.existsSync(test)) continue;
    fs.copyFileSync(test, path.join(dirs.reference, `${capture.name}.png`));
    log(`  ${pc.green("✓")} ${capture.scenario} ${pc.dim("›")} ${capture.label}`);
    approved++;
  }
  log(
    approved
      ? pc.green(`\nApproved ${approved} image(s).`)
      : pc.yellow("Nothing to approve: no test images found."),
  );
  return 0;
}

export async function reportCommand(options: CommandOptions): Promise<number> {
  const config = loadConfig(options.cwd, options.config);
  const index = path.join(outputDirs(config).report, "index.html");
  if (!fs.existsSync(index)) throw new Error("No report yet. Run `barong test` first.");
  await openReport(index);
  return 0;
}
