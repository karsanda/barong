# barong

<img src="./docs/barong.png" alt="crappy barong vector" width="250" />

**It helps us see things that cannot be seen with our mortal eyes.**

Barong is a visual regression testing tool. It takes screenshots of pages (or parts of pages)
with [Playwright](https://playwright.dev), compares them pixel by pixel against approved
reference images, and opens a report that shows exactly what changed.

## Requirements

- Node.js 22 or newer
- Chromium for Playwright

## Installation

```sh
pnpm add -g barong            # or: npm i -g barong
pnpm dlx playwright install chromium
```

## Quick start

```sh
barong init          # create barong.json and sample scenarios/
barong reference     # capture the reference (baseline) images
# ...change your site...
barong test          # capture again, compare, open the report
barong approve       # accept the changes as the new reference
```

`barong test` exits with code `1` when anything failed, is new, is missing or could not be
captured, so it can gate a CI job. Use `--no-open` there.

## Commands

| Command                     | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| `barong init [--force]`     | Create a sample `barong.json` and `scenarios/`                 |
| `barong reference [config]` | Capture reference images (alias `ref`)                         |
| `barong test [config]`      | Capture test images, compare with references, write the report |
| `barong compare [config]`   | Compare the existing test images without capturing again       |
| `barong approve [config]`   | Copy test images over the references                           |
| `barong report [config]`    | Open the last report                                           |

Common options:

- `-f, --filter <text>` only runs captures whose name, scenario or label contains `<text>`,
  e.g. `barong approve --filter "home__navbar"`
- `-c, --concurrency <n>` sets how many captures run in parallel
- `--headed` shows the browser while capturing
- `--no-open` (test and compare) writes the report without opening it

`[config]` defaults to `barong`, meaning `./barong.json` with every scenario. Add a glob after a
colon to run some scenario files only: `barong test barong:home` or `barong test site:mobile-*`.

## Configuration

`barong.json`:

```json
{
  "$schema": "https://unpkg.com/barong@1/schema/barong.schema.json",
  "scenariosDir": "scenarios",
  "outputDir": "barong",
  "viewport": { "width": 1400, "height": 900 },
  "waitUntil": "load",
  "threshold": 0.1,
  "maxDiffPercent": 0,
  "concurrency": 4,
  "timeout": 30000
}
```

| Key              | Default       | Description                                                    |
| ---------------- | ------------- | -------------------------------------------------------------- |
| `scenariosDir`   | `scenarios`   | Folder with the scenario files                                 |
| `outputDir`      | `barong`      | Where `reference/`, `test/`, `diff/` and `report/` are written |
| `viewport`       | `{1400, 900}` | Default browser viewport                                       |
| `waitUntil`      | `load`        | `load`, `domcontentloaded` or `networkidle`                    |
| `threshold`      | `0.1`         | Per-pixel color tolerance (0 = exact, 1 = anything goes)       |
| `maxDiffPercent` | `0`           | A capture fails when more than this % of its pixels differ     |
| `concurrency`    | `4`           | Parallel captures                                              |
| `timeout`        | `30000`       | Timeout in ms for navigation, actions and screenshots          |

Each file in `scenarios/` describes one page:

```json
{
  "$schema": "https://unpkg.com/barong@1/schema/scenario.schema.json",
  "label": "Home",
  "url": "https://example.com",
  "viewport": { "width": 375, "height": 667 },
  "captures": [
    { "label": "Navbar", "selector": "nav" },
    { "label": "Top area", "clip": { "x": 0, "y": 0, "width": 1060, "height": 100 } },
    { "label": "Whole page", "fullPage": true, "hide": [".ads"], "mask": [".timestamp"] },
    {
      "label": "Menu open",
      "actions": [{ "click": ".menu-button" }, { "waitFor": ".menu" }, { "wait": 200 }],
      "selector": ".menu"
    }
  ]
}
```

A capture takes the first element matching `selector`, a `clip` region, the `fullPage`, or
(with none of these) the viewport. Every capture opens the page in a new browser context, so
captures do not affect each other. Before capturing, Barong turns off CSS transitions,
animations and the text caret so that screenshots come out the same every time.

- `actions` run in order before the screenshot. The available actions are `{ "click": sel }`,
  `{ "hover": sel }`, `{ "fill": sel, "value": "text" }`,
  `{ "press": "Enter", "selector"?: sel }`, `{ "scroll": sel }`, `{ "waitFor": sel }` and
  `{ "wait": ms }`.
- `hide` makes elements invisible while keeping their layout space. Use it for ads and other
  changing content.
- `mask` covers elements with a magenta box, which is useful for timestamps and avatars.

Output files are named `<scenario-slug>__<capture-slug>.png`. Two captures that would get the
same name cause an error.

## The report

`barong test` writes `<outputDir>/report/index.html`. The report is a single file that also
works when opened straight from disk, so a CI job can upload the whole `outputDir` as an
artifact.

- The sidebar lists every capture. Failures are listed first, and you can filter by status or
  search by name.
- There are five view modes, which you can switch with the keys <kbd>1</kbd> to <kbd>5</kbd>:
  - **Side by side** shows the reference, test and diff next to each other, and they scroll
    together.
  - **Diff** shows the pixelmatch diff with the changed regions outlined. You can also show the
    test image underneath it.
  - **Swipe** lets you drag a divider between the reference and the test image.
  - **Onion skin** fades the test image over the reference.
  - **Toggle** switches between the two images in the same spot (press <kbd>Space</kbd>).
- You can zoom to fit, 100% or 200%. Use <kbd>←</kbd>/<kbd>→</kbd> or <kbd>j</kbd>/<kbd>k</kbd>
  to move between captures.
- For each failed or new capture, the report shows a ready-made `barong approve --filter …`
  command.

## Upgrading from 0.x

In 1.0 the capture engine was rewritten on Playwright (it replaces CasperJS and SlimerJS), and
the config format changed:

| 0.x                                            | 1.0                             |
| ---------------------------------------------- | ------------------------------- |
| `barong capture`                               | `barong reference`              |
| `barong test --against <dir>` / `--save <dir>` | fixed folders under `outputDir` |
| `barong compare <testDir> <referenceDir>`      | `barong compare [config]`       |
| `test_folder`                                  | `scenariosDir`                  |
| `capture_target`                               | `outputDir`                     |
| `before_capture: { action, selector }`         | `actions: [{ "click": sel }]`   |
| `delay: 500`                                   | `actions: [{ "wait": 500 }]`    |
| `selector: { left, top, width, height }`       | `clip: { x, y, width, height }` |

Unknown keys are now errors, so the validator points out every old key that is still in your
config.

## Development

```sh
pnpm install
pnpm exec playwright install chromium
pnpm dev:report    # report UI dev server (vite)
pnpm build         # CLI (tsdown) + report (vite) + JSON schemas
pnpm check         # oxlint, oxfmt --check, tsc, vitest
```

The repo uses TypeScript, [tsdown](https://tsdown.dev), [Vite](https://vite.dev) with React 19,
[Vitest](https://vitest.dev), [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[oxfmt](https://oxc.rs/docs/guide/usage/formatter). Git hooks are managed with
[lefthook](https://lefthook.dev).
