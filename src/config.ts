import fs from "node:fs";
import path from "node:path";
import slugify from "@sindresorhus/slugify";
import { globSync } from "tinyglobby";
import { z } from "zod";

const Viewport = z.strictObject({
  width: z.int().positive(),
  height: z.int().positive(),
});

const Selector = z.string().min(1);

const Action = z.union([
  z.strictObject({ click: Selector }),
  z.strictObject({ hover: Selector }),
  z.strictObject({ fill: Selector, value: z.string() }),
  z.strictObject({ press: z.string().min(1), selector: Selector.optional() }),
  z.strictObject({ scroll: Selector }),
  z.strictObject({ waitFor: Selector }),
  z.strictObject({ wait: z.int().nonnegative() }),
]);

const Capture = z
  .strictObject({
    label: z.string().min(1),
    selector: Selector.optional().describe("Capture the first element matching this CSS selector"),
    clip: z
      .strictObject({
        x: z.number().nonnegative(),
        y: z.number().nonnegative(),
        width: z.number().positive(),
        height: z.number().positive(),
      })
      .optional()
      .describe("Capture a fixed region of the page"),
    fullPage: z.boolean().optional().describe("Capture the full scrollable page"),
    actions: z.array(Action).default([]).describe("Interactions to run before capturing"),
    hide: z.array(Selector).default([]).describe("Elements to make invisible"),
    mask: z.array(Selector).default([]).describe("Elements to cover with a solid box"),
  })
  .refine((c) => [c.selector, c.clip, c.fullPage].filter(Boolean).length <= 1, {
    message: "Use only one of `selector`, `clip` or `fullPage`",
  });

export const ScenarioSchema = z.strictObject({
  $schema: z.string().optional(),
  label: z.string().min(1),
  url: z.string().min(1),
  viewport: Viewport.optional(),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
  captures: z.array(Capture).min(1),
});

export const BaseConfigSchema = z.strictObject({
  $schema: z.string().optional(),
  scenariosDir: z.string().default("scenarios"),
  outputDir: z.string().default("barong"),
  viewport: Viewport.default({ width: 1400, height: 900 }),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).default("load"),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe("Per-pixel color distance tolerance (0 = exact)"),
  maxDiffPercent: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("A capture fails when more than this percentage of pixels differ"),
  concurrency: z.int().positive().default(4),
  timeout: z.int().positive().default(30_000),
});

export type Action = z.infer<typeof Action>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type BaseConfig = z.infer<typeof BaseConfigSchema>;

export interface ResolvedCapture extends z.infer<typeof Capture> {
  name: string;
  scenario: string;
  url: string;
  viewport: z.infer<typeof Viewport>;
  waitUntil: BaseConfig["waitUntil"];
}

export interface ResolvedConfig extends BaseConfig {
  configFile: string;
  /** Absolute. */
  outputDir: string;
  captures: ResolvedCapture[];
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

export function generateName(scenarioLabel: string, captureLabel: string): string {
  return `${slugify(scenarioLabel)}__${slugify(captureLabel)}`;
}

/** `"barong"` → base `barong.json`, all scenarios; `"barong:home"` → only `home.json`. */
export function parseConfigSpec(spec = "barong"): { base: string; scenarios: string } {
  const [base = "barong", scenarios = "*"] = spec.split(":");
  return { base: base || "barong", scenarios: scenarios || "*" };
}

function readJSON(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new ConfigError(`Cannot read ${file}: ${(error as Error).message}`);
  }
}

function parse<T extends z.ZodType>(schema: T, file: string): z.output<T> {
  const result = schema.safeParse(readJSON(file));
  if (!result.success) {
    throw new ConfigError(`Invalid config in ${file}\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadConfig(cwd: string, spec?: string): ResolvedConfig {
  const { base, scenarios } = parseConfigSpec(spec);
  const configFile = path.resolve(cwd, base.endsWith(".json") ? base : `${base}.json`);
  if (!fs.existsSync(configFile)) {
    throw new ConfigError(
      `Config file not found: ${configFile}\nRun \`barong init\` to create one.`,
    );
  }

  const config = parse(BaseConfigSchema, configFile);
  const root = path.dirname(configFile);
  const scenariosDir = path.resolve(root, config.scenariosDir);
  const files = globSync(`${scenarios}.json`, { cwd: scenariosDir, absolute: true }).toSorted();
  if (files.length === 0) {
    throw new ConfigError(`No scenario files matching "${scenarios}.json" in ${scenariosDir}`);
  }

  const captures: ResolvedCapture[] = [];
  const seen = new Map<string, string>();
  for (const file of files) {
    const scenario = parse(ScenarioSchema, file);
    for (const capture of scenario.captures) {
      const name = generateName(scenario.label, capture.label);
      const previous = seen.get(name);
      if (previous) {
        throw new ConfigError(
          `Duplicate capture "${scenario.label} / ${capture.label}" in ${file} (already defined in ${previous})`,
        );
      }
      seen.set(name, file);
      captures.push({
        ...capture,
        name,
        scenario: scenario.label,
        url: scenario.url,
        viewport: scenario.viewport ?? config.viewport,
        waitUntil: scenario.waitUntil ?? config.waitUntil,
      });
    }
  }

  return { ...config, configFile, outputDir: path.resolve(root, config.outputDir), captures };
}

/** Case-insensitive substring match against the output name and labels. */
export function filterCaptures(
  captures: ResolvedCapture[],
  pattern: string | undefined,
): ResolvedCapture[] {
  if (!pattern) return captures;
  const needle = pattern.toLowerCase();
  return captures.filter((c) =>
    [c.name, c.scenario, c.label, `${c.scenario} ${c.label}`].some((s) =>
      s.toLowerCase().includes(needle),
    ),
  );
}

export function outputDirs(config: Pick<ResolvedConfig, "outputDir">) {
  return {
    reference: path.join(config.outputDir, "reference"),
    test: path.join(config.outputDir, "test"),
    diff: path.join(config.outputDir, "diff"),
    report: path.join(config.outputDir, "report"),
  };
}
