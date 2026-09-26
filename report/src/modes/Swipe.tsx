import { useState, type PointerEvent } from "react";
import type { ResultItem, Zoom } from "../lib.ts";
import styles from "./modes.module.css";
import { Layer, Stage, Tag } from "./Stage.tsx";

/** Drag a divider across the image: reference on the left, test on the right. */
export function Swipe({ item, zoom }: { item: ResultItem; zoom: Zoom }) {
  const [position, setPosition] = useState(50);
  const size = item.size;
  if (!size || !item.reference || !item.test) return null;

  const update = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <>
      <div className={styles.controls}>
        <label>
          Reference
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={position}
            aria-label="Divider position"
            onChange={(e) => setPosition(Number(e.target.value))}
          />
          Test
        </label>
      </div>
      <Stage
        size={size}
        zoom={zoom}
        className={styles.swipe}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          update(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) update(event);
        }}
      >
        <Layer src={item.test} size={item.testSize} canvas={size} alt="Test" />
        <Layer
          src={item.reference}
          size={item.referenceSize}
          canvas={size}
          alt="Reference"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <span className={styles.handle} style={{ left: `${position}%` }} />
        <Tag>Reference</Tag>
        <Tag side="right">Test</Tag>
      </Stage>
    </>
  );
}
