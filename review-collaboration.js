'use strict';
(()=>{
 const C=ReviewChoiceState,config=window.modelingSupabaseConfig;
 const localFixture=window.sophsLocalFixture;
 const demo=!!localFixture||new URLSearchParams(location.search).get('example')==='1';
 const demoKey=localFixture?(localFixture.storageKey||'sophs-review-local-fixture-v1'):'sophs-review-example-v1';let user=null,collection=null,membership=null,agency={},model={},revisions={},records=[],photoRows=[],photoList=[],links=[],current='agency',reload=null,conflicted=false;
 const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 const labels={decision:'Decision',types:'Categories',uses:'Use',frame:'Framing',angle:'Angle',makeup:'Makeup',footwear:'Footwear',clothing:'Clothing',smile:'Smile',notes:'Notes',labelsReviewed:'Labels confirmed',position:'Order'};
 const presets={'CU-01':{frame:'close-up',angle:'front'},'ML-01':{frame:'mid-length',angle:'front'},'PF-01':{frame:'close-up',angle:'side'},'FL-01':{frame:'full-length',angle:'front'},'JN-01':{frame:'full-length',angle:'front',clothing:'jeans'}};
 const ownSide=()=>demo?(localFixture?.role||'model'):membership?.role==='agency'?'agency':'model';
 const writable=()=>demo?current!=='compare':current===ownSide();
 const sideChoice=(side,name)=>C.choice(side===ownSide()&&sync?.snapshot()[name]?.desired||(side==='agency'?agency:model)[name]);
 const mutual=p=>sideChoice('agency',p.filename).decision==='favourite'&&sideChoice('model',p.filename).decision==='favourite';
 let orderSync=null,orderJournal=null,orderAvailable=false,localOrder=null,orderScope=null;
 let sync=null,journal=null,journalScope=null,collectionEpoch=0,dataCollection=null,mediaRequest=0;
 const selected=()=>{
  const state=current==='agency'?Object.fromEntries(Object.entries(agency).map(([k,v])=>[k,C.choice(v)])):C.effective(agency,model);
  if(sync&&current===ownSide())for(const [name,job] of Object.entries(sync.snapshot()))state[name]=C.choice(job.desired);
  return state;
 };
 function updateRow(row,epoch=collectionEpoch){
  if(!row||epoch!==collectionEpoch||row.collection_id&&row.collection_id!==collection?.id)return;
  const key=row.side+':'+row.photo_id;if(revisions[key]!==undefined&&row.revision<=revisions[key])return;
  const target=row.side==='agency'?agency:model;target[row.photo_id]=C.choice(row.selection);revisions[key]=row.revision;
  records=records.filter(r=>!(r.photo_id===row.photo_id&&r.side===row.side));records.push(row);
 }
 let choiceJobs={},choiceReady=false,choiceOthers=0,orderOthers=0,orderJob=null,saveError='',finalRejectErrors={},orderLoadError='',orderSaveError='';
 let orderAcknowledgement=0,savedUntil=0,savedTimer=null;
 function savingNotice(){
  const finalRejectError=Object.values(finalRejectErrors)[0]||'';
  const jobs=[...Object.values(choiceJobs),...(orderJob?[orderJob]:[])];
  const status=document.querySelector('#sync-status');
  const durable=(queue,key)=>{if(!queue.length)return true;try{const saved=JSON.parse(localStorage.getItem(key)||'{}');return queue.every(job=>Object.values(saved).some(item=>item.id===job.id&&item.generation===job.generation&&JSON.stringify(item.desired)===JSON.stringify(job.desired)));}catch{return false;}};
  const retained=durable(Object.values(choiceJobs),journal?.key)&&durable(orderJob?[orderJob]:[],orderJournal?.key);
  if(jobs.length||finalRejectError||saveError||orderSaveError||orderLoadError||choiceOthers||orderOthers||!retained||navigator.onLine===false){savedUntil=0;clearTimeout(savedTimer);}
  status.textContent=finalRejectError?finalRejectError:saveError?saveError:orderSaveError?orderSaveError:orderLoadError?orderLoadError:jobs.some(job=>job.status==='conflict')?(orderJob?.status==='conflict'?'Order changed elsewhere. Choose which order to keep.':'Choices changed elsewhere. Review them on your version.'):choiceOthers||orderOthers?'Changes remain in another tab. Close that tab, then recover them here.':!retained?'Changes could not be saved on this device. Retry before leaving.':navigator.onLine===false?(jobs.length?'Offline — changes saved on this device':'Offline'):jobs.some(job=>job.error)?(jobs.some(job=>/sign in|session expired|refresh.token|invalid.*token/i.test(job.error||''))?'Sign in again to save. Changes remain on this device.':'Could not save changes. Retry.'):jobs.length?'Saving…':demo?'Example changes saved on this device':choiceReady&&orderAvailable?(Date.now()<savedUntil?'Saved':'All changes saved'):'Checking saved changes…';
  status.setAttribute?.('data-order-saved',status.textContent==='Saved'?'true':'false');
 }
 window.reviewSaveFeedback=(text,state)=>{saveError=state==='error'?text:'';savingNotice();};
 function syncNotice(jobs){
  choiceJobs=jobs;
  const pending=Object.values(jobs);
  const status=document.querySelector('#sync-status');
  let otherPending=0;
  if(journalScope)for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(journalScope+':')&&key!==journal?.key){try{otherPending+=Object.keys(JSON.parse(localStorage.getItem(key)||'{}')).length;}catch{}}}
  choiceOthers=otherPending;
  const recover=document.querySelector('#sync-recover');recover.hidden=!otherPending||!!pending.length;recover.onclick=()=>startSync().catch(error=>{status.textContent=error.message;});
  savingNotice();
  document.querySelector('#sync-retry').hidden=!pending.length;
  if(reload)void reload();
 }
 function orderState(){return demo?localOrder:orderSync?.state().order;}
 function orderNotice(state={}){
  const status=document.querySelector('#sync-status');if(!status)return;
  const job=state.job;orderJob=job;
  if(job){savedUntil=0;clearTimeout(savedTimer);}
  if(state.acknowledgement>orderAcknowledgement){
   orderAcknowledgement=state.acknowledgement;
   if(!job&&!Object.keys(choiceJobs).length&&!saveError&&!orderSaveError&&!orderLoadError&&!choiceOthers&&!orderOthers&&navigator.onLine!==false){savedUntil=Date.now()+1400;clearTimeout(savedTimer);savedTimer=setTimeout(()=>{savedUntil=0;savingNotice();},1400);}
  }
  let otherPending=0;if(orderScope)for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(orderScope+':')&&key!==orderJournal?.key){try{otherPending+=Object.keys(JSON.parse(localStorage.getItem(key)||'{}')).length;}catch{}}}
  orderOthers=otherPending;savingNotice();
  const retryButton=document.querySelector('#order-retry');retryButton.hidden=job?.status==='conflict'||!job&&!otherPending;retryButton.textContent=!job&&otherPending?'Recover order':'Retry order';retryButton.onclick=()=>!job&&otherPending?startOrder():orderSync?.flush();
  for(const [id,useLocal] of [['order-use-saved',false],['order-use-mine',true]]){const button=document.querySelector('#'+id);button.hidden=job?.status!=='conflict';button.onclick=()=>orderSync.resolve(useLocal).catch(error=>{status.textContent=error.message;});}
  if(reload)void reload();
 }
 async function refreshOrder(){
  const controller=orderSync,epoch=collectionEpoch;if(!controller)return;
  await controller.refresh();
  if(controller===orderSync&&epoch===collectionEpoch){orderLoadError='';orderAvailable=true;orderNotice(controller.state());}
 }
 async function startOrder(){
  if(demo){orderAvailable=true;savingNotice();return;}
  if(orderSync?.queue.running)return;
  if(orderSync&&(orderSync.hasPending()||!orderAvailable)){
   try{await refreshOrder();}catch(error){orderLoadError='Could not load the saved order. Retry.';savingNotice();const retry=document.querySelector('#order-retry');retry.hidden=false;retry.onclick=startOrder;}return;
  }
  // Legacy test harnesses omit the optional order module; the browser loader requires it.
  if(typeof SharedReviewOrder==='undefined')return;
  const epoch=collectionEpoch,id=collection.id,actor=user.id,active=()=>epoch===collectionEpoch&&collection.id===id;
  orderAvailable=false;orderAcknowledgement=0;savedUntil=0;clearTimeout(savedTimer);orderJournal?.release();savingNotice();
  try{
   orderScope='sophs-review-order-v1:'+actor+':'+id;
   const claimed=await ReviewJournal.claim({storage:localStorage,scope:orderScope,locks:navigator.locks});
   if(!active()){claimed.release();return;}orderJournal=claimed;
   const query='/rest/v1/review_orders?collection_id=eq.'+encodeURIComponent(id);
   const convert=row=>row?{revision:row.revision,selection:{ids:row.photo_ids,manual:true}}:null;
   const next=new SharedReviewOrder({storage:localStorage,key:claimed.key,online:()=>active()&&navigator.onLine!==false,
    read:async()=>convert((await api(query))[0]),
    write:async(selection,revision)=>{
     if(!active())throw Error('Collection changed; order retained.');
     const body={photo_ids:selection.ids,actor_user_id:actor,...(revision===null?{collection_id:id}:{})};
     return convert((await api(query+(revision===null?'':'&revision=eq.'+revision),{method:revision===null?'POST':'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)}))[0]);
    },notify:state=>{if(active())orderNotice(state);}});
   orderSync=next;await next.refresh();if(active()){orderLoadError='';orderAvailable=true;orderNotice(next.state());if(initialized)void reload?.();}
  }catch(error){if(active()){orderLoadError='Could not load the saved order. Retry.';savingNotice();const button=document.querySelector('#order-retry');button.hidden=false;button.onclick=startOrder;}}
 }
 function moveShared(photo,before){
  if(current!=='compare')return {status:'unchanged'};
  orderSaveError='';
  if(!orderAvailable)return {status:'error',message:'Shared order unavailable.'};
  const visible=window.reviewOrdered(photoList).map(p=>p.filename),visibleSet=new Set(visible);
  let visibleIndex=0;
  const ids=sharedPhotos(photoList).map(p=>visibleSet.has(p.filename)?visible[visibleIndex++]:p.filename);
  if(!ids.includes(photo)||before!==null&&!ids.includes(before))return {status:'unchanged'};
  if(photo===before)return {status:'unchanged'};
  if(demo){const next=ids.filter(id=>id!==photo);next.splice(before===null?next.length:next.indexOf(before),0,photo);
   if(next.every((id,i)=>id===ids[i]))return {status:'unchanged'};
   const value={ids:next,manual:true};try{localStorage.setItem((localFixture?.orderKey||'sophs-review-local-order-v1'),JSON.stringify(value));localOrder=value;savingNotice();void reload?.();return {status:'saved'};}catch{const message='Order could not be saved on this device.';orderSaveError=message;savingNotice();return {status:'error',message};}
  }else{try{return {status:orderSync.move(ids,photo,before)?'queued':'unchanged'};}catch(error){orderSaveError=error.message;savingNotice();return {status:'error',message:error.message};}}
 }
 async function startSync(){
  const epoch=collectionEpoch,id=collection.id,side=ownSide(),actor=user.id;
  const active=()=>epoch===collectionEpoch&&collection.id===id;
  const scope='sophs-review-queue-v1:'+actor+':'+id+':'+side;
  journalScope=scope;journal?.release();
  const claimed=await ReviewJournal.claim({storage:localStorage,scope,locks:navigator.locks});
  if(!active()){claimed.release();return;}journal=claimed;
  const query=name=>'/rest/v1/review_choices?collection_id=eq.'+encodeURIComponent(id)+'&photo_id=eq.'+encodeURIComponent(name)+'&side=eq.'+side;
  sync=new ReviewSync({storage:localStorage,key:journal.key,online:()=>active()&&navigator.onLine!==false,notify:jobs=>{if(active())syncNotice(jobs);},
   read:async name=>{const rows=await api(query(name));if(rows[0])updateRow(rows[0],epoch);return rows[0]||null;},
   write:async(name,selection,revision)=>{
    if(!active())throw Error('Collection changed; pending choice retained.');
    const body=revision===null?{collection_id:id,photo_id:name,side,selection,actor_user_id:actor}:{selection,actor_user_id:actor};
    const rows=await api(query(name)+(revision===null?'':'&revision=eq.'+revision),{method:revision===null?'POST':'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
    if(rows[0])updateRow(rows[0],epoch);return rows[0]||null;
   }});
  document.querySelector('#sync-retry').onclick=retry;
  choiceReady=true;syncNotice(sync.snapshot());void sync.flush();
 }
 async function retry(){try{await ensureReady();await sync?.flush();await refreshOrder();await reload?.();}catch{}}
 window.addEventListener('online',retry);
 window.addEventListener('offline',()=>sync&&syncNotice(sync.snapshot()));
 window.addEventListener('focus',async()=>{if(!sync)return retry();const epoch=collectionEpoch,activeSync=sync;try{const rows=await allRows('/rest/v1/review_choices?collection_id=eq.'+encodeURIComponent(collection.id)+'&order=photo_id.asc,side.asc');if(epoch!==collectionEpoch)return;rows.forEach(row=>updateRow(row,epoch));await activeSync.flush();if(epoch===collectionEpoch){await refreshOrder();await reload?.();}}catch{if(epoch===collectionEpoch)syncNotice(activeSync.snapshot());}});

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
  if(localFixture){photoList=localFixture.photos;agency=localFixture.agency;model=localFixture.model;}
  try{localOrder=JSON.parse(localStorage.getItem((localFixture?.orderKey||'sophs-review-local-order-v1'))||'null');}catch{}orderAvailable=true;
  try{const saved=JSON.parse(localStorage.getItem(demoKey)||'null');if(saved){agency=saved.agency||agency;model=saved.model||{};}}catch{}
  collection={id:'example',name:localFixture?.name||(localFixture?'Sophie':'Example'),title:localFixture?.title||(localFixture?'Sophie':'Example photos')};
  if(localFixture?.initialView==='compare')current='compare';
  document.querySelector('#portal-identity').textContent=localFixture?(localFixture.note||'Local simulation · historic choices'):'Local example';
  document.querySelector('#collaboration-help').textContent='';
  if(localFixture){
   const clips=document.createElement('section');clips.className='local-clips';clips.setAttribute('aria-label','Existing private work videos');
   for(const clip of localFixture.videos){const figure=document.createElement('figure'),video=document.createElement('video'),caption=document.createElement('figcaption');video.src=clip.url;video.controls=true;video.playsInline=true;video.preload='metadata';caption.textContent=clip.title;figure.append(video,caption);clips.append(figure);}document.querySelector('main').append(clips);
  }
 }
 async function allRows(path){
  const rows=[];for(let offset=0;;offset+=500){const page=await api(path+'&limit=500&offset='+offset);rows.push(...page);if(page.length<500)return rows;}
 }
 async function loadCollection(id){
  const request=++mediaRequest;
  const epoch=dataCollection===id?collectionEpoch:++collectionEpoch;
  if(dataCollection!==id){agency={};model={};revisions={};records=[];photoList=[];photoRows=[];links=[];sync=null;orderSync=null;orderAvailable=false;choiceReady=false;choiceJobs={};orderJob=null;choiceOthers=0;orderOthers=0;saveError='';finalRejectErrors={};orderSaveError='';orderLoadError='';dataCollection=id;}
  const rows=await allRows('/rest/v1/review_photos?collection_id=eq.'+encodeURIComponent(id)+'&order=ordinal.asc,id.asc');
  const choices=await allRows('/rest/v1/review_choices?collection_id=eq.'+encodeURIComponent(id)+'&order=photo_id.asc,side.asc');
  const photos=[];
  for(let offset=0;offset<rows.length;offset+=100){
   const batch=rows.slice(offset,offset+100),signed=await api('/storage/v1/object/sign/model-review',{method:'POST',body:JSON.stringify({expiresIn:86400,paths:batch.map(p=>p.storage_path)})});
   const urls=new Map(signed.map(s=>[s.path,s]));
   for(const p of batch){const item=urls.get(p.storage_path);if(!item?.signedURL||item.error)throw Error('A photo could not load. Please contact SOPHS.');photos.push({filename:p.id,date:p.photo_date||'',image:encodeURI(config.url+'/storage/v1'+item.signedURL),original_name:p.original_name});}
  }
  const nextLinks=await api('/rest/v1/review_links?collection_id=eq.'+encodeURIComponent(id)+'&order=created_at.asc');
  if(epoch!==collectionEpoch||request!==mediaRequest)return false;
  photoRows=rows;photoList=photos;links=nextLinks;choices.forEach(row=>updateRow(row,epoch));return true;
 }
 let ready=null,initialized=false;
 function ensureReady(){
  if(initialized)return Promise.resolve();
  if(!ready)ready=initialize().then(()=>{initialized=true;}).catch(error=>{
   ready=null;document.querySelector('#sync-status').textContent='Collection unavailable. Pending choices remain on this device. '+error.message;
   const button=document.querySelector('#sync-retry');button.hidden=false;button.onclick=retry;throw error;
  });
  return ready;
 }
 async function initialize(){
  if(demo){example();return;}
  user=await ModelAuth.current();if(!user){location.replace('model-login.html');throw Error('Sign in to see your photos.');}
  const memberships=await api('/rest/v1/review_members?select=collection_id,role');
  const collections=await api('/rest/v1/review_collections?select=id,name&order=name.asc');
  if(!collections.length)throw Error('Your collection is not ready. Please contact Sophs Model.');
  collection=collections[0];membership=memberships.find(m=>m.collection_id===collection.id);current='agency';
  document.querySelector('#portal-identity').textContent=user.email+' · '+membership.role;
  if(membership.role==='agency')document.querySelector('[data-review-side="model"]').textContent='Model version';
  const picker=document.querySelector('#collection-picker');picker.replaceChildren?.();
  for(const c of collections){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;picker.append(o);}
  document.querySelector('#collection-picker-label').hidden=collections.length<2;
  picker.onchange=async()=>{if(window.reviewHasPending?.()||Object.keys(sync?.snapshot()||{}).length||orderSync?.hasPending()){picker.value=collection.id;return;}try{collection=collections.find(c=>c.id===picker.value);membership=memberships.find(m=>m.collection_id===collection.id);current='agency';if(await loadCollection(collection.id)){await startSync();await startOrder();await reload?.();}}catch(error){document.querySelector('#collaboration-summary').textContent=error.message;}};
  if(await loadCollection(collection.id)){await startSync();await startOrder();}
 }
 async function persist(name,selection,finalReject=false){
  if((!writable()&&!finalReject)||conflicted)throw Error('This is a read-only comparison.');
  const side=finalReject?ownSide():demo?current:ownSide(),value=C.choice(selection),target=side==='agency'?agency:model;
  if(demo){
   const nextAgency=side==='agency'?{...agency,[name]:value}:agency,nextModel=side==='model'?{...model,[name]:value}:model;
   try{localStorage.setItem(demoKey,JSON.stringify({agency:nextAgency,model:nextModel}));}catch{throw Error('This browser could not retain your choice. Nothing was queued.');}
   agency=nextAgency;model=nextModel;return value;
  }
  return sync.enqueue(name,value,revisions[side+':'+name]??null);
 }
 window.modelReviewTransport=async(path,options={})=>{
  try{
   await ensureReady();
   const body=options.body&&typeof options.body==='string'?JSON.parse(options.body):{};
   if(path==='/api/photos')return result({profile:{name:collection.name,title:collection.title||collection.name+'’s photos',initial_view:'all'},photos:photoList,selections:selected(),suggestions:agency,links});
   if(path==='/api/final-reject'){
    if(current!=='compare'||!photoList.some(p=>p.filename===body.filename&&mutual(p)))throw Error('Choose a final candidate first.');
    let value;
    try{value=await persist(body.filename,{...sideChoice(ownSide(),body.filename),decision:'reject'},true);}
    catch(error){finalRejectErrors[body.filename]=error.message+' Retry Reject on this photo.';savingNotice();throw error;}
    delete finalRejectErrors[body.filename];savingNotice();
    return result({selection:value,queued:!demo});
   }
   if(path==='/api/selection'){const value=await persist(body.filename,body.selection);return result({selection:value,queued:!demo});}
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
    if(collection.id===window.SophieWebsiteVariants?.collection){
     const prepared=await window.SophieWebsiteVariants.prepare(file),uploaded=await window.SophieWebsiteVariants.upload({file,prepared,api,user,ordinal:photoRows.length});
     await loadCollection(collection.id);return result({photo:photoList.find(p=>p.filename===uploaded.id),duplicate:uploaded.duplicate});
    }
    const id=crypto.randomUUID(),name=decodeURIComponent(options.headers['X-Filename']),extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[options.headers['Content-Type']],storagePath=collection.id+'/'+id+'.'+extension;
    await api('/storage/v1/object/model-review/'+storagePath,{method:'POST',headers:{'Content-Type':options.headers['Content-Type'],'x-upsert':'false'},body:file});
    await api('/rest/v1/review_photos',{method:'POST',body:JSON.stringify({id,collection_id:collection.id,storage_path:storagePath,original_name:name,ordinal:photoRows.length,uploaded_by:user.id})});
    await loadCollection(collection.id);return result({photo:photoList.find(p=>p.filename===id),duplicate:false});
   }
   return result({error:'Unknown operation.'},404);
  }catch(error){return result({error:error.message},409);}
 };
 function sharedPhotos(shown){
  const ids=orderState()?.ids||[],rank=new Map(ids.map((id,i)=>[id,i])),base=new Map(photoList.map((p,i)=>[p.filename,i]));
  return [...shown].sort((a,b)=>(rank.get(a.filename)??ids.length+base.get(a.filename))-(rank.get(b.filename)??ids.length+base.get(b.filename)));
 }
 window.reviewIsCompare=()=>current==='compare';
 window.reviewOrdered=shown=>{const sorted=sharedPhotos(shown);if(current!=='compare')return sorted;
  if(orderState()?.manual)return sorted.filter(mutual);
  let approved=sorted.filter(mutual);
  if(!orderState()?.manual){const first=approved.filter(p=>p.height>p.width).slice(0,4),ids=new Set(first.map(p=>p.filename));approved=[...first,...approved.filter(p=>!ids.has(p.filename))];}
  return approved;};
 window.reviewDecorate=(card,p,s,save)=>{
  if(current==='compare'){
   card.classList.add('final-candidate');
   const reject=document.createElement('button');reject.type='button';reject.className='final-reject';reject.textContent='Reject';reject.setAttribute('aria-label','Reject this final photo');
   reject.disabled=conflicted||!!sync?.snapshot()[p.filename];
   reject.onclick=async()=>{reject.disabled=true;try{const response=await window.modelReviewTransport('/api/final-reject',{body:JSON.stringify({filename:p.filename})});const data=await response.json();if(!response.ok)throw Error(data.error);await reload?.();document.querySelector('#order-announcement').textContent='Photo removed from final selection. Restore it in your version.';}catch(error){reject.disabled=false;document.querySelector('#order-announcement').textContent=error.message;}};card.append(reject);
  }
  const job=current===ownSide()?sync?.snapshot()[p.filename]:null;
  if(job){const box=document.createElement('div');box.className='sync-conflict';box.textContent=job.status==='conflict'?'Saved: '+(job.remote?.selection?.decision||'Undecided')+' · Yours pending: '+job.desired.decision:'Pending on this device'+(job.error?' · '+job.error:'');
   if(job.status==='conflict')for(const [label,local] of [['Use saved choice',false],['Save my choice instead',true]]){const button=document.createElement('button');button.textContent=label;button.onclick=async()=>{try{await sync.resolve(p.filename,local);await reload?.();}catch(error){box.textContent=error.message;}};box.append(button);}card.append(box);}
  if(!writable()||conflicted){for(const b of card.querySelectorAll('.actions button,.pick input,.reorder button'))b.disabled=true;for(const slider of card.querySelectorAll('.choice-slider'))slider.setDisabled?.(true);}
  if(current==='compare'&&orderAvailable){
   card.dataset.orderId=p.filename;
   const row=document.createElement('div');row.className='shared-reorder';
   const ids=()=>window.reviewOrdered(photoList).map(item=>item.filename);
   const handle=card.querySelector('.image-button');
   handle.dataset.orderAction='drag';handle.classList.add('reorder-photo');handle.setAttribute('aria-describedby','order-instruction');
   if(typeof reviewLongPress==='function')reviewLongPress(handle,{id:p.filename,getIds:ids,move:moveShared,announce:text=>{document.querySelector('#order-announcement').textContent=text;}});
   for(const [direction,label] of [[-1,'Move earlier'],[1,'Move later']]){const button=document.createElement('button');button.textContent=label;button.className='keyboard-reorder';button.dataset.orderAction=direction<0?'earlier':'later';button.setAttribute('aria-label',label);const at=ids().indexOf(p.filename);button.disabled=direction<0?at===0:at===ids().length-1;button.onclick=()=>{const list=ids(),index=list.indexOf(p.filename);const result=moveShared(p.filename,direction<0?list[index-1]:list[index+2]??null);document.querySelector('#order-announcement').textContent=result.status==='error'?result.message:'Photo moved '+(direction<0?'earlier':'later')+'.';};row.append(button);}card.append(row);
  }
 };
 window.reviewAfterRender=()=>{
  document.querySelector('#order-instruction').hidden=current!=='compare';
  document.querySelector('#collaboration-summary').textContent=conflicted?'Reload before editing.':'';
  for(const b of document.querySelectorAll('[data-review-side]')){b.setAttribute('aria-pressed',String(b.dataset.reviewSide===current));if(b.dataset.reviewSide==='agency')b.textContent='Agency';if(b.dataset.reviewSide==='model')b.textContent='Your version';}
  document.getElementById('add-media').disabled=!writable()||conflicted;
  for(const id of ['apply-bulk','confirm-review','select-visible','clear-selected'])if(!writable()||conflicted)document.getElementById(id).disabled=true;
 };
 window.reviewActivate=fn=>{reload=fn;for(const b of document.querySelectorAll('[data-review-side]'))b.onclick=async()=>{if(window.reviewHasPending?.())return;current=b.dataset.reviewSide;await reload();};};
})();
