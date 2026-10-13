const assert = require('node:assert/strict');
const fs = require('node:fs');
const XLSX = require('../docs/libs/xlsx.full.min.js');
const ExcelJS = require('../docs/libs/exceljs.min.js');
const ids = new Map();
function element() {
  return { children: [], style: {}, value: '', disabled: false,
    appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
    focus() {}, addEventListener() {}, removeEventListener() {}, contains() { return false; },
    set innerHTML(value) { throw new Error('Review must use text nodes, not HTML'); }
  };
}
['batchNumber','exportReviewSummary','exportReviewBody','exportReviewModal','proceedExportReviewBtn','closeExportReviewBtn','exportReviewPrevious','exportReviewNext'].forEach(id=>ids.set(id,element()));
ids.get('batchNumber').value = 'TEST';
const windowMock = { MST: { Utils: {} }, changes: {}, createdMSTs: {}, originalProps: {} };
const hostile = '<img src=x onerror=alert(1)>';
for (let i=0;i<151;i++) {
  windowMock.originalProps[i] = { 'Equipment Number': '00001234', 'MST Task Number': String(i), 'MST Description 1': hostile };
  windowMock.changes[i] = { MST_ID: String(i), Old_Desc2: 'Original', New_Desc2: hostile };
}
windowMock.changes[0].Old_Scheduling_Indicator_Code = '1';
windowMock.changes[0].New_Scheduling_Indicator_Code = '9';
windowMock.originalProps[1]['Temp Var Reference Number'] = 'TV-OLD';
Object.assign(windowMock.changes[1], { Old_TV_Reference:'TV-OLD', New_TV_Reference:'', Old_Segment_From:'12.5', New_Segment_From:'13.5' });
windowMock.createdMSTs.new = { Equipment: '00001235', 'Task No': 'NEW', 'MST Desc 1': hostile, Freq: 14, 'Job Desc Code': 'YE' };
let download;
const context = { window: windowMock, MST: windowMock.MST, document: { getElementById:id=>ids.get(id), createElement:element, body:{children:[]}, activeElement:null },
  ExcelJS, Blob, saveAs:blob=>{download=blob;}, alert:message=>{throw Error(message);} };
// ExcelJS checks array rows with instanceof Array; use the same realm as the library.
new Function(...Object.keys(context), fs.readFileSync(require.resolve('../docs/libs/FileExport.js'),'utf8'))(...Object.values(context));
const api = windowMock.MST.Export;
const rows = api.buildReviewRows();
assert.equal(rows.length,159);
assert.ok(rows.some(r=>r.field==='Scheduling Indicator' && r.to==='9'));
assert.ok(rows.some(r=>r.field==='New MST — Freq' && r.to==='14'));
api.openReviewAndExport();
assert.equal(ids.get('exportReviewBody').children.length,150);
assert.equal(ids.get('exportReviewBody').children[0].children[2].textContent,hostile);
ids.get('exportReviewNext').onclick();
assert.equal(ids.get('exportReviewBody').children.length,9);
assert.equal(ids.get('exportReviewNext').disabled,true);
ids.get('exportReviewPrevious').onclick();
assert.equal(ids.get('exportReviewBody').children.length,150);
(async()=>{
  // Blank, zero and explicitly cleared mileages must survive a real XLSX export.
  Object.assign(windowMock.changes[2], { Old_Segment_From:'12', New_Segment_From:'', Old_Segment_To:'', New_Segment_To:0 });
  windowMock.originalProps[2]['MST Segment Mileage From'] = '12';
  Object.assign(windowMock.changes[3], { Old_Segment_From:0, New_Segment_From:'', Old_Segment_To:'', New_Segment_To:'' });
  windowMock.originalProps[4]['MST Segment Mileage From'] = 0;
  windowMock.createdMSTs.new['Segment From'] = '';
  windowMock.createdMSTs.new['Segment To'] = 0;
  await api.exportChanges();
  const buffer = await download.arrayBuffer();
  const workbook = XLSX.read(buffer,{type:'array'});
  assert.ok(workbook.Sheets['MST Amend']);
  assert.ok(workbook.Sheets['_MST_SESSION']);
  const log = XLSX.utils.sheet_to_json(workbook.Sheets['Change Log']);
  assert.ok(log.some(r=>r['Field Changed']==='Scheduling Indicator' && r['New Value']==='9'));
  const amended = XLSX.utils.sheet_to_json(workbook.Sheets['MST Amend']);
  assert.equal(amended[0].Equipment,'00001234');
  assert.equal(amended[0]['MST Desc 2'],hostile);
  assert.equal(amended[1]['TV Reference'], '');
  assert.equal(amended[1]['Segment From'], '13.5');
  assert.equal(amended[2]['Segment From'], '');
  assert.equal(amended[2]['Segment To'], 0);
  assert.equal(amended[3]['Segment From'], '');
  assert.equal(amended[3]['Segment To'], '');
  assert.equal(amended[4]['Segment From'], 0);
  assert.equal(amended[4]['Segment To'], '');
  const created = XLSX.utils.sheet_to_json(workbook.Sheets['MST Create']);
  assert.equal(created[0]['Segment From'], '');
  assert.equal(created[0]['Segment To'], 0);
  const styled = new ExcelJS.Workbook();
  await styled.xlsx.load(buffer);
  const header = styled.getWorksheet('Header');
  assert.equal(header.getRow(1).height, 36);
  assert.equal(header.getRow(2).height, 48);
  assert.equal(header.getRow(4).height, 30);
  assert.equal(header.getCell('A2').alignment.wrapText, true);
  assert.match(header.getCell('A2').value, /separate tabs\.\n/);
  assert.equal(header.getCell('A4').font.size, 11);
  assert.equal(header.getCell('B4').alignment.indent, 1);
  console.log('Safe paged review, creation/deactivation coverage and real workbook export passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
