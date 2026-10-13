# Release review — 10 October 2026

## Completed

- Existing working-tree changes preserved in the relocated project.
- Invalid frequencies (including zero) flagged in MST errors; editor, bulk and new-MST validation require positive whole numbers.
- Deactivation removes mounted and virtual future occurrences and disables dragging of the deactivated base record. Batch resumption uses the same schedule-stop operation.
- Removing a queued new MST removes its creation instead of exporting a deactivation.
- Existing amendment values are retained when a record is deactivated; change tracking retains scheduling indicator 9.
- Explicitly cleared fields survive batch resumption and editor reopening.
- CSV import preserves raw text to avoid date/identifier coercion.
- Guided-tour examples restore editor values and labels, do not select a live calendar record automatically, and make the demonstration editor inert.
- Planner instructions corrected to distinguish download snapshots from live Ellipse status.
- Node suite: 13 test files pass, including work-order acknowledgements, cancellation, repeated/bulk edits, dragging, export, batch resume, large imports, deactivation and invalid frequency checks.
- JavaScript syntax checks passed for modified application scripts.

## Outstanding before release

- **Microsoft Edge smoke test:** Edge is unavailable to this session's browser tools. Test the production build at desktop and narrow widths, keyboard navigation, WO + TV styling, zero-frequency correction, cancel/confirm on editor/drag/bulk changes, deactivation and removal of a new MST, export and batch resume. Automated DOM tests do not replace this browser check.
- **Approved extract:** confirm the production download contains Open Work Order Count and the correct download date. Bundled SQL has not been changed; absence of the count deliberately displays status unavailable and does not request WO acknowledgement.
- Fill the release date, tool link and support contact in PLANNER_RELEASE_EMAIL.md.
- Publish through the usual release process; no commit, push, deployment or email sending has been performed here.

No live Ellipse integration, persistent acknowledgement log or amendment-export column changes are included.
