import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

async function setup(kind = 'contact') {
  const events = {}, selectEvents = {}, appended = [];
  const names = kind === 'contact' ? ['Line','WhatsApp','Phone'] : ['Instagram','TikTok','Facebook'];
  const buttons = names.map(name => ({dataset:{channelValue:name},setAttribute(){}}));
  const input = {name:kind,value:'',validationMessage:'',setCustomValidity(message){this.validationMessage=message;},setAttribute(name,value){this[name]=value;},addEventListener:(name,fn)=>{events[name]=fn;}};
  const select = {value:names[0],options:names.map(value=>({value})),addEventListener:(name,fn)=>{selectEvents[name]=fn;}};
  const field = {querySelector:s=>s==='select'?select:input,querySelectorAll:()=>buttons,append:el=>appended.push(el)};
  const document = {querySelectorAll:()=>[field],createElement:()=>({dataset:{},setAttribute(){}})};
  const window = {modelingLocale:{t:x=>x},addEventListener(){}};
  const source = await readFile(new URL('../channel-fields.js',import.meta.url),'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
  vm.runInNewContext(source,{document,window});
  const type=value=>{input.value=value;events.input?.();};
  const choose=value=>{select.value=value;selectEvents.change?.();};
  const values=()=>Object.fromEntries(appended.filter(e=>e.type==='hidden').map(e=>[e.name,e.value]));
  return {input,type,choose,values,field,buttons};
}

test('contact channels restore their own entries without stacking visible fields',async()=>{
  const {input,type,choose,values}=await setup();
  type('line-id');choose('WhatsApp');assert.equal(input.value,'');
  type('+661234');choose('Line');assert.equal(input.value,'line-id');
  assert.deepEqual(values(),{contactLine:'line-id',contactWhatsApp:'+661234',contactPhone:''});
});
test('one completed contact satisfies the group even when the active tab is blank',async()=>{
  const {input,type,choose}=await setup();
  assert.equal(input.required,true);
  type('line-id');choose('Phone');assert.equal(input.required,false);
  choose('Line');type('');assert.equal(input.required,true);
});
test('phone platforms use telephone autofill, Line does not',async()=>{
  const {input,choose}=await setup();
  assert.equal(input.autocomplete,'off');
  choose('WhatsApp');assert.equal(input.inputmode,'tel');assert.equal(input.autocomplete,'section-whatsapp tel');
  choose('Line');assert.equal(input.inputmode,'text');
});
test('social channels remain independent and clearing one preserves the other',async()=>{
  const {input,type,choose,values,buttons}=await setup('social');
  type('instagram-id');choose('TikTok');type('tiktok-id');choose('Instagram');type('');
  assert.equal(values().socialTikTok,'tiktok-id');
  assert.equal(values().socialInstagram,'');
  assert.equal(buttons[1].dataset.added,'true');
  assert.equal(input.required,false);
});
test('a final commit captures autofill that did not dispatch input',async()=>{
  const {input,field,values}=await setup();
  input.value='autofilled';field.commitChannel?.();
  assert.equal(values().contactLine,'autofilled');
});
test('whitespace is not a contact, but a filled alternative clears the group error',async()=>{
  const {input,type,choose}=await setup();
  type('   ');assert.notEqual(input.validationMessage,'');
  choose('Phone');type('+661234');assert.equal(input.validationMessage,'');
  choose('Line');assert.equal(input.validationMessage,'');
});
