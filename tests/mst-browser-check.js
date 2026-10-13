// Local-only browser benchmark. Usage: node tests/mst-browser-check.js <baseline-docs-dir>
// Open the printed URL and click Run. No changes are made to either application copy.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const baseline = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'mst-import-baseline-20261007/docs'));
const resultsPath = path.join(os.tmpdir(), 'mst-browser-results.json');
const results = [];
function instrument() {
  addEventListener('load', async () => {
    const params = new URLSearchParams(location.search);
    const count = Number(params.get('count'));
    if (!params.has('count')) return;
    const metrics = { version: params.get('version'), count, run: Number(params.get('run')), parseMs: 0, prepareMs: 0, calendarMs: 0, renders: 0 };
    const read = XLSX.read, json = XLSX.utils.sheet_to_json;
    const sample = await (await fetch('/sample.xlsx')).arrayBuffer();
    let bytes = sample;
    if (count) {
      const book = read(sample, { type: 'array' });
      const source = json(book.Sheets[book.SheetNames[0]]);
      // The sample stores YYYYMMDD as numbers, which the existing parser treats
      // as Excel serials and rejects. Fixtures use supported date strings so
      // they exercise actual calendar loading without changing app semantics.
      const rows = Array.from({ length: count }, (_, i) => ({ ...source[i % source.length],
        CONCAT: 'BENCH_' + i, 'Equipment Number': String(100000 + i),
        'Last Scheduled Date': String(source[i % source.length]['Last Scheduled Date'])
      }));
      const fixture = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(fixture, XLSX.utils.json_to_sheet(rows), 'MSTs');
      bytes = XLSX.write(fixture, { type: 'array', bookType: 'xlsx' });
    }
    XLSX.read = function(...args) { const start = performance.now(); const value = read.apply(this, args); metrics.parseMs += performance.now() - start; return value; };
    XLSX.utils.sheet_to_json = function(...args) { const start = performance.now(); const value = json.apply(this, args); metrics.parseMs += performance.now() - start; return value; };
    const render = MST.Editor.renderVisibleInstances;
    MST.Editor.renderVisibleInstances = function(...args) { metrics.renders++; return render.apply(this, args); };
    const load = MST.Editor.loadMSTs;
    let uploadStart, selectionStart;
    MST.Editor.loadMSTs = function(rows) {
      metrics.rows = rows.length;
      const start = performance.now();
      metrics.prepareMs += start - selectionStart;
      load.call(this, rows);
      metrics.calendarMs = performance.now() - start;
      requestAnimationFrame(() => requestAnimationFrame(async () => {
        metrics.calendarPaintMs = performance.now() - start;
        const stable = value => {
          if (Array.isArray(value)) return value.map(stable);
          if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
          return value;
        };
        const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(stable(value)))))].map(x => x.toString(16).padStart(2, '0')).join('');
        const events = calendar.getEvents().map(e => ({ id: e.id, start: e.start, title: e.title, allDay: e.allDay, display: e.display, backgroundColor: e.backgroundColor, borderColor: e.borderColor, classNames: e.classNames, extendedProps: e.extendedProps })).sort((a, b) => a.id.localeCompare(b.id));
        metrics.events = events.length;
        if (count && !events.length) throw new Error('Benchmark fixture must create calendar events');
        metrics.eventsHash = await hash(events);
        metrics.virtualHash = await hash(window.virtualInstanceStore);
        metrics.originalHash = await hash(window.originalProps);
        metrics.filtersHash = await hash([...document.querySelectorAll('#filterOverlay select')].map(el => [el.id, el.innerHTML]));
        await fetch('/results', { method: 'POST', body: JSON.stringify(metrics) });
        parent.postMessage({ benchmark: metrics }, location.origin);
      }));
    };
    const modal = document.getElementById('wgSelectModal');
    const observer = new MutationObserver(() => {
      if (modal.style.display !== 'flex') return;
      observer.disconnect();
      metrics.workgroupBackdrop = getComputedStyle(modal).backgroundColor;
      metrics.loadingBackdrop = getComputedStyle(document.getElementById('loadingOverlay')).backgroundColor;
      metrics.initialFilterBackdrop = getComputedStyle(document.getElementById('initialFilterModal')).backgroundColor;
      metrics.prepareMs += performance.now() - uploadStart - metrics.parseMs;
      if (params.has('manual')) {
        document.getElementById('wgSelectConfirm').addEventListener('click', () => { selectionStart = performance.now(); }, { capture: true, once: true });
        return;
      }
      const select = document.getElementById('wgSelectDropdown');
      [...select.options].forEach(option => { option.selected = true; });
      selectionStart = performance.now();
      document.getElementById('wgSelectConfirm').click();
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    const input = document.getElementById('fileInput');
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'benchmark.xlsx'));
    input.files = transfer.files;
    uploadStart = performance.now();
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
const runner = `<!doctype html><title>MST browser benchmark</title><style>body{font:14px system-ui}iframe{width:100%;height:850px}pre{white-space:pre-wrap}</style><h1>MST import comparison</h1><button id="run">Run three comparisons per dataset</button><pre id="results">Ready</pre><iframe id="app"></iframe><script>
const queue=[]; for(const count of [0,1000,6000])for(let run=1;run<=3;run++)for(const version of ['baseline','current'])queue.push({count,run,version});
const lines=[];function next(){const job=queue.shift();if(!job){document.getElementById('results').textContent=JSON.stringify(lines,null,2)+'\\nCOMPLETE';return;}document.getElementById('results').textContent='Running '+JSON.stringify(job)+'\\n'+JSON.stringify(lines,null,2);document.getElementById('app').src='/'+job.version+'/index.html?'+new URLSearchParams(job);}
document.getElementById('run').onclick=()=>{document.getElementById('run').disabled=true;next();};
addEventListener('message',e=>{if(e.origin!==location.origin||!e.data.benchmark)return;lines.push(e.data.benchmark);next();});
</script>`;
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/results' && req.method === 'POST') {
    let body = ''; req.on('data', chunk => { body += chunk; }); req.on('end', () => {
      results.push(JSON.parse(body)); fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      console.log(body); res.end('ok');
    }); return;
  }
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(runner); return; }
  if (url.pathname === '/instrument.js') { res.setHeader('Content-Type', 'text/javascript'); res.end('(' + instrument.toString() + ')()'); return; }
  const match = url.pathname.match(/^\/(baseline|current)\/(.*)$/);
  let file;
  if (url.pathname === '/sample.xlsx') file = path.join(root, 'MSTs.xlsx');
  else if (match) {
    const dir = match[1] === 'baseline' ? baseline : path.join(root, 'docs');
    file = path.resolve(dir, match[2]);
    if (!file.startsWith(dir + path.sep)) { res.writeHead(403); res.end(); return; }
  }
  if (!file || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(file);
  res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' })[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  let content = fs.readFileSync(file);
  if (ext === '.html' && url.searchParams.has('count')) content = content.toString().replace('</body>', '<script src="/instrument.js"></script></body>');
  res.end(content);
}).listen(8765, '127.0.0.1', () => console.log('http://127.0.0.1:8765 — results: ' + resultsPath));
