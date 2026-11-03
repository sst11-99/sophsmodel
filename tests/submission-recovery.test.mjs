import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../backend.js',import.meta.url),'utf8');
const id='10000000-0000-4000-8000-000000000001';
const payload={id,confirmed_accurate_and_adult:true,application_data_use_consent:true};
const photos=['face','profile'].map(slot=>({slot,file:{name:'test.jpg',type:'image/jpeg',size:100}}));
const response=(status=200,data={})=>({ok:status>=200&&status<300,status,json:async()=>data});
function setup(fetch){
 const context={window:{modelingSupabaseConfig:{url:'https://example.invalid',publishableKey:'test',bucket:'model-applications'}},fetch,AbortController,setTimeout:(fn,ms)=>ms===45000?0:setTimeout(fn,0),clearTimeout};
 vm.runInNewContext(source,context);return context.window.modelingBackend;
}
const options=()=>({attempt:{id,token:'a'.repeat(64),tokenHash:'b'.repeat(64),uploaded:{}},persist:async()=>{}});
test('partial upload resumes without repeating acknowledged photos',async()=>{
 let fail=true,face=0,profile=0,inserts=0;
 const backend=setup(async url=>{
  if(url.includes('/face.')){face++;return response();}
  if(url.includes('/profile.')){profile++;if(fail)return response(403);return response();}
  if(url.endsWith('application_receipt'))return response(200,true);
  inserts++;return response(201);
 });
 const opts=options();await assert.rejects(backend.submitApplication(payload,photos,opts));
 assert.equal(inserts,0);fail=false;
 assert.equal((await backend.submitApplication(payload,photos,opts)).confirmed,true);
 assert.equal(face,1);assert.equal(profile,2);assert.equal(inserts,1);
});
test('lost photo acknowledgement and committed insert timeout recover using the same receipt',async()=>{
 let uploaded=0,inserts=0;
 const backend=setup(async url=>{
  if(url.includes('/storage/')){if(++uploaded===1)throw new TypeError('network');return response(400,{statusCode:409,error:'Duplicate'});}
  if(url.endsWith('application_receipt'))return response(200,true);
  inserts++;if(inserts===1)throw new TypeError('network');return response(409,{code:'23505'});
 });
 const result=await backend.submitApplication(payload,photos.slice(0,1),options());
 assert.equal(result.confirmed,true);assert.equal(result.id,id);assert.equal(uploaded,2);assert.equal(inserts,2);
});
test('a successful insert response never means success without a verified receipt',async()=>{
 const backend=setup(async url=>response(200,url.endsWith('application_receipt')?false:{}));
 await assert.rejects(backend.submitApplication(payload,photos,options()),/not confirmed/);
});
test('receipt connection failure never produces success',async()=>{
 let checks=0;
 const backend=setup(async url=>{if(url.endsWith('application_receipt')){checks++;throw new TypeError('offline');}return response();});
 await assert.rejects(backend.submitApplication(payload,photos,options()),/offline/);
 assert.equal(checks,3);
});
test('permission errors do not loop or insert an incomplete application',async()=>{
 let requests=0;const backend=setup(async()=>{requests++;return response(403);});
 await assert.rejects(backend.submitApplication(payload,photos,options()));assert.equal(requests,1);
});
test('malformed receipt cannot be treated as truthy success',async()=>{
 const backend=setup(async()=>response(200,{received:true}));
 await assert.rejects(backend.checkReceipt(options().attempt),/could not confirm/);
});
