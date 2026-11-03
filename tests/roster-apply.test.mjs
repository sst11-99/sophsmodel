import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../models-concept.html',import.meta.url),'utf8');
const select=source.slice(source.indexOf('function select('),source.indexOf('\nbuttons.forEach(button=>button.addEventListener'));
const finish=source.slice(source.indexOf('function finish(event,'),source.indexOf("tabs.addEventListener('pointerup'"));
function setup(embedded=true){
 const calls=[],timers=new Map();let sequence=0;
 const buttons=['female','male','apply'].map(division=>({dataset:{division},setAttribute(k,v){this[k]=v;}}));
 const window={location:{assign:url=>calls.push(['location',url])}};
 window.parent=embedded?{modelingNavigate:v=>calls.push(['navigate',v]),modelingSetDivision:v=>calls.push(['division',v])}:window;
 const ctx=vm.createContext({window,buttons,current:'female',settleTimer:null,gesture:null,suppressClick:false,tabs:{classList:{remove(){}},style:{setProperty(){}},hasPointerCapture:()=>false},render:v=>calls.push(['render',v]),matchMedia:()=>({matches:false}),setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(select+'\n'+finish,ctx);
 const flush=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(f=>f());};
 return {ctx,calls,flush,buttons};
}
test('Apply opens automatically and retains the previously selected male division',()=>{
 const t=setup();t.ctx.select('male',true);t.ctx.select('apply');t.flush();
 assert.equal(t.ctx.current,'male');assert.deepEqual(t.calls.at(-1),['navigate','apply']);
 assert.equal(t.buttons[1]['aria-pressed'],'true');
 assert.ok(!t.calls.some(([kind,value])=>kind==='division'&&value==='apply'));
});
test('swiping to the far-right stop opens Apply; cancelled swipe does not',()=>{
 const t=setup();t.ctx.gesture={id:1,moved:true,position:2};t.ctx.finish({pointerId:1});t.flush();assert.deepEqual(t.calls.at(-1),['navigate','apply']);
 const cancelled=setup();cancelled.ctx.gesture={id:1,moved:true,position:2};cancelled.ctx.finish({pointerId:1},true);cancelled.flush();assert.ok(!cancelled.calls.some(([k])=>k==='navigate'));
});
test('leaving Apply before settling cancels navigation',()=>{
 const t=setup();t.ctx.select('apply');t.ctx.select('female');t.flush();assert.ok(!t.calls.some(([k])=>k==='navigate'));
});
test('standalone roster routes Apply to the application page',()=>{
 const t=setup(false);t.ctx.select('apply');t.flush();assert.deepEqual(t.calls.at(-1),['location','./#apply']);
});
