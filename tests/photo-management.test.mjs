import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function api() {
  const context = {window:{}};
  const path = new URL('../photo-management.js', import.meta.url);
  if (fs.existsSync(path)) vm.runInNewContext(fs.readFileSync(path,'utf8'),context);
  return context.window.photoManagement;
}
test('moving into an occupied single slot swaps without losing either photo',()=>{
  assert.ok(api(), 'photo management exists');
  const result=api().move(['a','b'],0,['c'],1);
  assert.equal(JSON.stringify(result),JSON.stringify({source:['c','b'],target:['a']}));
});
test('moving into a multi slot appends and a full slot refuses without data loss',()=>{
  assert.ok(api(), 'photo management exists');
  assert.equal(JSON.stringify(api().move(['a'],0,['b'],4)),JSON.stringify({source:[],target:['b','a']}));
  assert.equal(api().move(['a'],0,['b','c','d','e'],4),null);
});
test('removing only the chosen image preserves remaining order',()=>{
  assert.ok(api(), 'photo management exists');
  assert.equal(JSON.stringify(api().remove(['a','b','c'],1)),JSON.stringify(['a','c']));
});
