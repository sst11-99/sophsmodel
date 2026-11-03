'use strict';
(()=>{
 const C=ReviewChoiceState,config=window.modelingSupabaseConfig;
 const demo=new URLSearchParams(location.search).get('example')==='1';
 const demoKey='sophs-review-example-v1';let user=null,collection=null,membership=null,agency={},model={},revisions={},records=[],photoRows=[],photoList=[],links=[],current='model',reload=null,conflicted=false;
 const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 const labels={decision:'Decision',types:'Categories',uses:'Use',frame:'Framing',angle:'Angle',makeup:'Makeup',footwear:'Footwear',clothing:'Clothing',smile:'Smile',notes:'Notes',labelsReviewed:'Labels confirmed',position:'Order'};
 const presets={'CU-01':{frame:'close-up',angle:'front'},'ML-01':{frame:'mid-length',angle:'front'},'PF-01':{frame:'close-up',angle:'side'},'FL-01':{frame:'full-length',angle:'front'},'JN-01':{frame:'full-length',angle:'front',clothing:'jeans'}};
 const ownSide=()=>demo?'model':membership?.role==='agency'?'agency':'model';
 const writable=()=>demo?current!=='compare':current===ownSide();
 const selected=()=>current==='agency'?C.effective(agency,{}):C.effective(agency,model);
 async function api(path,options={}){
  const token=await ModelAuth.token();if(!token)throw Error('Sign in again to save.');
  const r=await fetch(config.url+path,{...options,headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers}});
  if(!r.ok)throw Error(r.status===401?'Your session expired. Sign in again.':'Your collection could not be saved.');
  if(r.status===204)return null;return r.json();
 }
 function example(){
  const assets=['cu-01-v2.jpg','pf-01-v2.jpg','fl-01-v2.jpg','jn-01-v2.jpg','sophie-trau-000-web.jpg'];
  photoList=assets.map((image,i)=>({filename:'example-'+(i+1),date:'',image:'assets/'+image,original_name:'Example photo'}));
  agency=Object.fromEntries(photoList.map((p,i)=>[p.filename,C.choice({decision:'keep',types:['digitals'],frame:i<2?'close-up':i===4?'mid-length':'full-length',angle:i===1?'side':'front',position:i,labelsReviewed:true})]));
  try{const saved=JSON.parse(localStorage.getItem(demoKey)||'null');if(saved){agency=saved.agency||agency;model=saved.model||{};}}catch{}
  collection={id:'example',name:'Example',title:'Example photos'};
  document.querySelector('#portal-identity').textContent='Example · saves in this browser only';
  document.querySelector('#collaboration-help').textContent='Try both versions. Example choices are kept on this browser, separate from real model records.';
 }
 async function allRows(path){
  const rows=[];for(let offset=0;;offset+=500){const page=await api(path+'&limit=500&offset='+offset);rows.push(...page);if(page.length<500)return rows;}
 }
 async function loadCollection(id){
  photoRows=await allRows('/rest/v1/review_photos?collection_id=eq.'+encodeURIComponent(id)+'&order=ordinal.asc,id.asc');
  records=await allRows('/rest/v1/review_choices?collection_id=eq.'+encodeURIComponent(id)+'&order=photo_id.asc,side.asc');
  agency={};model={};revisions={};
  for(const r of records){(r.side==='agency'?agency:model)[r.photo_id]=C.choice(r.selection);revisions[r.side+':'+r.photo_id]=r.revision;}
  photoList=[];
  for(let offset=0;offset<photoRows.length;offset+=100){
   const batch=photoRows.slice(offset,offset+100),signed=await api('/storage/v1/object/sign/model-review',{method:'POST',body:JSON.stringify({expiresIn:86400,paths:batch.map(p=>p.storage_path)})});
   const urls=new Map(signed.map(s=>[s.path,s]));
   for(const p of batch){const s=urls.get(p.storage_path);if(!s?.signedURL||s.error)throw Error('A photo could not load. Please contact SOPHS.');photoList.push({filename:p.id,date:p.photo_date||'',image:encodeURI(config.url+'/storage/v1'+s.signedURL),original_name:p.original_name});}
  }
  links=await api('/rest/v1/review_links?collection_id=eq.'+encodeURIComponent(id)+'&order=created_at.asc');
 }
 const ready=(async()=>{
  if(demo){example();return;}
  user=await ModelAuth.current();if(!user){location.replace('model-login.html');throw Error('Sign in to see your photos.');}
  const memberships=await api('/rest/v1/review_members?select=collection_id,role');
  const collections=await api('/rest/v1/review_collections?select=id,name&order=name.asc');
  if(!collections.length)throw Error('Your collection is not ready. Please contact Sophs Model.');
  collection=collections[0];membership=memberships.find(m=>m.collection_id===collection.id);current=ownSide();
  document.querySelector('#portal-identity').textContent=user.email+' · '+membership.role;
  if(membership.role==='agency')document.querySelector('[data-review-side="model"]').textContent='Model version';
  const picker=document.querySelector('#collection-picker');
  for(const c of collections){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;picker.append(o);}
  document.querySelector('#collection-picker-label').hidden=collections.length<2;
  picker.onchange=async()=>{if(window.reviewHasPending?.()){picker.value=collection.id;return;}try{collection=collections.find(c=>c.id===picker.value);membership=memberships.find(m=>m.collection_id===collection.id);current=ownSide();await loadCollection(collection.id);await reload?.();}catch(error){document.querySelector('#collaboration-summary').textContent=error.message;}};
  await loadCollection(collection.id);
 })();
 async function persist(name,selection){
  if(!writable()||conflicted)throw Error('This is a read-only comparison.');
  const side=demo?current:ownSide(),value=C.choice(selection),target=side==='agency'?agency:model;
  if(demo){target[name]=value;localStorage.setItem(demoKey,JSON.stringify({agency,model}));return value;}
  const revision=revisions[side+':'+name];
  const body={collection_id:collection.id,photo_id:name,side,selection:value,actor_user_id:user.id};
  try{
   const rows=await api('/rest/v1/review_choices'+(revision?'?collection_id=eq.'+collection.id+'&photo_id=eq.'+name+'&side=eq.'+side+'&revision=eq.'+revision:''),{method:revision?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(revision?{selection:value,actor_user_id:user.id}:body)});
   if(!rows.length)throw Error('Conflict');target[name]=rows[0].selection;revisions[side+':'+name]=rows[0].revision;records=records.filter(r=>!(r.photo_id===name&&r.side===side));records.push(rows[0]);return target[name];
  }catch(error){conflicted=true;document.querySelector('#collaboration-summary').textContent='This version may have changed elsewhere. Reload before editing again.';throw error;}
 }
 window.modelReviewTransport=async(path,options={})=>{
  try{
   await ready;
   const body=options.body&&typeof options.body==='string'?JSON.parse(options.body):{};
   if(path==='/api/photos')return result({profile:{name:collection.name,title:collection.title||collection.name+'’s photos',initial_view:'all'},photos:photoList,selections:selected(),suggestions:agency,links});
   if(path==='/api/selection'){const value=await persist(body.filename,body.selection);return result({selection:value});}
   if(path==='/api/batch'){
    const state=selected(),updates={};for(const name of body.filenames){const choice=C.choice(state[name]);if(body.category)choice.types=[...new Set([...choice.types,body.category])];if(presets[body.shot])Object.assign(choice,presets[body.shot]);choice.labelsReviewed=true;updates[name]=await persist(name,choice);}return result({selections:updates});
   }
   if(path==='/api/apply-suggestions'){
    const state=selected();if(photoList.some(p=>C.choice(state[p.filename]).decision==='unreviewed'))throw Error('Keep or reject every photo first.');
    let applied=0,preserved=0,missing=0;const updates={};
    for(const p of photoList){const s=C.choice(state[p.filename]);if(!['keep','favourite'].includes(s.decision))continue;if(s.labelsReviewed){preserved++;continue;}if(!agency[p.filename]){missing++;continue;}updates[p.filename]=await persist(p.filename,{...C.choice(agency[p.filename]),decision:s.decision,notes:s.notes,labelsReviewed:false});applied++;}
    return result({selections:updates,applied,preserved,missing});
   }
   if(path==='/api/link'){
    if(!writable())throw Error('Choose your version to add a link.');const url=new URL(body.url);if(!['https:','http:'].includes(url.protocol))throw Error('Use a web link.');const link={url:url.href,title:body.title||url.hostname};
    if(!demo)await api('/rest/v1/review_links',{method:'POST',body:JSON.stringify({...link,collection_id:collection.id,actor_user_id:user.id})});links.push(link);return result({link,duplicate:false});
   }
   if(path==='/api/upload'){
    if(demo)return result({error:'Example photos stay separate. Sign in to upload to your own collection.'},400);
    if(!writable())throw Error('Choose your version to upload.');
    const file=options.body;if(file.size>25*1024*1024||!['image/jpeg','image/png','image/webp'].includes(options.headers['Content-Type']))throw Error('Use JPG, PNG or WebP, up to 25 MB.');
    const id=crypto.randomUUID(),name=decodeURIComponent(options.headers['X-Filename']),extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[options.headers['Content-Type']],storagePath=collection.id+'/'+id+'.'+extension;
    await api('/storage/v1/object/model-review/'+storagePath,{method:'POST',headers:{'Content-Type':options.headers['Content-Type'],'x-upsert':'false'},body:file});
    await api('/rest/v1/review_photos',{method:'POST',body:JSON.stringify({id,collection_id:collection.id,storage_path:storagePath,original_name:name,ordinal:photoRows.length,uploaded_by:user.id})});
    await loadCollection(collection.id);return result({photo:photoList.find(p=>p.filename===id),duplicate:false});
   }
   return result({error:'Unknown operation.'},404);
  }catch(error){return result({error:error.message},409);}
 };
 window.reviewOrdered=shown=>{const state=selected(),order=new Map(photoList.map((p,i)=>[p.filename,i]));return [...shown].sort((a,b)=>(C.choice(state[a.filename]).position??order.get(a.filename))-(C.choice(state[b.filename]).position??order.get(b.filename)));};
 window.reviewDecorate=(card,p,s,save)=>{
  const own=current==='agency'?agency:model,agencyChoice=C.choice(agency[p.filename]),modelChoice=C.choice(model[p.filename]||agency[p.filename]);
  const stamp=document.createElement('p');stamp.className='choice-provenance';const row=records.find(r=>r.photo_id===p.filename&&r.side===(current==='agency'?'agency':'model'));
  stamp.textContent=Object.hasOwn(own,p.filename)?(current==='agency'?'Agency version':'Model version')+(row?(row.actor_user_id?' · '+new Date(row.updated_at).toLocaleString():' · imported'):''):'Agency suggestion · not changed by model';card.append(stamp);
  if(current==='compare'){
   const box=document.createElement('div');box.className='choice-difference';const changes=C.differences(agencyChoice,modelChoice);
   if(!changes.length)box.textContent='No difference';
   for(const key of changes){const line=document.createElement('p');const format=v=>Array.isArray(v)?v.join(', ')||'None':v===undefined?'Original order':typeof v==='boolean'?(v?'Yes':'No'):String(v===undefined||v===null||v===''?'None':v);line.textContent=(labels[key]||key)+': Agency '+format(agencyChoice[key])+' → Model '+format(modelChoice[key]);box.append(line);}card.append(box);
  }
  if(!writable()||conflicted)for(const b of card.querySelectorAll('.actions button,.pick input,.reorder button'))b.disabled=true;
  else{
   const row=document.createElement('div');row.className='reorder';
   for(const [direction,label] of [[-1,'Move earlier'],[1,'Move later']]){const b=document.createElement('button');b.textContent=direction<0?'↑':'↓';b.setAttribute('aria-label',label+' '+p.original_name);b.onclick=async()=>{const ordered=window.reviewOrdered(photoList),at=ordered.findIndex(x=>x.filename===p.filename),other=ordered[at+direction];if(!other)return;const all=selected(),a=C.choice(all[p.filename]),o=C.choice(all[other.filename]);const ok=await save(p,{...a,position:at+direction});if(ok)await save(other,{...o,position:at});};row.append(b);}card.append(row);
  }
 };
 window.reviewAfterRender=()=>{
  let differences=0;for(const p of photoList)if(C.differences(agency[p.filename],model[p.filename]||agency[p.filename]).length)differences++;
  document.querySelector('#collaboration-summary').textContent=(conflicted?'Reload before editing. ':demo?'Example only. ':'')+differences+(differences===1?' photo differs':' photos differ')+' between agency and model.';
  for(const b of document.querySelectorAll('[data-review-side]'))b.setAttribute('aria-pressed',String(b.dataset.reviewSide===current));
  document.getElementById('add-media').disabled=!writable()||conflicted;
  for(const id of ['apply-bulk','confirm-review','select-visible','clear-selected'])if(!writable()||conflicted)document.getElementById(id).disabled=true;
 };
 window.reviewActivate=fn=>{reload=fn;for(const b of document.querySelectorAll('[data-review-side]'))b.onclick=async()=>{if(window.reviewHasPending?.())return;current=b.dataset.reviewSide;await reload();};};
})();
