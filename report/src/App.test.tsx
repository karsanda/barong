import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.tsx";
import type { ReportData } from "./lib.ts";

const data: ReportData = {
  generatedAt: "2026-09-26T10:00:00.000Z",
  config: "barong.json",
  threshold: 0.1,
  maxDiffPercent: 0,
  summary: { passed: 1, failed: 1, new: 1, missing: 0, error: 0 },
  items: [
    {
      name: "home__footer",
      scenario: "Home",
      label: "Footer",
      status: "passed",
      reference: "../reference/home__footer.png",
      test: "../test/home__footer.png",
      diff: "../diff/home__footer.png",
      diffPixels: 0,
      diffPercent: 0,
      size: { width: 100, height: 50 },
      boxes: [],
    },
    {
      name: "home__navbar",
      scenario: "Home",
      label: "Navbar",
      status: "failed",
      reference: "../reference/home__navbar.png",
      test: "../test/home__navbar.png",
      diff: "../diff/home__navbar.png",
      diffPixels: 120,
      diffPercent: 2.4,
      size: { width: 100, height: 50 },
      boxes: [{ x: 0, y: 0, width: 32, height: 16 }],
    },
    {
      name: "about__hero",
      scenario: "About",
      label: "Hero",
      status: "new",
      test: "../test/about__hero.png",
      testSize: { width: 100, height: 50 },
    },
  ],
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  location.hash = "";
});

describe("App", () => {
  it("shows an empty state without data", () => {
    render(<App data={undefined} />);
    expect(screen.getByText("No report data")).toBeTruthy();
  });

  it("selects the first failure and offers the approve command", () => {
    render(<App data={data} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Navbar");
    expect(screen.getByText('barong approve --filter "home__navbar"')).toBeTruthy();
    expect(screen.getByText(/2\.4% different/)).toBeTruthy();
  });

  it("switches view modes with buttons and number keys", () => {
    render(<App data={data} />);
    const modes = screen.getByRole("group", { name: "View mode" });
    const pressed = () => modes.querySelector('[aria-pressed="true"]')?.textContent;

    expect(pressed()).toBe("Side by side");
    fireEvent.click(screen.getByRole("button", { name: "Swipe" }));
    expect(pressed()).toBe("Swipe");
    expect(screen.getByLabelText("Divider position")).toBeTruthy();

    fireEvent.keyDown(window, { key: "4" });
    expect(pressed()).toBe("Onion skin");
    expect(screen.getByLabelText("Test image opacity")).toBeTruthy();

    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByText("Outline changed regions (1)")).toBeTruthy();
  });

  it("navigates with arrow keys and filters by status", () => {
    render(<App data={data} />);
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Hero");
    expect(screen.getByText(/no reference to compare with/)).toBeTruthy();

    const filters = screen.getByRole("navigation", { name: "Filter by status" });
    fireEvent.click(within(filters).getByRole("button", { name: /passed/ }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Footer");
    expect(screen.queryByText('barong approve --filter "home__footer"')).toBeNull();
  });
});
