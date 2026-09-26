// Generates JSON Schemas from the zod config schemas for editor autocomplete.
import fs from "node:fs";
import { z } from "zod";
import { BaseConfigSchema, ScenarioSchema } from "../src/config.ts";

const outDir = new URL("../schema/", import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

for (const [file, schema] of [
  ["barong.schema.json", BaseConfigSchema],
  ["scenario.schema.json", ScenarioSchema],
] as const) {
  const json = z.toJSONSchema(schema, { io: "input" });
  fs.writeFileSync(new URL(file, outDir), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`schema/${file}`);
}
