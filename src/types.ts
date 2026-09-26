// Shared between the CLI and the report UI (report/src imports this file).

export type Status = "passed" | "failed" | "new" | "missing" | "error";

export const STATUSES: readonly Status[] = ["failed", "error", "new", "missing", "passed"];

export interface Size {
  width: number;
  height: number;
}

export interface Box extends Size {
  x: number;
  y: number;
}

export interface ResultItem {
  /** File name without extension: `<scenario-slug>__<capture-slug>`. */
  name: string;
  scenario: string;
  label: string;
  url?: string;
  status: Status;
  /** Paths relative to the report's index.html. */
  reference?: string;
  test?: string;
  diff?: string;
  diffPixels?: number;
  diffPercent?: number;
  /** Size of the compared canvas (max of both images). */
  size?: Size;
  referenceSize?: Size;
  testSize?: Size;
  sizeChanged?: boolean;
  /** Changed regions in canvas pixel coordinates. */
  boxes?: Box[];
  error?: string;
}

export type Summary = Record<Status, number>;

export interface ReportData {
  generatedAt: string;
  config: string;
  threshold: number;
  maxDiffPercent: number;
  summary: Summary;
  items: ResultItem[];
}

export function summarize(items: readonly ResultItem[]): Summary {
  const summary: Summary = { passed: 0, failed: 0, new: 0, missing: 0, error: 0 };
  for (const item of items) summary[item.status]++;
  return summary;
}
