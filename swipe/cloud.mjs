import {fresh} from './state.mjs';
import {sharedPhotos} from './final.mjs';
const config=window.modelingSupabaseConfig,COLLECTION='ab0d9e07-d55c-5d27-92da-a8576a1047a3';
export class AccountReview{
 notify=()=>{};onRemote=()=>{};running=false;pending=null;conflict=false;published=false;publishing=false;editEpoch=0;
 async api(path,body){const token=await ModelAuth.token();if(!token)throw Error('Sign in again. Your pending choices stay on this device.');const response=await fetch(config.url+path,{method:body?'POST':'GET',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok){const error=Error(data.message||'Could not save. Retry.');error.code=data.code;throw error;}return data;}
 async load(){
  const user=await ModelAuth.current();if(!user){location.replace('../model-login.html');throw Error('Sign in required');}
  let round;try{round=await this.api('/rest/v1/rpc/swipe_round_load',{});}catch(error){if(error.code==='42501')location.replace('../model-review-classic.html');throw error;}this.round=round;this.role=round.role;this.published=!!round.published_at;this.base=JSON.stringify(round[this.role]);this.key=`sophs.swipe-round.v1:${user.id}:${round.id}`;
  let rows=[];for(let offset=0;;offset+=500){const batch=await this.api(`/rest/v1/review_photos?collection_id=eq.${COLLECTION}&select=id,storage_path&limit=500&offset=${offset}&order=ordinal.asc,id.asc`);rows.push(...batch);if(batch.length<500)break;}
  const assets=await this.api(`/rest/v1/review_website_assets?collection_id=eq.${COLLECTION}&select=photo_id,display_path,large_path&limit=1000`);this.assets=new Map(assets.map(a=>[a.photo_id,a]));
  this.paths=new Map(rows.map(p=>[p.id,p.storage_path]));this.urls=new Map();
  const state={...fresh(),side:this.role,limit:round.photo_ids.length,agency:round.agency,model:round.model,finalOrder:round.order};
  try{const backup=JSON.parse(localStorage.getItem(this.key)||'null');if(backup?.pending){state[this.role]=backup.pending.own;state.finalOrder=backup.pending.order;this.pending=backup.pending;this.base=backup.base;this.conflict=JSON.stringify(round[this.role])!==this.base||(this.pending.orderDirty&&JSON.stringify(round.order)!==JSON.stringify(this.pending.orderBaseline));if(!this.pending.orderDirty){this.pending.order=round.order;state.finalOrder=round.order;}}}catch{}
  this.state=state;window.addEventListener('online',()=>this.retry());window.addEventListener('focus',()=>this.refresh());
  window.addEventListener('storage',e=>{if(e.key===this.key){this.conflict=true;this.notify('Review changed in another tab. Export pending work before reloading.',true);}});
  if(this.pending)setTimeout(()=>this.retry(),0);
  return {photos:round.photo_ids.filter(id=>this.paths.has(id)).map(id=>({id})),state};
 }
 stage(state){
  if(this.published||this.publishing||this.conflict)return false;
  if(!this.pending&&JSON.stringify(state[this.role])===this.base&&JSON.stringify(state.finalOrder||[])===JSON.stringify(this.round.order||[]))return true;
  this.editEpoch++;this.pending={orderDirty:JSON.stringify(state.finalOrder||[])!==JSON.stringify(this.round.order||[]),orderBaseline:this.pending?.orderBaseline||[...(this.round.order||[])],own:structuredClone(state[this.role]),order:[...(state.finalOrder||[])],generation:(this.pending?.generation||0)+1};
  const durable=this.backup();this.notify(durable?'Saving…':'Not saved on this device — export your choices',!durable);if(durable)void this.flush();return durable;
 }
 backup(){try{localStorage.setItem(this.key,JSON.stringify({base:this.base,pending:this.pending}));return true;}catch{return false;}}
 async flush(){
  if(this.running||!this.pending||this.conflict)return;
  this.running=true;let succeeded=false;
  try{
   const job=this.pending;
   const next=await this.api('/rest/v1/rpc/swipe_round_save',{p_round:this.round.id,p_revision:this.round.revision,p_state:job.own,p_order:job.orderDirty?job.order:null});
   succeeded=true;this.round=next;this.base=JSON.stringify(next[this.role]);this.onRemote(next);if(!this.pending?.orderDirty){this.state&&(this.state.finalOrder=next.order);if(this.pending)this.pending.order=next.order;}
   if(this.pending===job)this.pending=null;
   const durable=this.backup();this.notify(!durable?'Saved online, but device backup failed':this.pending?'Saving…':'All changes saved',!durable);
  }catch(error){this.notify(error.message,true);if(error.code==='40001')this.conflict=true;}
  finally{this.running=false;}
  if(succeeded&&this.pending&&!this.conflict)void this.flush();
 }
 async retry(){
  if(this.running||this.publishing||this.published)return;
  try{if(this.conflict){const latest=await this.api('/rest/v1/rpc/swipe_round_load',{});if(JSON.stringify(latest[this.role])!==this.base){this.notify('Your review changed elsewhere. Export this device’s pending work before reloading.',true);return;}if(this.pending?.orderDirty&&JSON.stringify(latest.order)!==JSON.stringify(this.pending.orderBaseline)){this.notify('Photo order changed elsewhere. Export pending work before reloading.',true);return;}if(this.pending&&!this.pending.orderDirty){this.pending.order=latest.order;this.state.finalOrder=latest.order;}this.round=latest;this.conflict=false;this.onRemote(latest);}
  if(this.backup())await this.flush();}catch(error){this.notify(error.message,true);}
 }
 async refresh(){if(this.running||this.pending||this.publishing)return;const epoch=this.editEpoch,revision=this.round.revision;try{const latest=await this.api('/rest/v1/rpc/swipe_round_load',{});if(this.running||this.pending||this.publishing||this.editEpoch!==epoch||this.round.revision!==revision)return;if(latest.revision!==this.round.revision){this.round=latest;this.published=!!latest.published_at;this.base=JSON.stringify(latest[this.role]);Object.assign(this.state[this.role],latest[this.role]);this.state.finalOrder=latest.order;this.onRemote(latest);document.dispatchEvent(new Event('review-remote')); this.notify('Latest review loaded',false);}}catch(error){this.notify(error.message,true);}}
 async image(id,thumb=false){
  const cacheKey=id+(thumb?':thumb':':large');
  const cached=this.urls.get(cacheKey);if(cached&&cached.expires>Date.now())return cached.url;
  const asset=this.assets.get(id),path=asset?(thumb?asset.display_path:asset.large_path):this.paths.get(id);if(!path)throw Error('Photo unavailable');
  const signed=await this.api('/storage/v1/object/sign/model-review/'+path,{expiresIn:3600});
  const url=config.url+'/storage/v1'+signed.signedURL;this.urls.set(cacheKey,{url,expires:Date.now()+3500000});return url;
 }
 attachPublish(panel,getState,getPhotos){
  const button=document.createElement('button'),status=document.createElement('p');button.textContent='Finish & publish';button.hidden=this.role!=='agency';status.className='publish-status';panel.append(button,status);
  button.onclick=async()=>{
   if(this.running||this.pending||this.conflict){status.textContent='Save pending choices before publishing.';return;}
   this.publishing=true;this.editEpoch++;button.disabled=true;status.textContent='Publishing…';document.dispatchEvent(new Event('review-remote'));
   try{const order=sharedPhotos(getState(),getPhotos()).map(p=>p.id);this.round=await this.api('/rest/v1/rpc/swipe_round_publish',{p_round:this.round.id,p_revision:this.round.revision,p_order:order});this.published=true;status.textContent='Published';this.notify('Round published',false);}catch(error){status.textContent=error.message;button.disabled=false;}finally{this.publishing=false;document.dispatchEvent(new Event('review-remote'));}
  };
 }
}
export const cloud=new AccountReview();
