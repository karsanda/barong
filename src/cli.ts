#!/usr/bin/env node
import { Command, InvalidArgumentError, Option } from "commander";
import pc from "picocolors";
import pkg from "../package.json" with { type: "json" };
import {
  approveCommand,
  compareCommand,
  referenceCommand,
  reportCommand,
  testCommand,
  type CommandOptions,
} from "./commands.ts";
import { init } from "./init.ts";

const program = new Command("barong")
  .description("Visual regression testing for web pages")
  .version(pkg.version);

const configArg = "[config]";
const configHelp =
  'config name, optionally with a scenario glob: "barong", "barong:home", "site:mobile-*"';

function positiveInt(value: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1) throw new InvalidArgumentError("Must be a positive integer.");
  return n;
}

const filterOption = () =>
  new Option("-f, --filter <text>", "only captures whose name/label contains <text>");
const concurrencyOption = () =>
  new Option("-c, --concurrency <n>", "parallel captures (overrides config)").argParser(
    positiveInt,
  );
const headedOption = () => new Option("--headed", "show the browser while capturing");

type Flags = Omit<CommandOptions, "cwd" | "config">;

function run(command: (options: CommandOptions) => Promise<number>) {
  return async (config: string | undefined, flags: Flags) => {
    try {
      process.exitCode = await command({ ...flags, config, cwd: process.cwd() });
    } catch (error) {
      console.error(pc.red((error as Error).message));
      process.exitCode = 2;
    }
  };
}

program
  .command("init")
  .description("create a sample barong.json and scenarios/")
  .option("--force", "overwrite existing files")
  .action((flags: { force?: boolean }) => {
    try {
      const files = init(process.cwd(), flags);
      console.log(pc.green("Created:"));
      for (const file of files) console.log(`  ${file}`);
      console.log(`\nNext: ${pc.bold("barong reference")} to capture the reference images.`);
    } catch (error) {
      console.error(pc.red((error as Error).message));
      process.exitCode = 2;
    }
  });

program
  .command("reference")
  .alias("ref")
  .description("capture reference (baseline) images")
  .argument(configArg, configHelp)
  .addOption(filterOption())
  .addOption(concurrencyOption())
  .addOption(headedOption())
  .action(run(referenceCommand));

program
  .command("test")
  .description("capture test images, compare them with the references and open the report")
  .argument(configArg, configHelp)
  .addOption(filterOption())
  .addOption(concurrencyOption())
  .addOption(headedOption())
  .option("--no-open", "do not open the report in a browser")
  .action(run(testCommand));

program
  .command("compare")
  .description("compare existing test images with the references (no capturing)")
  .argument(configArg, configHelp)
  .addOption(filterOption())
  .option("--no-open", "do not open the report in a browser")
  .action(run(compareCommand));

program
  .command("approve")
  .description("accept test images as the new references")
  .argument(configArg, configHelp)
  .addOption(filterOption())
  .action(run(approveCommand));

program
  .command("report")
  .description("open the last report")
  .argument(configArg, configHelp)
  .action(run(reportCommand));

await program.parseAsync();
