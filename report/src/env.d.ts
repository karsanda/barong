import type { ReportData } from "../../src/types.ts";

declare global {
  interface Window {
    __BARONG__?: ReportData;
  }
}
