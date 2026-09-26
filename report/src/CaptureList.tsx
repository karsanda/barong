import styles from "./CaptureList.module.css";
import type { ResultItem } from "./lib.ts";
import { StatusBadge } from "./StatusBadge.tsx";

interface Props {
  items: ResultItem[];
  selected: string | undefined;
  onSelect: (name: string) => void;
}

export function CaptureList({ items, selected, onSelect }: Props) {
  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const thumb = item.test ?? item.reference;
        return (
          <li key={item.name}>
            <button
              type="button"
              ref={item.name === selected ? scrollIntoView : undefined}
              className={styles.item}
              aria-current={item.name === selected}
              data-status={item.status}
              onClick={() => onSelect(item.name)}
            >
              <span className={styles.thumb}>
                {thumb && <img src={thumb} alt="" loading="lazy" />}
              </span>
              <span className={styles.text}>
                <span className={styles.label}>{item.label}</span>
                <span className={styles.scenario}>{item.scenario}</span>
              </span>
              <span className={styles.side}>
                <StatusBadge status={item.status} />
                {item.diffPercent !== undefined && item.diffPercent > 0 && (
                  <span className={styles.percent}>{item.diffPercent}%</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Keeps the selected item visible when it changes via the keyboard. */
function scrollIntoView(element: HTMLElement | null) {
  element?.scrollIntoView({ block: "nearest" });
}
