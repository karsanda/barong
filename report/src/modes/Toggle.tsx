import { useEffect, useState } from "react";
import { isTyping, type ResultItem, type Zoom } from "../lib.ts";
import styles from "./modes.module.css";
import { Layer, Stage, Tag } from "./Stage.tsx";

/** Flip between reference and test in place; changes jump out as movement. */
export function Toggle({ item, zoom }: { item: ResultItem; zoom: Zoom }) {
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " || isTyping(event)) return;
      event.preventDefault();
      setShowTest((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const size = item.size;
  if (!size || !item.reference || !item.test) return null;

  return (
    <>
      <div className={styles.controls}>
        <span>
          Press <kbd>Space</kbd> or click the image to flip
        </span>
      </div>
      <Stage
        size={size}
        zoom={zoom}
        className={styles.toggle}
        onClick={() => setShowTest((v) => !v)}
      >
        {/* Both stay mounted so flipping never waits for an image to load. */}
        <Layer
          src={item.reference}
          size={item.referenceSize}
          canvas={size}
          alt="Reference"
          style={{ visibility: showTest ? "hidden" : "visible" }}
        />
        <Layer
          src={item.test}
          size={item.testSize}
          canvas={size}
          alt="Test"
          style={{ visibility: showTest ? "visible" : "hidden" }}
        />
        <Tag>{showTest ? "Test" : "Reference"}</Tag>
      </Stage>
    </>
  );
}
