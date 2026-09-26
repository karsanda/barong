import styles from "./FilterBar.module.css";
import { STATUSES, type Filter, type Status } from "./lib.ts";

interface Props {
  summary: Record<Status, number>;
  total: number;
  value: Filter;
  onChange: (filter: Filter) => void;
}

export function FilterBar({ summary, total, value, onChange }: Props) {
  const chips: { id: Filter; count: number }[] = [
    { id: "all", count: total },
    ...STATUSES.filter((status) => summary[status] > 0).map((id) => ({ id, count: summary[id] })),
  ];
  return (
    <nav className={styles.bar} aria-label="Filter by status">
      {chips.map(({ id, count }) => (
        <button
          key={id}
          type="button"
          className={styles.chip}
          data-status={id}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          <span className={styles.dot} />
          {id} <strong>{count}</strong>
        </button>
      ))}
    </nav>
  );
}
