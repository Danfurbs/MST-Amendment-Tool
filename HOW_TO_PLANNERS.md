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
- **Light blue** identifies an MST with a TV reference; **purple** entries are future instances.
- Use the **Filters** panel to narrow the view by plant, discipline, protection method, and more. Filters take effect immediately; **Done** closes the panel.
- The **Go to MST** shortcut jumps directly to a specific MST number.

## Making amendments
### Open work orders

The download's **Open Work Order Count** is a snapshot, not a live check. A **WO: count** badge and muted red border mark affected calendar entries, including future instances. Selecting one shows a pale rose editor with its count and download date when available. TV badges remain visible.

Before changing dates or frequency, review the current work-order status in Ellipse. The weekly download may still show a work order that has since closed. Each save or drag requires you to acknowledge that you have reviewed the status, understand the risks and are satisfied the changes are safe. Bulk editing lists affected MSTs in one confirmation; cancelling applies none of those pending bulk changes. The snapshot warning stays visible after acknowledgement.

Zero means no open work orders were recorded at download. Missing, blank or invalid counts show **Work-order status unavailable**, without this additional popup. Changes solely to other fields do not trigger the work-order confirmation.

Replay the **guided tour** for a fictional MST with two open work orders and a practice confirmation. The example does not change your data.

**Deactivation does not close work orders.** When the snapshot records open work orders, the deactivation confirmation explains that they remain active even against a deactivated MST. Check Ellipse and arrange to close them, or cancel them if the work is not complete. You can still deactivate the MST after acknowledging the message; cancelling leaves it unchanged.

### Editing
- Drag a green MST to a new date to reschedule it.
- Click **+ New MST** to insert an additional entry for the selected day.
- Use the **Planned Hours Graph** to check workload before finalizing moves.
- Watch the change counter in the action bar to confirm your edits are tracked.

## Understanding the amber advisory
The MST editor checks the proposed frequency, Last Scheduled Date and Job Description Code as you edit. It explains any calculated backlog or completion concern using the current London calendar date.

- **Possible backlog:** for scheduling indicator 1, Last Scheduled Date + frequency falls before today. Check whether an existing work order covers the work.
- **Late completion:** today is after Last Performed Date + frequency.
- **Non-compliance:** if the MST is measured by compliance, today is after Last Performed Date + frequency + Job Description Code tolerance. On the tolerance end date itself, it is not yet non-compliant.

Tolerance comes from the Job Description Code's configured `tol` value. Codes whose descriptions contain no number of days have a configured tolerance of zero. An unrecognised code or missing Last Performed Date is reported as unknown rather than assumed safe.

When **Save Changes** would introduce or worsen a calculated issue, a popup shows the before and proposed dates on an animated timeline. Choose **Review amendment** to return without applying it, or **Proceed with amendment** to apply it. **Before**, **Proposed** and **Replay animation** let you inspect the dates at your own pace. Existing concerns remain visible in the editor but do not repeatedly interrupt saves that leave them unchanged or improve them.

These checks apply to editor saves, calendar dragging and bulk amendments. Always check the latest work-order and completion record in Ellipse: the tool reads the download snapshot but cannot check live status. An open work order may affect Last Scheduled Date, but that date is not proof of completion. Compliance still uses Last Performed Date. A TV reference alone does not change this calculation. Do not move dates solely to remove a warning.

## Saving or discarding work
- Click **Export MST Changes** to download an updated file that includes your amendments.
- **Export with Review** / **Review & Export** lets you inspect amendments and new MSTs before exporting. Use **Previous** and **Next** to review more than 150 changed fields.
- The browser warns before leaving with unexported changes or unfinished editor fields. Replacing an uploaded dataset also asks before discarding this work. This warning does not save a draft: save editor changes and export before leaving.
- Click **Reset All Changes** to discard unsaved edits and reload the calendar from the uploaded file.

## Troubleshooting
- **File will not upload**: confirm it is an Excel or CSV file produced from the MST download query and re-try the upload.
- **Nothing appears on the calendar**: check that filters are not hiding results; use **Reset** in the Filters panel.
- **Dates look wrong**: check the source Last Scheduled Date and frequency, and obtain a fresh MST download if needed.
- **Export button is disabled**: verify a file is uploaded and wait for the initial load to finish (watch the "Loading MSTs..." message).
- **Still stuck?** Refresh the page and re-upload the MST download. If the problem persists, capture the error message (if any) and share it with the support team.


Frequency must be a whole number greater than zero. Invalid frequencies are included in the MST error checks and must be corrected before saving. Deactivating a newly created MST removes its queued creation from the batch.
