import { useRef } from "react";
import type { ResultItem, Size, Zoom } from "../lib.ts";
import styles from "./modes.module.css";
import { Layer, Stage } from "./Stage.tsx";

/** Reference, test and diff next to each other; scrolling one pane scrolls all three. */
export function SideBySide({ item, zoom }: { item: ResultItem; zoom: Zoom }) {
  const panes = useRef<(HTMLDivElement | null)[]>([]);
  const syncing = useRef(false);

  const onScroll = (index: number) => {
    if (syncing.current) return;
    const source = panes.current[index];
    if (!source) return;
    syncing.current = true;
    for (const pane of panes.current) {
      if (pane && pane !== source) {
        pane.scrollTop = source.scrollTop;
        pane.scrollLeft = source.scrollLeft;
      }
    }
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  const columns: { title: string; src?: string; size?: Size }[] = [
    { title: "Reference", src: item.reference, size: item.referenceSize },
    { title: "Test", src: item.test, size: item.testSize },
    { title: "Diff", src: item.diff, size: item.size },
  ];

  return (
    <div className={styles.columns}>
      {columns.map((column, index) => (
        <div key={column.title} className={styles.column}>
          <h3 className={styles.columnTitle}>{column.title}</h3>
          <div
            className={styles.pane}
            ref={(el) => {
              panes.current[index] = el;
            }}
            onScroll={() => onScroll(index)}
          >
            {column.src && column.size && (
              <Stage size={column.size} zoom={zoom}>
                <Layer src={column.src} canvas={column.size} alt={column.title} />
              </Stage>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
