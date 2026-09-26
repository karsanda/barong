import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ConfigError,
  filterCaptures,
  generateName,
  loadConfig,
  parseConfigSpec,
} from "../src/config.ts";
import { tempDir, writeJSON } from "./helpers.ts";

function project(scenarios: Record<string, unknown>, base: Record<string, unknown> = {}) {
  const dir = tempDir();
  writeJSON(path.join(dir, "barong.json"), base);
  for (const [name, scenario] of Object.entries(scenarios)) {
    writeJSON(path.join(dir, "scenarios", `${name}.json`), scenario);
  }
  return dir;
}

const home = {
  label: "Home",
  url: "https://example.com",
  captures: [{ label: "Hover on News nav", selector: ".nav" }],
};

describe("generateName", () => {
  it("slugifies scenario and capture labels", () => {
    expect(generateName("Home", "hover on News nav")).toBe("home__hover-on-news-nav");
    expect(generateName("Liputan6 Mobile", "Tags & Topics")).toBe(
      "liputan6-mobile__tags-and-topics",
    );
  });
});

describe("parseConfigSpec", () => {
  it("defaults to barong with every scenario", () => {
    expect(parseConfigSpec()).toEqual({ base: "barong", scenarios: "*" });
    expect(parseConfigSpec("site")).toEqual({ base: "site", scenarios: "*" });
  });

  it("splits a scenario glob after the colon", () => {
    expect(parseConfigSpec("site:home")).toEqual({ base: "site", scenarios: "home" });
    expect(parseConfigSpec("site:mobile-*")).toEqual({ base: "site", scenarios: "mobile-*" });
  });
});

describe("loadConfig", () => {
  it("applies defaults and resolves captures", () => {
    const dir = project({ home });
    const config = loadConfig(dir);

    expect(config.outputDir).toBe(path.join(dir, "barong"));
    expect(config.threshold).toBe(0.1);
    expect(config.maxDiffPercent).toBe(0);
    expect(config.captures).toEqual([
      expect.objectContaining({
        name: "home__hover-on-news-nav",
        scenario: "Home",
        url: "https://example.com",
        viewport: { width: 1400, height: 900 },
        waitUntil: "load",
        actions: [],
        hide: [],
        mask: [],
      }),
    ]);
  });

  it("lets a scenario override the viewport", () => {
    const dir = project({ home: { ...home, viewport: { width: 375, height: 667 } } });
    expect(loadConfig(dir).captures[0]?.viewport).toEqual({ width: 375, height: 667 });
  });

  it("selects scenario files with the name:glob syntax", () => {
    const dir = project({
      home,
      about: { ...home, label: "About" },
    });
    expect(loadConfig(dir).captures.map((c) => c.scenario)).toEqual(["About", "Home"]);
    expect(loadConfig(dir, "barong:home").captures.map((c) => c.scenario)).toEqual(["Home"]);
  });

  it("throws when the config file does not exist", () => {
    expect(() => loadConfig(tempDir())).toThrow(/Config file not found/);
  });

  it("throws when no scenario matches", () => {
    const dir = project({ home });
    expect(() => loadConfig(dir, "barong:nope")).toThrow(/No scenario files matching "nope.json"/);
  });

  it("reports schema errors with the file name", () => {
    const dir = project({ home: { label: "Home", captures: [] } });
    const error = captureError(() => loadConfig(dir));
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain(path.join(dir, "scenarios", "home.json"));
    expect(error.message).toMatch(/url/);
  });

  it("rejects unknown keys (catches typos like the old before_capture)", () => {
    const dir = project({
      home: { ...home, captures: [{ label: "x", before_capture: { action: "click" } }] },
    });
    expect(() => loadConfig(dir)).toThrow(/before_capture/);
  });

  it("allows only one of selector, clip and fullPage", () => {
    const dir = project({
      home: { ...home, captures: [{ label: "x", selector: "a", fullPage: true }] },
    });
    expect(() => loadConfig(dir)).toThrow(/only one of/);
  });

  it("throws on duplicate capture names across files", () => {
    const dir = project({ a: home, b: home });
    expect(() => loadConfig(dir)).toThrow(/Duplicate capture "Home \/ Hover on News nav"/);
  });
});

describe("filterCaptures", () => {
  const captures = loadConfig(
    project({
      home: {
        ...home,
        captures: [
          { label: "Navbar", selector: "nav" },
          { label: "Footer", selector: "footer" },
        ],
      },
    }),
  ).captures;

  it("returns everything without a pattern", () => {
    expect(filterCaptures(captures, undefined)).toHaveLength(2);
  });

  it("matches names and labels case-insensitively", () => {
    expect(filterCaptures(captures, "NAV").map((c) => c.label)).toEqual(["Navbar"]);
    expect(filterCaptures(captures, "home__footer").map((c) => c.label)).toEqual(["Footer"]);
    expect(filterCaptures(captures, "home footer").map((c) => c.label)).toEqual(["Footer"]);
  });
});

function captureError(fn: () => unknown): Error {
  try {
    fn();
  } catch (error) {
    return error as Error;
  }
  throw new Error("Expected function to throw");
}
