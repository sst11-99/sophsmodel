import {cloud} from './cloud.mjs';
import {createFinalReview} from './final.mjs';
import {KEY,fresh,decide,undo,restore,persist,track,direction,keptPhotos as selectKeptPhotos} from './state.mjs';
const $=id=>document.getElementById(id);
let photos=[],state=fresh(),gesture=null,animation=null,epoch=0,lockedUntil=0,lastButton='',lastButtonTime=0,preload=null,gridPage=0,loadBlocked=false,ready=false,unreadableRaw=null,finalView=false;
const writable=()=>!cloud||(state.side===cloud.role&&!cloud.published&&!cloud.publishing&&!cloud.conflict);
function setImage(img,id,thumb=false){
 if(!id)return;img.dataset.photoId=id;img.dataset.loading='true';img.removeAttribute('src');
 const settled=()=>{if(img.dataset.photoId!==id)return;img.dataset.loading='false';if(img.id==='photo'&&!$('stage').hidden){$('keep').disabled=$('reject').disabled=!writable();}};
 img.onload=settled;img.addEventListener('error',settled,{once:true});
 if(img.id==='photo')$('keep').disabled=$('reject').disabled=true;
 if(!cloud){img.src=`/${thumb?'thumb':'photo'}/${id}`;return;}
 cloud.image(id,thumb).then(url=>{if(img.dataset.photoId===id)img.src=url;}).catch(()=>{if(img.dataset.photoId!==id)return;settled();img.alt='Photo unavailable';if(img.id==='photo')$('missing').hidden=false;});
}

const finalReview=createFinalReview({root:$('final-panel'),getState:()=>state,getPhotos:()=>photos,save,blocked:()=>loadBlocked||!ready||!writable(),setImage});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const ids=()=>photos.slice(0,state.limit).map(p=>p.id);
const current=()=>photos[state[state.side].position];
const keptPhotos=()=>selectKeptPhotos(state,photos,finalView);
function save(){
  if(cloud)return cloud.stage(state);
  let ok=false;
  if(!loadBlocked) {try {ok=persist(localStorage,state);}catch{}}
  $('status').textContent=ok?'Saved on this device':loadBlocked?'Saved demo could not be read. Export before retrying.':'Not saved — retry or export your choices';
  $('status').className=ok?'saved':'failed';$('retry').hidden=ok;return ok;
}
function stopMotion(){epoch++;gesture=null;if(animation){animation.cancel();animation=null;}$('card').style.transform='';$('cue').style.opacity=0;}
function showPhoto(p){
  $('missing').hidden=true;$('photo').hidden=false;
  $('photo').alt=`Sophie — photo ${state[state.side].position+1}`;
  setImage($('photo'),p.id);
  const next=photos[state[state.side].position+1];
  preload=null;
  if(next && state[state.side].position+1<state.limit){preload=new Image();setImage(preload,next.id);}
}
function render(){
  stopMotion();$('final-panel').hidden=!finalView;
  if(finalView){$('agency').setAttribute('aria-pressed',false);$('model').setAttribute('aria-pressed',false);$('final').setAttribute('aria-pressed',true);$('stage').hidden=$('results').hidden=$('controls').hidden=true;$('progress').textContent='Kept by both';finalReview.show();return;}
  finalReview.hide();const s=state[state.side],done=s.position>=Math.min(state.limit,photos.length);
  $('agency').setAttribute('aria-pressed',!finalView&&state.side==='agency');$('model').setAttribute('aria-pressed',!finalView&&state.side==='model');$('final').setAttribute('aria-pressed',finalView);
  $('progress').textContent=finalView?'Kept by both':done?`${Math.min(state.limit,photos.length)} of ${Math.min(state.limit,photos.length)} reviewed`:`${s.position+1} of ${Math.min(state.limit,photos.length)}`;
  $('controls').hidden=finalView;$('stage').hidden=done;$('results').hidden=!done;
  $('keep').disabled=done||!writable();$('reject').disabled=done||!writable();$('undo').disabled=!s.history.length||!writable();
  $('scope').hidden=state.limit>=photos.length;$('scope').textContent=`Use all ${photos.length} photos`;
  if(done){$('photo').removeAttribute('src');preload=null;gridPage=0;renderGrid();}else{ $('grid').replaceChildren();showPhoto(current()); }
}
function renderGrid(){
  const kept=keptPhotos();
  $('result-title').textContent=`${kept.length} kept`;$('grid').replaceChildren();
  kept.slice(gridPage*24,gridPage*24+24).forEach(p=>{
    const button=document.createElement('button');button.ariaLabel='Review kept photo';
    const img=document.createElement('img');img.loading='lazy';setImage(img,p.id,true);img.alt='Sophie — kept photo';button.append(img);if(finalView){button.disabled=true;button.ariaLabel='Kept by Agency and Your Version';}
    button.onclick=()=>{if(finalView)return;state[state.side].position=photos.findIndex(x=>x.id===p.id);save();render();$('stage').focus();};$('grid').append(button);
  });
  $('more').hidden=kept.length<=24;$('more').textContent=(gridPage+1)*24<kept.length?'More photos':'First photos';
}
function commit(value,expected,animate=false){
  if($('photo').dataset.loading==='true' || !writable() || finalView || !ready || performance.now()<lockedUntil || loadBlocked) return;
  const before=state[state.side].position;
  if(!decide(state,ids(),expected,value))return;
  stopMotion();save();lockedUntil=performance.now()+320;
  $('undo').disabled=false;
  if(animate&&!reduced.matches){
    const token=epoch;
    animation=$('card').animate([{transform:gestureTransform},{transform:`translateX(${value==='keep'?1:-1}00%) rotate(${value==='keep'?4:-4}deg)`,opacity:0}],{duration:140,easing:'ease-out',fill:'forwards'});
    animation.finished.then(()=>{if(token===epoch&&state[state.side].position===before+1)render();}).catch(()=>{});
  } else render();
}
let gestureTransform='none';
function undoAction(){stopMotion();if(!writable()||finalView||!ready||loadBlocked||!undo(state))return;lockedUntil=0;lastButton='';save();render();}
function buttonDecision(value,event){
  const now=performance.now();
  if(event.detail>1 || (lastButton===value&&now-lastButtonTime<420))return;
  lastButton=value;lastButtonTime=now;commit(value,current()?.id);
}
$('keep').onclick=e=>buttonDecision('keep',e);$('reject').onclick=e=>buttonDecision('reject',e);$('undo').onclick=undoAction;
for(const side of ['agency','model'])$(side).onclick=()=>{if(!ready||loadBlocked)return;stopMotion();finalView=false;state.side=side;lockedUntil=0;lastButton='';save();render();};
$('final').onclick=()=>{if(!ready)return;stopMotion();finalView=true;if(cloud)state.side=cloud.role;render();};
$('scope').onclick=()=>{if(!ready||loadBlocked)return;state.limit=photos.length;save();render();};
$('review').onclick=()=>{if(finalView){finalView=false;render();return;}state[state.side].position=0;save();render();$('stage').focus();};
$('more').onclick=()=>{const count=keptPhotos().length;gridPage=(gridPage+1)*24<count?gridPage+1:0;renderGrid();};
$('retry').onclick=()=>{if(cloud){cloud.retry();return;}if(loadBlocked){location.reload();return;}save();};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({demo:KEY,exportedAt:new Date().toISOString(),...state,...(unreadableRaw?{unreadableSavedData:unreadableRaw}:{})},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sophie-swipe-demo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('photo').onerror=()=>{$('missing').hidden=false;$('photo').hidden=true;};
$('retry-photo').onclick=()=>showPhoto(current());
const stage=$('stage');
stage.onpointerdown=e=>{
  if(!writable()||!ready||e.target.closest('button')||performance.now()<lockedUntil||loadBlocked||e.button!==0)return;
  if(gesture){stopMotion();return;}
  stopMotion();gesture={pointer:e.pointerId,x:e.clientX,y:e.clientY,id:current()?.id,axis:null};stage.setPointerCapture(e.pointerId);
};
stage.onpointermove=e=>{
  if(!gesture||gesture.pointer!==e.pointerId)return;
  const m=track(gesture,e.clientX,e.clientY);
  if(m.axis==='x'){
    gestureTransform=`translateX(${m.dx}px) rotate(${Math.max(-4,Math.min(4,m.dx/45))}deg)`;
    $('card').style.transform=gestureTransform;$('cue').textContent=m.dx>0?'Keep':'Reject';$('cue').style.opacity=Math.min(1,Math.abs(m.dx)/100);
  }
};
stage.onpointerup=e=>{
  if(!gesture||gesture.pointer!==e.pointerId)return;
  const g=gesture,choice=direction(g,e.clientX,e.clientY,stage.clientWidth);gesture=null;
  if(choice)commit(choice,g.id,true);else{
    const from=$('card').style.transform;stopMotion();
    if(!reduced.matches&&from)animation=$('card').animate([{transform:from},{transform:'none'}],{duration:130,easing:'ease-out'});
  }
};
stage.onpointercancel=()=>stopMotion();stage.onlostpointercapture=()=>{if(gesture)stopMotion();};
window.addEventListener('blur',()=>{const was=!!animation;stopMotion();if(was)render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){const was=!!animation;stopMotion();if(was)render();}});
window.addEventListener('resize',()=>{if(gesture)stopMotion();});
document.addEventListener('keydown',e=>{
  if(finalView||!ready||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select'))return;
  if(e.key==='Escape'){stopMotion();render();return;}
  if(e.key==='z'||e.key==='Z'){e.preventDefault();undoAction();}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();commit(e.key==='ArrowRight'?'keep':'reject',current()?.id);}
});
window.addEventListener('storage',e=>{if(!cloud&&e.key===KEY){loadBlocked=true;stopMotion();$('status').textContent='Demo changed in another tab — export this tab, then reload';$('status').className='failed';$('retry').hidden=false;}});
try{
  let raw=null,readFailed=false;
  if(cloud){const loaded=await cloud.load();photos=loaded.photos;state=loaded.state;cloud.notify=(message,error)=>{$('status').textContent=message;$('status').className=error?'failed':'saved';$('retry').hidden=!error;};cloud.onRemote=(remote)=>{const other=cloud.role==='agency'?'model':'agency';state[other]=remote[other];};document.addEventListener('review-remote',render);}
  else{const response=await fetch('/manifest.json');if(!response.ok)throw Error();photos=await response.json();
  try{raw=localStorage.getItem(KEY);}catch{readFailed=true;}
  try{state=restore(raw,photos.map(p=>p.id));}catch{loadBlocked=true;unreadableRaw=raw;}}
  ready=true;for(const id of ['agency','model','final','scope','export'])$(id).disabled=false;
  render();if(loadBlocked||readFailed||raw)save();if(cloud){$('status').textContent=cloud.published?'Round published':'All changes saved';cloud.attachPublish($('final-panel'),()=>state,()=>photos);}
}catch{$('progress').textContent='Photos could not load. Refresh to retry.';$('stage').hidden=true;$('controls').hidden=true;}
