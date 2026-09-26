import { useState } from "react";
import { DiffView } from "./modes/DiffView.tsx";
import { Onion } from "./modes/Onion.tsx";
import { SideBySide } from "./modes/SideBySide.tsx";
import { Single } from "./modes/Single.tsx";
import { Swipe } from "./modes/Swipe.tsx";
import { Toggle } from "./modes/Toggle.tsx";
import { MODES, ZOOMS, isComparable, type Mode, type ResultItem, type Zoom } from "./lib.ts";
import { StatusBadge } from "./StatusBadge.tsx";
import styles from "./Viewer.module.css";

interface Props {
  item: ResultItem;
  mode: Mode;
  onMode: (mode: Mode) => void;
  zoom: Zoom;
  onZoom: (zoom: Zoom) => void;
}

export function Viewer({ item, mode, onMode, zoom, onZoom }: Props) {
  const comparable = isComparable(item);

  return (
    <section className={styles.viewer} aria-label={`${item.scenario} › ${item.label}`}>
      <div className={styles.toolbar}>
        <div className={styles.title}>
          <h2>
            <span className={styles.scenario}>{item.scenario} ›</span> {item.label}
          </h2>
          <div className={styles.facts}>
            <StatusBadge status={item.status} />
            <Facts item={item} />
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.url}
              </a>
            )}
          </div>
        </div>
        <div className={styles.controls}>
          {comparable && (
            <Segmented
              label="View mode"
              options={MODES.map((m, i) => ({ id: m.id, label: m.label, hint: String(i + 1) }))}
              value={mode}
              onChange={onMode}
            />
          )}
          <Segmented label="Zoom" options={ZOOMS} value={zoom} onChange={onZoom} />
        </div>
      </div>

      {item.status !== "passed" && <ApproveHint item={item} />}

      <div className={styles.body}>
        {!comparable ? (
          <Single item={item} zoom={zoom} />
        ) : mode === "side" ? (
          <SideBySide item={item} zoom={zoom} />
        ) : mode === "diff" ? (
          <DiffView item={item} zoom={zoom} />
        ) : mode === "swipe" ? (
          <Swipe item={item} zoom={zoom} />
        ) : mode === "onion" ? (
          <Onion item={item} zoom={zoom} />
        ) : (
          <Toggle item={item} zoom={zoom} />
        )}
      </div>
    </section>
  );
}

function Facts({ item }: { item: ResultItem }) {
  if (item.status === "failed" || item.status === "passed") {
    const size =
      item.sizeChanged && item.referenceSize && item.testSize
        ? ` · size ${item.referenceSize.width}×${item.referenceSize.height} → ${item.testSize.width}×${item.testSize.height}`
        : item.size
          ? ` · ${item.size.width}×${item.size.height}`
          : "";
    return (
      <span className={styles.fact}>
        {item.diffPercent ?? 0}% different ({(item.diffPixels ?? 0).toLocaleString()} px){size}
        {item.boxes && item.boxes.length > 0 && ` · ${item.boxes.length} region(s)`}
      </span>
    );
  }
  if (item.status === "new") return <span className={styles.fact}>No reference image yet</span>;
  if (item.status === "missing")
    return <span className={styles.fact}>Not captured in this run</span>;
  return <span className={styles.error}>{item.error}</span>;
}

function ApproveHint({ item }: { item: ResultItem }) {
  const [copied, setCopied] = useState(false);
  if (item.status !== "failed" && item.status !== "new") return null;
  const command = `barong approve --filter "${item.name}"`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context); the command is still selectable.
    }
  };
  return (
    <div className={styles.hint}>
      <span>Intended change? Accept it with</span>
      <code>{command}</code>
      <button type="button" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

interface SegmentedProps<T extends string | number> {
  label: string;
  options: { id: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          title={option.hint ? `${option.label} (${option.hint})` : option.label}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
