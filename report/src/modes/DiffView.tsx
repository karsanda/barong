import { useState } from "react";
import type { ResultItem, Zoom } from "../lib.ts";
import styles from "./modes.module.css";
import { Layer, Stage, Tag } from "./Stage.tsx";

/** The pixelmatch diff image, with the changed regions outlined. */
export function DiffView({ item, zoom }: { item: ResultItem; zoom: Zoom }) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [underlay, setUnderlay] = useState(false);
  const size = item.size;
  if (!size || !item.diff) return null;
  const boxes = item.boxes ?? [];

  return (
    <>
      <div className={styles.controls}>
        <label>
          <input
            type="checkbox"
            checked={showBoxes}
            onChange={(e) => setShowBoxes(e.target.checked)}
          />
          Outline changed regions ({boxes.length})
        </label>
        <label>
          <input
            type="checkbox"
            checked={underlay}
            onChange={(e) => setUnderlay(e.target.checked)}
          />
          Show test image underneath
        </label>
      </div>
      <Stage size={size} zoom={zoom}>
        {underlay && item.test && (
          <Layer src={item.test} size={item.testSize} canvas={size} alt="Test" />
        )}
        <Layer
          src={item.diff}
          canvas={size}
          alt="Diff"
          style={underlay ? { mixBlendMode: "multiply", opacity: 0.85 } : undefined}
        />
        {showBoxes &&
          boxes.map((box) => (
            <span
              key={`${box.x},${box.y}`}
              className={styles.box}
              style={{
                left: `${(box.x / size.width) * 100}%`,
                top: `${(box.y / size.height) * 100}%`,
                width: `${(box.width / size.width) * 100}%`,
                height: `${(box.height / size.height) * 100}%`,
              }}
            />
          ))}
        <Tag>Diff</Tag>
      </Stage>
    </>
  );
}
