import { useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
import { CaptureList } from "./CaptureList.tsx";
import { FilterBar } from "./FilterBar.tsx";
import {
  MODES,
  filterItems,
  isTyping,
  sortItems,
  useStoredState,
  type Filter,
  type Mode,
  type ReportData,
  type Zoom,
} from "./lib.ts";
import { Viewer } from "./Viewer.tsx";

function initialSelection(): string | undefined {
  return decodeURIComponent(location.hash.slice(1)) || undefined;
}

export function App({ data }: { data: ReportData | undefined }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | undefined>(initialSelection);
  const [mode, setMode] = useStoredState<Mode>("mode", "side");
  const [zoom, setZoom] = useStoredState<Zoom>("zoom", "fit");

  const sorted = useMemo(() => sortItems(data?.items ?? []), [data]);
  const visible = useMemo(() => filterItems(sorted, filter, query), [sorted, filter, query]);
  const current = visible.find((item) => item.name === selected) ?? visible[0];

  useEffect(() => {
    if (current) history.replaceState(null, "", `#${encodeURIComponent(current.name)}`);
  }, [current]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event) || event.metaKey || event.ctrlKey || event.altKey) return;
      const index = current ? visible.indexOf(current) : -1;
      const step = { ArrowDown: 1, ArrowRight: 1, j: 1, ArrowUp: -1, ArrowLeft: -1, k: -1 }[
        event.key
      ];
      if (step && visible.length > 0) {
        event.preventDefault();
        const next = visible[(index + step + visible.length) % visible.length];
        setSelected(next?.name);
        return;
      }
      const modeIndex = Number(event.key) - 1;
      const nextMode = MODES[modeIndex];
      if (nextMode) {
        event.preventDefault();
        setMode(nextMode.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, visible, setMode]);

  if (!data) {
    return (
      <main className={styles.empty}>
        <h1>No report data</h1>
        <p>
          Run <code>barong test</code> to generate a report.
        </p>
      </main>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1>Barong</h1>
          <span className={styles.meta}>
            {data.config} · {new Date(data.generatedAt).toLocaleString()} · threshold{" "}
            {data.threshold}, max diff {data.maxDiffPercent}%
          </span>
        </div>
        <FilterBar
          summary={data.summary}
          total={data.items.length}
          value={filter}
          onChange={setFilter}
        />
      </header>
      <aside className={styles.sidebar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search captures…"
          aria-label="Search captures"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <CaptureList items={visible} selected={current?.name} onSelect={setSelected} />
      </aside>
      <main className={styles.main}>
        {current ? (
          <Viewer item={current} mode={mode} onMode={setMode} zoom={zoom} onZoom={setZoom} />
        ) : (
          <p className={styles.none}>No captures match.</p>
        )}
      </main>
    </div>
  );
}
