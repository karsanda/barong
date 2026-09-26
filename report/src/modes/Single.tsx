import type { ResultItem, Zoom } from "../lib.ts";
import styles from "./modes.module.css";
import { Layer, Stage, Tag } from "./Stage.tsx";

const MESSAGES = {
  new: "First capture: there is no reference to compare with.",
  missing: "Only the reference exists: this capture was not taken in the latest run.",
  error: "Capturing failed, so there is nothing to compare.",
  passed: "",
  failed: "",
};

/** Shows whichever image exists when a comparison is not possible. */
export function Single({ item, zoom }: { item: ResultItem; zoom: Zoom }) {
  const src = item.test ?? item.reference;
  const size = item.test ? item.testSize : item.referenceSize;
  const title = item.test ? "Test" : "Reference";

  return (
    <>
      <p className={styles.message}>{MESSAGES[item.status]}</p>
      {src && size && (
        <Stage size={size} zoom={zoom}>
          <Layer src={src} canvas={size} alt={title} />
          <Tag>{title}</Tag>
        </Stage>
      )}
    </>
  );
}
