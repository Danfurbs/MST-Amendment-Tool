# MST import optimisation checks

Browser measurements completed 8 October 2026 using the bundled FullCalendar and SheetJS libraries. Three alternating runs per dataset in the local in-app browser; figures below are medians in milliseconds. Time choosing work groups is excluded.

## Follow-up: batch calendar insertion

The baseline is a saved copy of the first optimisation (one virtual-store rendering pass, but individual calendar inserts). The revised version inserts base events and visible future events as two array event sources. Reset removes old sources and events together. Active filter matching is prepared once per visible-instance pass.

| MST rows | Calendar population before | Calendar population after | Events retained |
| --- | ---: | ---: | ---: |
| 1,000 | 204.4 ms | 85.0 ms | 1,650 |
| 6,000 | 6,475.5 ms | 366.7 ms | 9,900 |

For 6,000 rows, revised parsing is 683.5 ms and preparation is 113.5 ms. Calendar population includes the synchronous FullCalendar rendering batch; the separate `calendarPaintMs` measurement waits two animation frames. The existing 300 ms completion-panel dismissal delay is not included. Preparation includes file-read overhead and the new frame yield that lets the loading panel paint.

Every before/after run matched hashes for sorted event IDs, dates, titles, colours, classes, all-day/display settings and extended properties; virtual schedules; original-row snapshots; and filter-option markup. Computed backgrounds for loading, work-group selection and additional filtering now all equal `rgba(0, 0, 0, 0.55)`.

Raw measurements: `mst-browser-results-batched.json`. The earlier scan-removal measurements are retained in `mst-browser-results.json` (6,000-row calendar median 42.81 s → 6.31 s). That earlier baseline reconstructed the original repeated rebuild and dropdown passes in an isolated application copy. These are local fixture measurements, not guarantees for every download or computer.

## Fixtures and limits

The unchanged `MSTs.xlsx` sample contains 100 rows with numeric YYYYMMDD scheduled dates. The existing date parser treats numbers as Excel serial dates and skips these out-of-range values, resulting in no calendar events in both versions. This pre-existing date behaviour was deliberately preserved. Its timing is recorded but is not a useful calendar benchmark.

The 1,000- and 6,000-row fixtures repeat sample rows with unique IDs/equipment numbers and convert Last Scheduled Date to the supported YYYYMMDD **string** form. Fixture generation is outside the timed interval. Production data, recurrence counts, lazy-loading buffers and import limits are unchanged.

## Behaviour checks

- Ten automated test files pass, including import batching, navigation, reload, active filters, frequency rebuilding, drag advisory confirmation/cancellation/Escape/concurrency, session resume, resources and workbook export.
- Browser checks: populated calendar appearance; equipment and standard-job search highlights; planned-hours modal; work-group → additional filters → back → load transitions; future-instance drag advisory, cancellation with Escape, and an accepted drag.
- Final native browser reset confirmation could not be completed by the browser tool after a timeout. Reload/reset state is covered by automated tests; no manual reset pass is claimed.

Run unit/regression checks with `node --test tests/*.test.js`.

To repeat the browser comparison, preserve a baseline copy of `docs`, run `node tests/mst-browser-check.js <baseline-docs-directory>`, open the printed localhost URL, and click **Run three comparisons per dataset**. The server listens only on loopback and writes raw results to the OS temporary directory. No runtime instrumentation is added to the published application.
