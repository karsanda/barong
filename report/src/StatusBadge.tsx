import styles from "./StatusBadge.module.css";
import type { Status } from "./lib.ts";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={styles.badge} data-status={status}>
      {status}
    </span>
  );
}
