// Final-stage decisions use the same isolated trial state as the first pass.
export function sharedPhotos(state,photos){
 const byId=new Map(photos.slice(0,state.limit).map(p=>[p.id,p]));
 const order=[...new Set([...(state.finalOrder||[]),...byId.keys()])];
 return order.filter(id=>byId.has(id)&&state.agency.decisions[id]==='keep'&&state.model.decisions[id]==='keep').map(id=>byId.get(id));
}
export function finalDecision(state,id,value){
 if(!['keep','reject'].includes(value)||state.agency.decisions[id]!=='keep'||state.model.decisions[id]!=='keep')return false;
 const s=state[state.side];s.finalHistory??=[];s.finalReviewed??=[];
 s.finalHistory.push({id,previous:s.decisions[id],reviewed:s.finalReviewed.includes(id)});
 s.decisions[id]=value;if(!s.finalReviewed.includes(id))s.finalReviewed.push(id);return true;
}
export function undoFinal(state){
 const s=state[state.side],h=s.finalHistory?.pop();if(!h)return false;
 s.decisions[h.id]=h.previous;if(!h.reviewed)s.finalReviewed=s.finalReviewed.filter(id=>id!==h.id);return h.id;
}
export function movePhoto(state,photos,id,offset){
 const order=sharedPhotos(state,photos).map(p=>p.id),i=order.indexOf(id),to=i+offset;
 if(i<0||to<0||to>=order.length)return false;
 const all=[...new Set([...(state.finalOrder||[]),...photos.slice(0,state.limit).map(p=>p.id)])],a=all.indexOf(order[i]),b=all.indexOf(order[to]);
 [all[a],all[b]]=[all[b],all[a]];state.finalOrder=all;return true;
}
export function createFinalReview({root,getState,getPhotos,save,blocked,setImage=(img,id,thumb=false)=>{img.src=`/${thumb?'thumb':'photo'}/${id}`;}}){
 root.innerHTML=`<div class="final-tools"><button id="final-swipe" aria-pressed="true">Review</button><button id="final-order" aria-pressed="false">Order</button></div><p id="final-progress" aria-live="polite"></p><section id="final-stage" tabindex="0" aria-label="Final photo review"><img id="final-photo" alt="Sophie — final review" draggable="false"><span id="final-cue" aria-hidden="true"></span></section><div id="final-actions"><button id="final-reject">Discard</button><button id="final-undo">Undo</button><button id="final-keep">Keep</button></div><p id="final-empty" hidden>No shared keeps yet</p><div id="final-grid" hidden></div><button id="final-more" hidden>More photos</button><p id="final-save" role="status"></p><dialog id="final-dialog" aria-label="Review photo"><button id="final-close" aria-label="Close photo">Close</button><img id="final-large" alt="Sophie — selected photo"><button id="final-discard">Discard</button></dialog><div id="final-toast" role="status" hidden><span>Discarded</span><button id="final-toast-undo">Undo</button></div>`;
 const $=id=>root.querySelector('#'+id),stage=$('final-stage'),dialog=$('final-dialog');
 let view='review',page=0,active=null,modalId=null,gesture=null,lock=0,timer=null,toastSide=null,focusId=null;
 const state=()=>getState(),photos=()=>getPhotos(),shared=()=>sharedPhotos(state(),photos());
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function clearGesture(){gesture=null;$('final-photo').style.transform='';$('final-cue').textContent='';}
 function write(){const ok=save();$('final-save').textContent=ok?'Saved on this device':'Not saved — use Retry save or Export below';return ok;}
 function render(){
  clearGesture();const s=state()[state().side],list=shared(),pending=list.filter(p=>!(s.finalReviewed||[]).includes(p.id));
  const complete=photos().slice(0,state().limit).every(p=>['agency','model'].every(role=>['keep','reject'].includes(state()[role].decisions[p.id])));
  root.querySelector('.final-tools').hidden=!complete;
  if(!complete){active=null;stage.hidden=$('final-actions').hidden=$('final-grid').hidden=$('final-more').hidden=true;$('final-empty').hidden=false;$('final-empty').textContent='Final review opens when both first reviews are complete';$('final-progress').textContent='Waiting for both reviews';return;}
  active=pending[0]||null;
  $('final-swipe').setAttribute('aria-pressed',view==='review');$('final-order').setAttribute('aria-pressed',view==='order');
  stage.hidden=view!=='review'||!active;$('final-actions').hidden=view!=='review';$('final-grid').hidden=view!=='order';
  $('final-reject').disabled=$('final-keep').disabled=!active;$('final-undo').disabled=!s.finalHistory?.length;
  $('final-progress').textContent=view==='order'?`${list.length} shared keeps`:`${list.length-pending.length} of ${list.length} reviewed`;
  $('final-empty').hidden=!!active||view==='order';$('final-empty').textContent=list.length?'Final review finished — arrange your photos in Order':'No shared keeps yet';
  if(active){setImage($('final-photo'),active.id);const next=pending[1];if(next){const image=new Image();setImage(image,next.id);}}
  else $('final-photo').removeAttribute('src');
  $('final-grid').replaceChildren();$('final-more').hidden=view!=='order'||list.length<=24;
  if(view==='order'){
   if(page*24>=list.length)page=0;
   list.slice(page*24,page*24+24).forEach((p,n)=>{
    const tile=document.createElement('div'),open=document.createElement('button'),image=document.createElement('img');
    tile.className='final-tile';open.className='final-thumbnail';open.ariaLabel=`Open photo ${page*24+n+1}`;open.dataset.photoId=p.id;
    setImage(image,p.id,true);image.loading='lazy';image.alt='Sophie';open.append(image);open.onclick=()=>openPhoto(p.id);tile.append(open);
    for(const [offset,label] of [[-1,'Move earlier'],[1,'Move later']]){const button=document.createElement('button');button.textContent=offset<0?'←':'→';button.ariaLabel=label;button.disabled=blocked()||(offset<0?page*24+n===0:page*24+n===list.length-1);button.onclick=()=>{if(blocked())return;if(movePhoto(state(),photos(),p.id,offset)){write();render();root.querySelector(`[data-photo-id="${p.id}"]`)?.focus();}};tile.append(button);}
    $('final-grid').append(tile);
   });
  }
 }
 function expireToast(){clearTimeout(timer);timer=setTimeout(()=>{if($('final-toast').contains(document.activeElement))return;hideToast();},5000);}
 function hideToast(){clearTimeout(timer);$('final-toast').hidden=true;toastSide=null;}
 function showToast(){toastSide=state().side;$('final-toast').hidden=false;expireToast();}
 function decide(value){if(!active||$('final-photo').dataset.loading==='true'||blocked()||performance.now()<lock)return;hideToast();if(finalDecision(state(),active.id,value)){lock=performance.now()+350;write();render();if(value==='reject')showToast();}}
 function undo(){if(blocked()||(toastSide&&toastSide!==state().side))return;if(undoFinal(state())){hideToast();lock=0;write();render();}}
 function openPhoto(id){modalId=id;focusId=id;setImage($('final-large'),id);dialog.showModal();$('final-close').focus();}
 function closePhoto(){dialog.close();modalId=null;root.querySelector(`[data-photo-id="${focusId}"]`)?.focus();}
 $('final-close').onclick=closePhoto;
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePhoto();}});
 $('final-discard').onclick=()=>{if(!modalId||$('final-large').dataset.loading==='true'||blocked())return;const id=modalId;if(finalDecision(state(),id,'reject')){closePhoto();write();render();showToast();$('final-order').focus();}};
 $('final-swipe').onclick=()=>{view='review';render();};$('final-order').onclick=()=>{view='order';render();};
 $('final-more').onclick=()=>{page=(page+1)*24<shared().length?page+1:0;render();};
 $('final-reject').onclick=()=>decide('reject');$('final-keep').onclick=()=>decide('keep');$('final-undo').onclick=undo;$('final-toast-undo').onclick=undo;
 $('final-toast').addEventListener('pointerenter',()=>clearTimeout(timer));$('final-toast').addEventListener('pointerleave',expireToast);
 $('final-toast').addEventListener('focusin',()=>clearTimeout(timer));$('final-toast').addEventListener('focusout',expireToast);
 root.addEventListener('pointerdown',()=>{if(!$('final-toast').hidden)expireToast();});
 root.addEventListener('keydown',e=>{if(!$('final-toast').hidden)expireToast();if(dialog.open||view!=='review'||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='ArrowRight'){e.preventDefault();decide('keep');}if(e.key==='ArrowLeft'){e.preventDefault();decide('reject');}if(e.key.toLowerCase()==='z'){e.preventDefault();undo();}});
 stage.onpointerdown=e=>{if(e.button!==0||!active||blocked()||performance.now()<lock)return;if(gesture){clearGesture();return;}gesture={id:e.pointerId,x:e.clientX,y:e.clientY,axis:null};stage.setPointerCapture(e.pointerId);};
 stage.onpointermove=e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.axis&&Math.hypot(dx,dy)>10)gesture.axis=Math.abs(dx)>Math.abs(dy)*1.8?'x':'cancel';if(gesture.axis==='x'){$('final-photo').style.transform=`translateX(${dx}px) rotate(${reduced.matches?0:Math.max(-4,Math.min(4,dx/45))}deg)`;$('final-cue').textContent=dx>0?'Keep':'Discard';}};
 stage.onpointerup=e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,commit=gesture.axis==='x'&&Math.abs(dx)>=Math.max(60,Math.min(110,stage.clientWidth*.22))&&Math.abs(dx)>Math.abs(dy)*1.8;clearGesture();if(commit)decide(dx>0?'keep':'reject');};
 stage.onpointercancel=stage.onlostpointercapture=clearGesture;window.addEventListener('blur',clearGesture);
 return {show(){hideToast();render();},hide(){clearGesture();hideToast();if(dialog.open)dialog.close();}};
}
