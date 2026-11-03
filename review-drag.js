'use strict';
(function(root){
 root.reviewOrderFocus={
  capture(grid){const active=document.activeElement,card=active?.closest?.('[data-order-id]');return card&&grid.contains(active)&&active.dataset.orderAction?{id:card.dataset.orderId,action:active.dataset.orderAction}:null;},
  restore(grid,saved){if(!saved||document.activeElement&&document.activeElement!==document.body&&document.activeElement.isConnected)return;const card=[...grid.querySelectorAll('[data-order-id]')].find(item=>item.dataset.orderId===saved.id);if(!card)return;const controls=[...card.querySelectorAll('[data-order-action]')],target=controls.find(item=>item.dataset.orderAction===saved.action&&!item.disabled)||controls.find(item=>item.dataset.orderAction==='drag');target?.focus({preventScroll:true});}
 };
 // Distance to a card, including the space beside it. Keep the current target
 // around a boundary until the pointer has made a deliberate move past it.
 root.reviewInsertionTarget=function(cards,x,y,previous=null,{reach=56,hysteresis=14}={}){
  const distance=box=>Math.hypot(Math.max(box.left-x,0,x-box.right),Math.max(box.top-y,0,y-box.bottom));
  const candidates=cards.map(card=>({...card,distance:distance(card.box)})).sort((a,b)=>a.distance-b.distance);
  let target=candidates[0];if(!target||target.distance>reach)return null;
  const old=candidates.find(card=>card.id===previous?.id);
  if(old&&old.distance<=reach&&old.distance<target.distance+hysteresis)target=old;
  const horizontal=cards.some(card=>card.id!==target.id&&Math.abs(card.box.top-target.box.top)<24);
  const axis=horizontal?'x':'y',center=horizontal?(target.box.left+target.box.right)/2:(target.box.top+target.box.bottom)/2,value=horizontal?x:y;
  let edge=value<center?'before':'after';
  if(previous?.id===target.id&&previous.axis===axis&&Math.abs(value-center)<hysteresis)edge=previous.edge;
  return {id:target.id,axis,edge};
 };
 // The moving photo, rather than the pointer hotspot, determines intent.
 // One-third overlap picks up the neighbouring slot; a smaller exit threshold
 // keeps that slot stable around the boundary.
 root.reviewOverlapTarget=function(cards,dragged,origin,sourceId,previous=null){
  const overlap=(a,b,start,end)=>Math.max(0,Math.min(a[end],b[end])-Math.max(a[start],b[start]));
  const eligible=cards.filter(card=>card.id!==sourceId).map(card=>{
   const box=card.box,horizontal=Math.abs(box.top-origin.top)<24,axis=horizontal?'x':'y';
   const along=horizontal?overlap(dragged,box,'left','right')/(box.right-box.left):overlap(dragged,box,'top','bottom')/(box.bottom-box.top);
   const across=horizontal?overlap(dragged,box,'top','bottom')/Math.min(dragged.bottom-dragged.top,box.bottom-box.top):overlap(dragged,box,'left','right')/Math.min(dragged.right-dragged.left,box.right-box.left);
   const threshold=previous?.id===card.id&&previous.kind==='overlap'?1/3-.08:1/3;
   return {...card,axis,along,across,threshold,distance:Math.hypot((dragged.left+dragged.right-box.left-box.right)/2,(dragged.top+dragged.bottom-box.top-box.bottom)/2)};
  }).filter(card=>card.along>=card.threshold&&card.across>=.25).sort((a,b)=>a.distance-b.distance);
  let target=eligible[0];if(!target)return null;
  const old=eligible.find(card=>card.id===previous?.id);if(old&&old.distance<target.distance+14)target=old;
  const forward=target.axis==='x'?target.box.left>=origin.left:target.box.top>=origin.top;
  return {id:target.id,axis:target.axis,edge:forward?'after':'before',kind:'overlap'};
 };
 // Only visual transforms change during a gesture. DOM order and queues stay intact.
 root.reviewLongPress=function(handle,{id,getIds,move,getCards=()=>[...(handle.closest?.('#grid')?.querySelectorAll('[data-order-id]')||[])],locate=document.elementFromPoint.bind(document),announce=()=>{},scroll=dy=>root.scrollBy?.(0,dy),height=()=>root.innerHeight||0,delay=350}){
  let gesture=null,timer=null,frame=null,suppressClick=false,marked=null;
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const touchBridge=!!handle.addEventListener&&'ontouchstart' in root;
  const clearMark=()=>{if(marked){delete marked.dataset.dropEdge;delete marked.dataset.dropAxis;marked=null;}};
  const openPhoto=handle.onclick;
  handle.onclick=event=>{if(suppressClick){suppressClick=false;event.preventDefault();return;}openPhoto?.(event);};
  handle.ondragstart=event=>event.preventDefault();
  const stop=(notify=true)=>{
   clearMark();clearTimeout(timer);timer=null;if(frame!==null)root.cancelAnimationFrame?.(frame);frame=null;
   const old=gesture,owned=root.reviewDragOwner===handle;gesture=null;if(owned){root.reviewDragOwner=null;root.reviewDragActive=false;}
   if(old){old.animation?.cancel();old.ghost?.remove();for(const card of old.cards||[]){card.classList?.remove('drag-flow','drag-origin');if(card.style){card.style.transform='';card.style.removeProperty?.('--landing-opacity');}}
    handle.classList.remove('dragging');if(handle.style){handle.style.transform='';handle.style.zIndex='';}
    if(handle.hasPointerCapture?.(old.pointer))handle.releasePointerCapture(old.pointer);
   }
   if(owned&&notify)root.reviewDragSettled?.();
  };
  const visualOrder=(ids,before)=>{if(before===id)return ids;const next=ids.filter(photo=>photo!==id);next.splice(before===null?next.length:next.indexOf(before),0,id);return next;};
  const flow=()=>{
   if(!gesture)return;const ids=getIds(),next=visualOrder(ids,gesture.before),slots=gesture.geometry||[];
   // Keep one insertion marker. Neighbours stay still until the committed render.
   gesture.landing=slots[next.indexOf(id)]?.box;
  };
  const update=(x,y)=>{
   if(!gesture?.active)return;
   const origin=gesture.origin,dy=(root.scrollY||0)-(gesture.scrollY||0),dx=x-gesture.x,oy=y-gesture.y;
   const ids=getIds(),visibleIds=new Set(ids),cards=(gesture.cards||[]).filter(card=>visibleIds.has(card.dataset.orderId));
   if(cards.length&&origin){
    const geometry=gesture.geometry.map(card=>({...card,box:{...card.box,top:card.box.top-dy,bottom:card.box.bottom-dy}}));
    const base={left:origin.left,right:origin.right,top:origin.top-dy,bottom:origin.bottom-dy};
    const dragged={left:origin.left+dx,right:origin.right+dx,top:origin.top+oy,bottom:origin.bottom+oy};
    let target=root.reviewOverlapTarget(geometry,dragged,base,id,gesture.target);
    if(!target&&!geometry.some(card=>x>=card.box.left&&x<=card.box.right&&y>=card.box.top&&y<=card.box.bottom))target=root.reviewInsertionTarget(geometry,x,y,gesture.target);
    gesture.target=target;clearMark();gesture.before=id;
    if(target&&target.id!==id){gesture.before=target.edge==='after'?ids[ids.indexOf(target.id)+1]??null:target.id;
     const next=visualOrder(ids,gesture.before);if(next.some((photo,i)=>photo!==ids[i])){marked=cards.find(card=>card.dataset.orderId===target.id);marked.dataset.dropEdge=target.edge;marked.dataset.dropAxis=target.axis;}}
    flow();
   }else{
    const previous=handle.style?.pointerEvents;if(handle.style)handle.style.pointerEvents='none';const card=locate(x,y)?.closest('[data-order-id]');if(handle.style)handle.style.pointerEvents=previous;
    gesture.before=id;if(card){const target=card.dataset.orderId,box=card.getBoundingClientRect();if(ids.includes(target))gesture.before=y>box.top+box.height/2?ids[ids.indexOf(target)+1]??null:target;}
   }
   if(gesture.ghost){
    const landing=gesture.landing,near=landing&&gesture.before!==id?Math.max(0,1-Math.hypot(origin.left+dx-landing.left,origin.top+oy-(landing.top-dy))/Math.max(origin.width,origin.height)):0;
    const tilt=reduced()?'':` perspective(1000px) rotateX(${Math.max(-5,Math.min(5,-oy/70))}deg) rotateY(${Math.max(-7,Math.min(7,dx/60))}deg) rotate(${Math.max(-3,Math.min(3,dx/130))}deg) scale(1.025)`;
    gesture.ghost.style.transform=`translate(${dx}px, ${oy}px)`+tilt;gesture.ghost.style.opacity=reduced()?'.85':String(.94-near*.38);
    gesture.source?.style?.setProperty('--landing-opacity',String(reduced()?.3:.12+near*.48));
   }else if(handle.style){handle.style.transform=`translate(${dx}px, ${oy+dy}px)`;handle.style.zIndex='10';}
  };
  root.reviewEdgeSpeed=(y,h,heldMs)=>{
  const edge=y<72?-1:h&&y>h-72?1:0;if(!edge)return 0;
  const depth=Math.min(1,Math.max(0,edge<0?(72-y)/72:(y-h+72)/72));
  // Continuous acceleration through deliberate, time-based travel stages.
  const maximum=heldMs<700?600:heldMs<2000?600+(heldMs-700)*1.2:2160+Math.min(1840,(heldMs-2000)*.8);
  return edge*depth*maximum;
 };
 const edgeFrame=(time)=>{
   frame=null;if(!gesture?.active||gesture.finishing)return;
   const h=height(),y=gesture.lastY,now=Number.isFinite(time)?time:(gesture.frameTime||0)+16,dt=Math.min(32,Math.max(0,now-(gesture.frameTime??now-16))),direction=y<72?-1:h&&y>h-72?1:0;
   if(direction!==gesture.edgeDirection){gesture.edgeStart=now;gesture.edgeDirection=direction;}gesture.frameTime=now;
   const speed=root.reviewEdgeSpeed(y,h,now-(gesture.edgeStart??now))*dt/1000;
   if(speed){scroll(speed);update(gesture.lastX,y);}
   if(root.requestAnimationFrame)frame=root.requestAnimationFrame(edgeFrame);
  };
  const pick=()=>{
   if(!gesture)return;gesture.active=true;root.reviewDragActive=true;gesture.cards=getCards();gesture.origin=handle.getBoundingClientRect?.();gesture.scrollY=root.scrollY||0;
   gesture.geometry=gesture.cards.map(card=>{const box=card.getBoundingClientRect(),image=card.querySelector?.('.image-button'),h=image?.getBoundingClientRect?.().height||box.height;return {id:card.dataset.orderId,box:{left:box.left,right:box.right,top:box.top,bottom:box.top+h,width:box.width,height:h}};});
   gesture.source=gesture.cards.find(card=>card.dataset.orderId===id);
   if(handle.cloneNode&&document.body?.append&&gesture.origin){const ghost=handle.cloneNode(true),box=gesture.origin;ghost.removeAttribute('id');ghost.removeAttribute('data-order-action');ghost.setAttribute('aria-hidden','true');ghost.tabIndex=-1;ghost.className='drag-ghost';Object.assign(ghost.style,{position:'fixed',left:box.left+'px',top:box.top+'px',width:box.width+'px',height:box.height+'px'});document.body.append(ghost);gesture.ghost=ghost;gesture.source?.classList.add('drag-origin');for(const card of gesture.cards)card.classList?.add('drag-flow');}
   suppressClick=true;if(!gesture.nativeTouch)handle.setPointerCapture?.(gesture.pointer);handle.classList.add('dragging');announce('Photo lifted. Move freely to its new place.');
   if(root.requestAnimationFrame)frame=root.requestAnimationFrame(edgeFrame);
  };
  handle.onpointerdown=event=>{
   if(touchBridge&&event.pointerType==='touch'&&!event.nativeTouch)return;
   if(event.button!==0||event.isPrimary===false||gesture?.finishing||root.reviewDragOwner&&root.reviewDragOwner!==handle)return;stop();root.reviewDragOwner=handle;suppressClick=false;gesture={pointer:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,touch:event.pointerType!=='mouse',nativeTouch:!!event.nativeTouch,active:false,before:id};
   if(!gesture.touch)handle.setPointerCapture?.(event.pointerId);if(gesture.touch)timer=setTimeout(pick,delay);
  };
  handle.onpointermove=event=>{
   if(!gesture||gesture.pointer!==event.pointerId||gesture.finishing)return;
   if(gesture.scrolling){if(!gesture.nativeTouch)scroll(gesture.lastY-event.clientY);gesture.lastY=event.clientY;return;}
   if(!gesture.active){if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<=8)return;if(gesture.touch){clearTimeout(timer);timer=null;gesture.scrolling=true;suppressClick=true;if(!gesture.nativeTouch)scroll(gesture.lastY-event.clientY);gesture.lastY=event.clientY;return;}pick();}
   event.preventDefault();gesture.lastX=event.clientX;gesture.lastY=event.clientY;update(event.clientX,event.clientY);
  };
  handle.onpointerup=async event=>{
   if(!gesture||gesture.pointer!==event.pointerId||gesture.finishing)return;
   const old=gesture,before=old.before,changed=old.active&&before!==id&&visualOrder(getIds(),before).some((photo,i)=>photo!==getIds()[i]);
   if(old.ghost?.animate&&old.active&&!reduced()){
    old.finishing=true;const landing=changed?old.landing:old.origin,dy=(root.scrollY||0)-(old.scrollY||0);
    old.animation=old.ghost.animate([{transform:old.ghost.style.transform,opacity:old.ghost.style.opacity},{transform:`translate(${landing.left-old.origin.left}px, ${landing.top-old.origin.top-dy}px)`,opacity:.08}],{duration:210,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
    try{await old.animation.finished;}catch{}if(gesture!==old)return;
   }
   if(changed)root.reviewSkipOrderAnimation=true;
   stop(!changed);if(changed){try{const outcome=await move(id,before);announce(outcome?.status==='saved'?'Order saved on this device.':outcome?.status==='queued'?'Order pending on this device; awaiting server.':outcome?.status==='error'?(outcome.message||'Order could not be saved.'):'Order unchanged.');}catch{announce('Order could not be saved.');}finally{root.reviewDragSettled?.();}}
  };
  handle.onpointercancel=()=>{if(!gesture?.nativeTouch)stop();};handle.onlostpointercapture=()=>{if(!gesture?.finishing&&!gesture?.nativeTouch)stop();};handle.oncontextmenu=event=>{if(gesture?.active)event.preventDefault();};
  handle.onkeydown=event=>{if(event.key==='Escape'){stop();announce('Move cancelled.');}};
  if(touchBridge){
   const fromTouch=(event,touch)=>({button:0,isPrimary:true,pointerType:'touch',pointerId:touch.identifier,nativeTouch:true,clientX:touch.clientX,clientY:touch.clientY,preventDefault:()=>event.preventDefault()});
   handle.addEventListener('touchstart',event=>{if(event.touches.length!==1){stop();return;}handle.onpointerdown(fromTouch(event,event.touches[0]));},{passive:true});
   handle.addEventListener('touchmove',event=>{const touch=[...event.touches].find(t=>t.identifier===gesture?.pointer);if(touch)handle.onpointermove(fromTouch(event,touch));},{passive:false});
   handle.addEventListener('touchend',event=>{const touch=[...event.changedTouches].find(t=>t.identifier===gesture?.pointer);if(touch)void handle.onpointerup(fromTouch(event,touch));},{passive:true});
   handle.addEventListener('touchcancel',stop,{passive:true});
  }
 };
})(typeof window==='undefined'?globalThis:window);
