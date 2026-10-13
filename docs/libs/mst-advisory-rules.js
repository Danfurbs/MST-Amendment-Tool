/* Date-only rules; no calendar instance expansion or DOM dependency. */
(function (root) {
  const DAY = 86400000;
  function day(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const [y, m, d] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date.getTime() / DAY : null;
  }
  function assess(input, today) {
    const now = day(today), lsd = day(input.lastScheduled), lpd = day(input.lastPerformed);
    const frequency = Number(input.frequency), tolerance = input.tolerance;
    const validFrequency = Number.isInteger(frequency) && frequency > 0;
    const due = validFrequency && lsd !== null ? lsd + frequency : null;
    const completionDue = validFrequency && lpd !== null ? lpd + frequency : null;
    const knownTolerance = Number.isInteger(tolerance) && tolerance >= 0;
    const limit = completionDue !== null && knownTolerance ? completionDue + tolerance : null;
    return {
      ...input, today: now, lsd, lpd, due, completionDue, limit,
      backlog: now !== null && due !== null ? Math.max(0, now - due) : null,
      late: now !== null && completionDue !== null ? Math.max(0, now - completionDue) : null,
      nonCompliance: now !== null && limit !== null ? Math.max(0, now - limit) : null
    };
  }
  function compare(before, after, today) {
    const old = assess(before, today), proposed = assess(after, today);
    const worsened = ['backlog', 'late', 'nonCompliance'].filter(key =>
      proposed[key] > 0 && (old[key] === null || proposed[key] > old[key]));
    // A change to an unrecognised tolerance must not silently bypass a known late issue.
    if (proposed.late > 0 && proposed.limit === null && before.jobCode !== after.jobCode) worsened.push('unknownTolerance');
    return { before: old, after: proposed, worsened, needsConfirmation: worsened.length > 0 };
  }
  const api = { day, assess, compare, formatDay: value => value === null ? 'Unknown' : new Date(value * DAY).toLocaleDateString('en-GB', { timeZone: 'UTC' }) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.MST = root.MST || {}; root.MST.AdvisoryRules = api; }
})(typeof window !== 'undefined' ? window : globalThis);
