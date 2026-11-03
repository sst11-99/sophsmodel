import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../models-concept.html',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('function appendPaperTape('),source.indexOf("let current='female'"));
const context=vm.createContext({});vm.runInContext(helper,context);
function render(seed='model-a.jpg',scale=1){
 const make=(tag,attrs)=>({tag,attrs,children:[],append(...nodes){this.children.push(...nodes);}});
 const svg=make('svg',{});
 context.appendPaperTape(svg,{paper:[50*scale,70*scale,900*scale,1300*scale],seed,id:'sample'},make);
 return svg;
}
function find(node,predicate){if(predicate(node))return node;for(const child of node.children){const result=find(child,predicate);if(result)return result;}}
test('tape stays identical for the same asset and varies between new assets',()=>{
 assert.equal(JSON.stringify(render()),JSON.stringify(render()));
 assert.notEqual(JSON.stringify(render()),JSON.stringify(render('model-b.jpg')));
});
test('paper tint and bend stay anchored to the paper edge, not strip rotation',()=>{
 for(const key of ['sophie','jennifer','duang','future-model']){
  const svg=render(key),tape=find(svg,n=>n.attrs.class==='card-tape'),paper=find(svg,n=>n.attrs.class==='tape-paper');
  assert.equal(tape.attrs.transform,undefined);
  assert.equal(paper.attrs.y,70);
  const line=find(svg,n=>n.attrs.class==='tape-edge-shadow');
  const nums=line.attrs.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.equal(nums[1],70);assert.equal(nums[5],70);
  assert.ok(nums[3]-70<1);
  assert.ok(find(svg,n=>n.tag==='g'&&n.attrs['clip-path']));
 }
});
test('tape dimensions and ridge thickness scale with the paper',()=>{
 const a=render(),b=render('model-a.jpg',2);
 for(const cls of ['tape-paper','tape-edge-shadow','tape-edge-light']){
  const x=find(a,n=>n.attrs.class===cls),y=find(b,n=>n.attrs.class===cls);
  const field=cls==='tape-paper'?'width':'stroke-width';assert.equal(y.attrs[field],x.attrs[field]*2);
 }
});
