import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include: ["test/**/*.test.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
      {
        plugins: [react()],
        test: {
          name: "report",
          include: ["report/src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["report/src/test-setup.ts"],
        },
      },
    ],
  },
});
