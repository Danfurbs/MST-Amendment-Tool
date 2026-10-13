const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let field = { id:'freq',value:'28' }, unload;
const windowMock = { changes:{},createdMSTs:{},addEventListener(name,fn){unload=fn;},confirm(){return false;} };
vm.runInNewContext(fs.readFileSync(require.resolve('../docs/libs/mst-session-guard.js'),'utf8'),{
  window:windowMock,document:{querySelectorAll:()=>[field],getElementById:id=>id==='editForm'?{style:{display:'block'}}:{value:'BATCH'}}
});
const guard=windowMock.MST.SessionGuard;
guard.captureEditor();assert.equal(guard.isDirty(),false);
field.value='14';assert.equal(guard.isDirty(),true);
guard.captureEditor();windowMock.changes.a={frequency:14};
assert.equal(guard.isDirty(),true);assert.equal(guard.confirmReplace(),false);
let prevented=false;unload({preventDefault(){prevented=true;}});assert.equal(prevented,true);
const exported=guard.snapshot();guard.markExported(exported);assert.equal(guard.isDirty(),false);
windowMock.changes.a.frequency=7;assert.equal(guard.isDirty(),true);
guard.markExported(exported);assert.equal(guard.isDirty(),true,'an export in progress must not mark later edits exported');
windowMock.changes={};assert.equal(guard.isDirty(),false);
console.log('Unexported changes and pending editor protection passed');
