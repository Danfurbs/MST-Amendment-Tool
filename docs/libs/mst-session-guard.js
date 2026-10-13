/* Protect in-memory amendments without persisting workbook data. */
(function () {
  const MST = window.MST = window.MST || {};
  let exported = null;
  let editorSnapshot = null;
  const fields = () => Array.from(document.querySelectorAll('#editForm input:not(:disabled), #editForm select:not(:disabled)'))
    .map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value]);
  const snapshot = () => JSON.stringify({ changes: window.changes || {}, created: window.createdMSTs || {},
    batch: document.getElementById('batchNumber')?.value || '' });
  const hasRecords = () => Object.keys(window.changes || {}).length > 0 || Object.keys(window.createdMSTs || {}).length > 0;
  MST.SessionGuard = {
    snapshot,
    markExported(value) { exported = value; },
    captureEditor() { editorSnapshot = JSON.stringify(fields()); },
    clearEditor() { editorSnapshot = null; },
    hasPendingEditor() {
      return Boolean(editorSnapshot && document.getElementById('editForm')?.style.display !== 'none' &&
        editorSnapshot !== JSON.stringify(fields()));
    },
    isDirty() { return this.hasPendingEditor() || (hasRecords() && snapshot() !== exported); },
    confirmReplace() {
      return !this.isDirty() || window.confirm('You have changes that have not been exported, or unsaved editor fields. Continue and replace this work?');
    }
  };
  window.addEventListener('beforeunload', event => {
    if (!MST.SessionGuard.isDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  });
})();
