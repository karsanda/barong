import { useState } from "react";
import type { ResultItem, Zoom } from "../lib.ts";
import styles from "./modes.module.css";
import { Layer, Stage, Tag } from "./Stage.tsx";

/** Test image faded over the reference. */
export function Onion({ item, zoom }: { item: ResultItem; zoom: Zoom }) {
  const [opacity, setOpacity] = useState(50);
  const size = item.size;
  if (!size || !item.reference || !item.test) return null;

  return (
    <>
      <div className={styles.controls}>
        <label>
          Reference
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            aria-label="Test image opacity"
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
          Test
        </label>
      </div>
      <Stage size={size} zoom={zoom}>
        <Layer src={item.reference} size={item.referenceSize} canvas={size} alt="Reference" />
        <Layer
          src={item.test}
          size={item.testSize}
          canvas={size}
          alt="Test"
          style={{ opacity: opacity / 100 }}
        />
        <Tag>Reference</Tag>
        <Tag side="right">Test {opacity}%</Tag>
      </Stage>
    </>
  );
}
