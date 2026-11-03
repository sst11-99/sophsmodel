'use strict';
(function(root){
 // Keep lightweight, correctly sized slots for every saved photo. Only nearby
 // slots own images, choice controls and gesture handlers. Drag geometry remains
 // complete, including destinations far outside the viewport.
 root.ReviewViewport=class{
  constructor({grid,margin=900}){this.grid=grid;this.margin=margin;this.items=[];this.observer=null;}
  set(items,{focusId=null,disabled=false}={}){
   this.observer?.disconnect();this.items=items;this.mountMs=0;
   const hydrate=item=>{if(item.live)return;item.live=true;const started=root.performance?.now?.()||0;item.mount();this.mountMs+=(root.performance?.now?.()||0)-started;item.card.dataset.hydrated='true';item.card.tabIndex=-1;};
   const release=item=>{if(!item.live||item.card.contains(document.activeElement)||root.reviewDragOwner&&item.card.contains(root.reviewDragOwner))return;item.live=false;item.unmount();delete item.card.dataset.hydrated;item.card.tabIndex=0;};
   for(const item of items){item.card.tabIndex=0;item.card.onfocus=()=>{hydrate(item);item.card.querySelector('.image-button')?.focus({preventScroll:true});};}
   if(disabled||!root.IntersectionObserver){items.forEach(hydrate);this.report();return;}
   const lookup=new Map(items.map(item=>[item.card,item]));
   this.observer=new root.IntersectionObserver(entries=>{for(const entry of entries){const item=lookup.get(entry.target);if(!item)continue;if(entry.isIntersecting)hydrate(item);else release(item);}this.report();},{rootMargin:this.margin+'px 0px'});
   for(const item of items){this.observer.observe(item.card);if(item.id===focusId)hydrate(item);}
   this.report();
  }
  report(){root.reviewViewportMetrics={slots:this.items.length,mounted:this.items.filter(item=>item.live).length,mountMs:this.mountMs};}
 };
})(typeof window==='undefined'?globalThis:window);
