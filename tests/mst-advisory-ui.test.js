const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Rules = require('../docs/libs/mst-advisory-rules.js');
const elements = new Map(), dialogs = [];
let active, mutations = 0, animationTime = 0;
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.events = {}; this.controls = new Map(); this.clientWidth = 320; this.value = ''; this.dataset = {}; }
  setAttribute(k,v) { this.attrs[k]=v; }
  appendChild(el) { this.children.push(el); }
  replaceChildren(...children) { this.children=children; }
  addEventListener(name, fn) { this.events[name]=fn; }
  querySelector(selector) { if(!this.controls.has(selector))this.controls.set(selector,new Element('control')); return this.controls.get(selector); }
  focus() { active=this; }
  showModal() { this.open=true; }
  close() { this.open=false; this.events.close?.(); }
  remove() { this.removed=true; }
}
const doc = { getElementById(id){if(!elements.has(id))elements.set(id,new Element('input'));return elements.get(id);},
  createElement(tag){const el=new Element(tag);if(tag==='dialog')dialogs.push(el);return el;},
  createElementNS(ns,tag){return new Element(tag);},addEventListener(){},body:new Element('body'),get activeElement(){return active;} };
const event={start:new Date('2026-09-15T09:00:00'),extendedProps:{frequency:28,jobDescCode:'YE'}};
const windowMock={MST:{AdvisoryRules:Rules,Utils:{normalizeDateInput:v=>v,dateToInputYYYYMMDD:d=>d.toISOString().slice(0,10),showToast(){},formatMstToastSubject:()=>''},Editor:{}},
  calendar:{getEventById:()=>event}, originalProps:{M1:{'Last Performed Date':'2026-09-10','Scheduling Indicator Code':'1'}},matchMedia:()=>({matches:false})};
['lastDateInput','freqInput','jobDescCodeInput','mileageFromInput','mileageToInput','desc2Input','wgInput','unitsRequiredInput','protTypeInput','protMethodInput','allowMultipleInput'].forEach(id=>windowMock[id]=doc.getElementById(id));
windowMock.lastDateInput.value='2026-09-15';windowMock.freqInput.value='14';windowMock.jobDescCodeInput.value='YE';
class FixedDate extends Date { constructor(...args){super(...(args.length?args:['2026-10-06T12:00:00Z']));} }
const context=vm.createContext({window:windowMock,MST:windowMock.MST,document:doc,Date:FixedDate,Intl,
  setTimeout:()=>1,clearTimeout(){},cancelAnimationFrame(){},requestAnimationFrame(fn){animationTime+=800;fn(animationTime);return 1;},performance:{now:()=>animationTime},
  applyMstUpdates(){mutations++;return {formattedSegFrom:'',formattedSegTo:'',baseEvent:event};} });
vm.runInContext(fs.readFileSync(require.resolve('../docs/libs/mst-variables.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(require.resolve('../docs/libs/mst-advisory-ui.js'),'utf8'),context);
const ui=windowMock.MST.Advisory;
assert.equal(ui.tolerance('1E'),238);assert.equal(ui.tolerance('R0'),0);assert.equal(ui.tolerance('YQ'),0);assert.equal(ui.tolerance('UNKNOWN'),null);
assert.ok(windowMock.MST_VARIABLES.jobDescCodes.every(item=>Number.isInteger(item.tol)));
ui.refresh('M1');assert.equal(elements.get('mstSchedulingAdvisory').hidden,false);
assert.ok(ui.messages(ui.check('M1')).some(s=>s.includes('If measured by compliance')));
const editor=fs.readFileSync(require.resolve('../docs/libs/mst-editor-logic.js'),'utf8').replace(/\r\n/g,'\n');
const from=editor.indexOf('  MST.Editor.saveMSTEdits = async function');
const to=editor.indexOf('\n  };',from)+6;
assert.ok(from>=0&&to>from);vm.runInContext(editor.slice(from,to),context);
(async()=>{
  const cancelled=windowMock.MST.Editor.saveMSTEdits('M1');
  assert.equal(mutations,0,'Save must not mutate before acknowledgement');
  dialogs.at(-1).querySelector('[data-after]').onclick();
  assert.ok(dialogs.at(-1).querySelector('.mst-advisory-caption').textContent.includes('Proposed'));
  const chart=dialogs.at(-1).querySelector('.mst-advisory-timeline').children[0];
  assert.ok(chart.children.some(el=>String(el.textContent).includes('01/10/2026')));
  dialogs.at(-1).querySelector('[data-cancel]').onclick();await cancelled;
  assert.equal(mutations,0);assert.equal(dialogs.at(-1).removed,true);
  const accepted=windowMock.MST.Editor.saveMSTEdits('M1');
  assert.equal(await ui.confirmChange('M1'),false,'duplicate modal is rejected');
  dialogs.at(-1).querySelector('[data-proceed]').onclick();await accepted;
  assert.equal(mutations,1,'Proceed applies exactly once');
  const escaped=ui.confirmChange('M1');dialogs.at(-1).events.cancel({preventDefault(){}});assert.equal(await escaped,false);
  windowMock.freqInput.value='28';const count=dialogs.length;assert.equal(await ui.confirmChange('M1'),true);assert.equal(dialogs.length,count,'no popup for unchanged values');
  // Exercise the actual drag handler with the real advisory: moving an instance
  // must reassess backlog without dismissing independent completion concerns.
  vm.runInContext(editor.slice(editor.indexOf('const normalizeDragDate ='), editor.indexOf('const getDragImpactDates =')), context);
  const dropStart = editor.indexOf('  function applyEventDrop(info)');
  vm.runInContext(editor.slice(dropStart, editor.indexOf('\n  window.calendar.render();', dropStart)), context);
  context.U = windowMock.MST.Utils;
  context.E = {};
  context.refreshActiveCalendarFilters = () => {};
  context.triggerResourceChartRefresh = () => {};
  event.id = 'M1_0';
  event.setDates = function(date) { this.start = date; };
  event.setExtendedProp = function(key, value) { this.extendedProps[key] = value; };
  windowMock.mstIdDisplay = { value: 'M1' };
  event.extendedProps.frequency = 14;
  windowMock.freqInput.value = '14';
  function drag(instance, date) {
    context.dropInfo = {
      event: { id: `M1_${instance}`, start: new FixedDate(date), extendedProps: { mstId: 'M1', instance, frequency: 14 } },
      oldEvent: { start: new FixedDate('2026-09-15T09:00:00') },
      revert() { throw new Error('Valid drag unexpectedly reverted'); }
    };
    vm.runInContext('applyEventDrop(dropInfo)', context);
  }
  drag(0, '2026-10-06T09:00:00');
  assert.equal(windowMock.lastDateInput.value, '2026-10-06');
  const advisoryText = () => elements.get('mstSchedulingAdvisory').children.map(el => el.textContent).join(' ');
  assert.ok(!advisoryText().includes('Possible backlog'));
  assert.ok(advisoryText().includes('would be non-compliant'), 'moving LSD cannot clear LPD-based compliance');
  drag(1, '2026-09-20T09:00:00');
  assert.equal(windowMock.lastDateInput.value, '2026-09-06', 'future instance drag updates the effective base date');
  assert.ok(advisoryText().includes('Possible backlog'), 'moving earlier must restore the warning');
  windowMock.originalProps.M1['Last Performed Date'] = '2026-10-01';
  drag(1, '2026-10-20T09:00:00');
  assert.equal(elements.get('mstSchedulingAdvisory').hidden, true, 'hide only when no issues remain');
  console.log('Editor integration, actual-date animation, cancel/Escape/proceed and tolerance mapping passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
