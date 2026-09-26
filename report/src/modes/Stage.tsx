import type { CSSProperties, PointerEventHandler, ReactNode } from "react";
import type { Size, Zoom } from "../lib.ts";
import styles from "./modes.module.css";

interface StageProps {
  /** Canvas size in image pixels; every layer is positioned relative to it. */
  size: Size;
  zoom: Zoom;
  children: ReactNode;
  className?: string;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onClick?: () => void;
}

/** A checkerboard canvas that keeps its aspect ratio and scales with the zoom level. */
export function Stage({ size, zoom, children, className, ...handlers }: StageProps) {
  const style: CSSProperties = {
    width: zoom === "fit" ? `min(100%, ${size.width}px)` : `${size.width * zoom}px`,
    aspectRatio: `${size.width} / ${size.height}`,
  };
  return (
    <div className={`${styles.stage} ${className ?? ""}`} style={style} {...handlers}>
      {children}
    </div>
  );
}

interface LayerProps {
  src: string;
  /** The image's own size, when it differs from the canvas. */
  size?: Size;
  canvas: Size;
  alt: string;
  style?: CSSProperties;
}

export function Layer({ src, size, canvas, alt, style }: LayerProps) {
  const width = size ? (size.width / canvas.width) * 100 : 100;
  return (
    <img
      className={styles.layer}
      src={src}
      alt={alt}
      draggable={false}
      style={{ width: `${width}%`, ...style }}
    />
  );
}

export function Tag({ children, side = "left" }: { children: ReactNode; side?: "left" | "right" }) {
  return (
    <span className={`${styles.tag} ${side === "right" ? styles.tagRight : ""}`}>{children}</span>
  );
}
