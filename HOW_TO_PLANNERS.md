# MST Amendment Tool: Planner How-To

This quick guide explains what the MST Amendment Tool is for, how planners can use it, and what to try if something goes wrong.

## What the tool does
- Displays MST events on a color-coded calendar so you can see current, next, and following due dates at a glance.
- Lets you drag existing MST entries to new dates or create new ones to reflect amendments.
- Tracks your pending edits and exports them so you can share updates back to the wider team.

## Getting started
1. Open `docs/index.html` in your browser (or use the GitHub Pages URL if the site is published).
2. In the **Upload MST Download** card, click **📄 Choose file** and select the latest MST extract (`.xlsx`, `.xls`, or `.csv`).
3. Enter the associated batch number (e.g., `LANDC...`) so the export matches your run.
4. Wait for MSTs to load; the header will show the **Download Date** from the file.

## Reading the calendar
- **Green** entries are current MSTs you can click to view or edit.
- **Amber** marks the next due date; **Red** marks the following due date.
- Use the **Filters** panel to narrow the view by plant, discipline, protection method, and more.
- The **Go to MST** shortcut jumps directly to a specific MST number.

## Making amendments
- Drag a green MST to a new date to reschedule it.
- Click **+ New MST** to insert an additional entry for the selected day.
- Use the **Planned Hours Graph** to check workload before finalizing moves.
- Watch the change counter in the action bar to confirm your edits are tracked.

## Saving or discarding work
- Click **Export MST Changes** to download an updated file that includes your amendments.
- Click **Reset All Changes** to discard unsaved edits and reload the calendar from the uploaded file.

## Troubleshooting
- **File will not upload**: confirm it is an Excel or CSV file produced from the MST download query and re-try the upload.
- **Nothing appears on the calendar**: check that filters are not hiding results; use **Reset** in the Filters panel.
- **Colors look wrong**: ensure the source file contains the expected current/next/following due dates; re-export the MST download if needed.
- **Export button is disabled**: verify a file is uploaded and wait for the initial load to finish (watch the "Loading MSTs..." message).
- **Still stuck?** Refresh the page and re-upload the MST download. If the problem persists, capture the error message (if any) and share it with the support team.
