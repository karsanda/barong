import { useEffect, useState } from "react";
import type { ResultItem, Status } from "../../src/types.ts";

export type { ReportData, ResultItem, Status, Box, Size } from "../../src/types.ts";
export { STATUSES } from "../../src/types.ts";

export type Filter = Status | "all";

export type Mode = "side" | "diff" | "swipe" | "onion" | "toggle";

export const MODES: { id: Mode; label: string }[] = [
  { id: "side", label: "Side by side" },
  { id: "diff", label: "Diff" },
  { id: "swipe", label: "Swipe" },
  { id: "onion", label: "Onion skin" },
  { id: "toggle", label: "Toggle" },
];

/** `"fit"` scales down to the available width; numbers are a zoom factor. */
export type Zoom = "fit" | 1 | 2;

export const ZOOMS: { id: Zoom; label: string }[] = [
  { id: "fit", label: "Fit" },
  { id: 1, label: "100%" },
  { id: 2, label: "200%" },
];

export function filterItems(items: ResultItem[], filter: Filter, query: string): ResultItem[] {
  const needle = query.trim().toLowerCase();
  return items.filter(
    (item) =>
      (filter === "all" || item.status === filter) &&
      (!needle || `${item.scenario} ${item.label} ${item.name}`.toLowerCase().includes(needle)),
  );
}

/** Failing items first, then by scenario/label, so problems are what you see first. */
export function sortItems(items: ResultItem[]): ResultItem[] {
  const rank: Record<Status, number> = { failed: 0, error: 1, new: 2, missing: 3, passed: 4 };
  return items.toSorted(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.scenario.localeCompare(b.scenario) ||
      a.label.localeCompare(b.label),
  );
}

export function isComparable(item: ResultItem): boolean {
  return Boolean(item.reference && item.test && item.diff && item.size);
}

/** State persisted in localStorage; storage failures (private mode etc.) are ignored. */
export function useStoredState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(`barong:${key}`);
      return stored === null ? initial : (JSON.parse(stored) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`barong:${key}`, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);
  return [value, setValue];
}

export function isTyping(event: KeyboardEvent): boolean {
  const target = event.target;
  return (
    target instanceof Element &&
    target.closest(
      "input:not([type=range], [type=checkbox]), textarea, select, [contenteditable]",
    ) !== null
  );
}
