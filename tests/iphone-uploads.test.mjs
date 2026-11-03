import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function api() {
  const context={window:{},File,Blob};
  vm.runInNewContext(await readFile(new URL('../photo-conversion.js',import.meta.url),'utf8'),context);
  return context.window.modelingPhotos;
}
test('HEIC is converted to a JPEG file; ordinary JPEG is unchanged',async()=>{
  const {preparePhoto}=await api();
  const jpg=new File(['jpeg'],'photo.jpg',{type:'image/jpeg'});
  assert.equal(await preparePhoto(jpg),jpg);
  const heic=new File(['heic'],'IMG_1234.HEIC',{type:''});
  const converted=await preparePhoto(heic,async()=>new Blob(['jpeg'],{type:'image/jpeg'}));
  assert.equal(converted.type,'image/jpeg');
  assert.equal(converted.name,'IMG_1234.jpg');
  assert.equal(await converted.text(),'jpeg');
});
test('HEIF types work and bad or oversized conversion output is rejected',async()=>{
  const {preparePhoto}=await api();
  const file=new File(['heif'],'camera.heif',{type:'image/heif'});
  await assert.rejects(preparePhoto(file,async()=>new Blob(['bad'],{type:'text/plain'})),/convert/i);
  await assert.rejects(preparePhoto(file,async()=>new Blob([new Uint8Array(6*1024*1024)],{type:'image/jpeg'})),/5 MB/);
  await assert.rejects(preparePhoto(new File(['x'],'bad.pdf',{type:'application/pdf'})),/JPG/);
});
test('all seven upload slots accept HEIC and catalogue and application have language switches',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.equal((html.match(/accept="[^"]*\.heic[^"]*"/g)||[]).length,7);
  assert.equal((html.match(/data-segmented="language"/g)||[]).length,2);
});

test('Android camera files without a MIME type are normalized',async()=>{
 const {preparePhoto,needsPreparation}=await api();
 const file=new File(['jpeg'],'camera.JPG',{type:''});
 assert.equal(needsPreparation(file),true);
 const result=await preparePhoto(file);
 assert.equal(result.type,'image/jpeg');assert.equal(await result.text(),'jpeg');
});
test('large Android JPEGs resize on-device and resizing is serialized',async()=>{
 const {preparePhoto,needsPreparation}=await api();
 const file=new File([new Uint8Array(6*1024*1024)],'camera.jpg',{type:'image/jpeg'});
 let active=0,peak=0,calls=0;
 const resize=async()=>{active++;peak=Math.max(peak,active);calls++;await new Promise(r=>setTimeout(r,2));active--;return new File(['small'],'camera.jpg',{type:'image/jpeg'});};
 assert.equal(needsPreparation(file),true);
 const results=await Promise.all([preparePhoto(file,undefined,resize),preparePhoto(file,undefined,resize)]);
 assert.equal(peak,1);assert.equal(calls,2);assert.equal(results[0].size,5);
});
test('failed photo resizing leaves a later retry possible',async()=>{
 const {preparePhoto}=await api();const file=new File([new Uint8Array(6*1024*1024)],'camera.jpg',{type:'image/jpeg'});
 await assert.rejects(preparePhoto(file,undefined,async()=>{throw new Error('decode failed')}),/decode failed/);
 assert.equal((await preparePhoto(file,undefined,async()=>new File(['ok'],'camera.jpg',{type:'image/jpeg'}))).size,2);
});
test('review uploads preserve professional JPEG and WebP and allow high-quality HEIC output',async()=>{
 const {prepareReviewPhoto}=await api();
 const jpg=new File([new Uint8Array(8*1024*1024)],'professional.jpg',{type:'image/jpeg'});
 const webp=new File(['webp'],'photo.webp',{type:'image/webp'});
 assert.equal(await prepareReviewPhoto(jpg),jpg);assert.equal(await prepareReviewPhoto(webp),webp);
 const heic=new File(['heic'],'camera.HEIC',{type:'image/heic'});
 const jpeg=await prepareReviewPhoto(heic,async()=>new Blob([new Uint8Array(8*1024*1024)],{type:'image/jpeg'}));
 assert.equal(jpeg.size,8*1024*1024);assert.equal(jpeg.name,'camera.jpg');
 await assert.rejects(prepareReviewPhoto(heic,async()=>new Blob(['x'],{type:'text/plain'})),/convert/);
 await assert.rejects(prepareReviewPhoto(new File([new Uint8Array(26*1024*1024)],'large.jpg',{type:'image/jpeg'})),/25 MB/);
});
