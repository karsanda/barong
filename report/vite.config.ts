import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Inline the bundled JS and CSS into index.html. Browsers refuse to load
 * `<script type="module" src>` from file://, and the report is opened from disk.
 */
function inlineAssets(): Plugin {
  return {
    name: "barong:inline-assets",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const html = bundle["index.html"];
      if (!html || html.type !== "asset") return;
      let source = String(html.source);
      for (const [fileName, output] of Object.entries(bundle)) {
        const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (output.type === "chunk") {
          const code = output.code.replaceAll("</script", "<\\/script");
          source = source.replace(
            new RegExp(`<script type="module"[^>]*src="\\./${escaped}"[^>]*></script>`),
            () => `<script type="module">${code}</script>`,
          );
        } else if (fileName.endsWith(".css")) {
          source = source.replace(
            new RegExp(`<link rel="stylesheet"[^>]*href="\\./${escaped}"[^>]*>`),
            () => `<style>${String(output.source)}</style>`,
          );
        } else continue;
        delete bundle[fileName];
      }
      html.source = source;
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  base: "./",
  plugins: [react(), inlineAssets()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    assetsInlineLimit: Number.POSITIVE_INFINITY,
  },
});
