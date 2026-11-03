'use strict';
(()=>{
 const collection='ab0d9e07-d55c-5d27-92da-a8576a1047a3';
 // Remove JPEG metadata without touching compressed pixels. ICC and Adobe colour
 // interpretation markers remain. Rotated sources use an oriented lossless PNG.
 function cleanJpeg(bytes){
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);if(b[0]!==255||b[1]!==216)throw Error('Invalid JPEG');
  const parts=[b.slice(0,2)];let at=2,orientation=1,ended=false;
  while(at<b.length){
   if(b[at]!==255)throw Error('Invalid JPEG marker');const start=at;while(b[at]===255)at++;const marker=b[at++];
   if(marker===217){parts.push(b.slice(start,at));ended=true;break;}
   if(marker===216||marker===0||marker>=208&&marker<=215)throw Error('Invalid JPEG marker');
   const length=b[at]*256+b[at+1],end=at+length;if(length<2||end>b.length)throw Error('Invalid JPEG segment');
   if(marker===225&&String.fromCharCode(...b.slice(at+2,at+8))==='Exif\0\0'){
    const t=at+8,v=new DataView(b.buffer,b.byteOffset+t,end-t),little=v.getUint16(0)===0x4949;
    if(v.getUint16(2,little)!==42)throw Error('Invalid EXIF');const offset=v.getUint32(4,little),count=v.getUint16(offset,little);
    for(let i=0;i<count;i++){const entry=offset+2+i*12;if(v.getUint16(entry,little)===274){orientation=v.getUint16(entry+8,little);break;}}
   }
   const metadata=marker===254||marker>=225&&marker<=239;
   const colour=marker===238||marker===226&&String.fromCharCode(...b.slice(at+2,at+14))==='ICC_PROFILE\0';
   if(!metadata||colour)parts.push(b.slice(start,end));at=end;
   if(marker===218){const scan=at;while(at<b.length){if(b[at]!==255){at++;continue;}let next=at+1;while(b[next]===255)next++;if(b[next]===0||b[next]>=208&&b[next]<=215){at=next+1;continue;}break;}parts.push(b.slice(scan,at));}
  }
  if(!ended)throw Error('Incomplete JPEG');return{blob:new Blob(parts,{type:'image/jpeg'}),orientation};
 }
 const encode=(canvas,type,quality)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not prepare photo')),type,quality));
 async function prepare(file){
  const source=await file.arrayBuffer(),clean=file.type==='image/jpeg'?cleanJpeg(source):null;
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  try{
   if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>80000000)throw Error('Photo is too large to prepare safely.');
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)throw Error('Photo preparation unavailable');
   const variants=[];
   for(const size of [640,1280]){const scale=Math.min(1,size/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);variants.push({name:'display-'+size+'.jpg',blob:await encode(canvas,'image/jpeg',.9)});}
   let full=clean?.orientation===1?clean.blob:null;
   if(!full){canvas.width=bitmap.width;canvas.height=bitmap.height;context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0);full=await encode(canvas,'image/png');}
   if(full.size>80*1024*1024)throw Error('Full-resolution copy is too large. Original has not been uploaded.');
   variants.push({name:full.type==='image/jpeg'?'download.jpg':'download.png',blob:full});
   const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source)),x=>x.toString(16).padStart(2,'0')).join('');
   return{variants,width:bitmap.width,height:bitmap.height,source_sha256:sha,download_type:full.type};
  }finally{bitmap.close();}
 }
 async function upload({file,prepared,api,user,ordinal}){
  const hash=prepared.source_sha256,id=hash.slice(0,8)+'-'+hash.slice(8,12)+'-5'+hash.slice(13,16)+'-a'+hash.slice(17,20)+'-'+hash.slice(20,32);
  const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type],sourceName=id+'.'+extension,sourcePath=collection+'/'+sourceName,prefix=collection+'/website/'+id+'/';
  const existing=(await api('/rest/v1/review_photos?id=eq.'+id))[0];
  const assets=await api('/rest/v1/review_website_assets?photo_id=eq.'+id);
  if(existing&&assets.length)return{id,duplicate:true};
  if(existing&&existing.uploaded_by!==user.id)throw Error('This private photo needs agency preparation before publication.');
  const originalFiles=await api('/storage/v1/object/list/model-review',{method:'POST',body:JSON.stringify({prefix:collection,search:sourceName,limit:100})});
  if(!originalFiles.some(item=>item.name===sourceName))await api('/storage/v1/object/model-review/'+sourcePath,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});
  const existingVariants=await api('/storage/v1/object/list/model-review',{method:'POST',body:JSON.stringify({prefix:prefix.slice(0,-1),limit:10})});
  for(const variant of prepared.variants)if(!existingVariants.some(item=>item.name===variant.name))await api('/storage/v1/object/model-review/'+prefix+variant.name,{method:'POST',headers:{'Content-Type':variant.blob.type,'x-upsert':'false'},body:variant.blob});
  await api('/rest/v1/rpc/register_sophie_website_photo',{method:'POST',body:JSON.stringify({
   p_photo:{id,collection_id:collection,storage_path:sourcePath,original_name:file.name,ordinal},
   p_assets:{collection_id:collection,photo_id:id,display_path:prefix+'display-640.jpg',large_path:prefix+'display-1280.jpg',download_path:prefix+prepared.variants[2].name,download_type:prepared.download_type,width:prepared.width,height:prepared.height,source_sha256:hash}
  })});
  return{id,duplicate:false};
 }
 window.SophieWebsiteVariants={collection,cleanJpeg,prepare,upload};
})();
