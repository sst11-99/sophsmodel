'use strict';
(function(root){
 const values=['favourite','reject'];
 root.createReviewChoiceToggle=function({value,onCommit,disabled=false,label='Photo choice'}){
  const control=document.createElement('div');control.className='actions choice-slider';control.dataset.choiceValue='slider';control.setAttribute('role','slider');control.setAttribute('aria-label',label);control.setAttribute('aria-orientation','horizontal');control.setAttribute('aria-valuemin','0');control.setAttribute('aria-valuemax','2');
  const thumb=document.createElement('span');thumb.className='choice-thumb';thumb.setAttribute('aria-hidden','true');control.append(thumb);
  const labels=values.map((choice,index)=>{const text=document.createElement('span');text.className='choice-label';text.textContent=index===0?'Favourite':'Reject';text.setAttribute('aria-hidden','true');control.append(text);return text;});
  let saved=value,busy=false,gesture=null,suppressClick=false;
  control.setDisabled=state=>{control.disabled=!!state;control.tabIndex=state?-1:0;control.setAttribute('aria-disabled',String(!!state));};control.setDisabled(disabled);
  const unavailable=()=>busy||control.disabled;
  const paint=position=>{const known=Number.isFinite(position);control.style.setProperty('--choice-slide',known?position:0.5);control.dataset.hasChoice=String(known);labels.forEach((text,index)=>{text.dataset.visualSelected=String(known&&index===Math.round(position));});};
  const sync=()=>{const index=values.indexOf(saved);control.setAttribute('aria-valuenow',String(index<0?1:index*2));control.setAttribute('aria-valuetext',index<0?'No choice selected. Slide left for Favourite or right for Reject.':index===0?'Favourite':'Reject');paint(index<0?null:index);};
  const commit=async choice=>{
   if(unavailable())return false;
   if(saved===choice){sync();return false;}
   busy=true;control.setAttribute('aria-busy','true');paint(values.indexOf(choice));
   try{const result=await onCommit(choice);if(result===false){sync();return false;}saved=choice;sync();return true;}catch{sync();return false;}
   finally{busy=false;control.setAttribute('aria-busy','false');}
  };
  const position=x=>{const rect=control.getBoundingClientRect();return Math.max(0,Math.min(1,(x-rect.left-rect.width/4)/(rect.width/2)));};
  const stop=restore=>{const pointer=gesture?.pointer;gesture=null;control.classList.remove('sliding');if(pointer!==undefined&&control.hasPointerCapture?.(pointer))control.releasePointerCapture(pointer);if(restore)sync();};
  control.onpointerdown=event=>{suppressClick=true;if(unavailable()||event.isPrimary===false||event.button!==0)return;gesture={pointer:event.pointerId,x:event.clientX,y:event.clientY,mode:'pending'};control.setPointerCapture?.(event.pointerId);};
  control.onpointermove=event=>{
   if(!gesture||gesture.pointer!==event.pointerId)return;const dx=Math.abs(event.clientX-gesture.x),dy=Math.abs(event.clientY-gesture.y);
   if(dy>8&&dy>=dx){stop(true);return;}
   if(gesture.mode==='pending'&&dx>8&&dx>dy*1.2){gesture.mode='horizontal';control.setPointerCapture?.(event.pointerId);control.classList.add('sliding');}
   if(gesture.mode==='horizontal'){event.preventDefault();paint(position(event.clientX));}
  };
  control.onpointerup=event=>{
   if(!gesture||gesture.pointer!==event.pointerId)return;const rect=control.getBoundingClientRect();stop(false);
   event.preventDefault();if(event.clientY<rect.top-20||event.clientY>rect.bottom+20){sync();return;}void commit(values[Math.round(position(event.clientX))]);
  };
  control.onclick=event=>{event.preventDefault();if(suppressClick){suppressClick=false;return;}if(Number.isFinite(event.clientX))void commit(values[Math.round(position(event.clientX))]);};
  control.onpointercancel=()=>stop(true);control.onlostpointercapture=()=>{if(gesture)stop(true);};
  control.onkeydown=event=>{
   if(event.key==='Escape'){if(gesture){event.preventDefault();stop(true);}return;}
   const target={ArrowLeft:0,Home:0,ArrowRight:1,End:1}[event.key];if(target===undefined||unavailable())return;event.preventDefault();void commit(values[target]);
  };
  sync();return control;
 };
 root.reviewChoiceFocus={
  capture(grid){const active=document.activeElement,card=active?.closest?.('[data-photo-id]');return card&&grid.contains(active)&&active.dataset.choiceValue?{id:card.dataset.photoId}:null;},
  restore(grid,saved){if(!saved||document.activeElement&&document.activeElement!==document.body&&document.activeElement.isConnected)return;const card=[...grid.querySelectorAll('[data-photo-id]')].find(item=>item.dataset.photoId===saved.id);const slider=card?.querySelector('.choice-slider');if(slider&&!slider.disabled)slider.focus({preventScroll:true});}
 };
})(typeof window==='undefined'?globalThis:window);
