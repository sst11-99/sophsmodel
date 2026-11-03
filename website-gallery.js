'use strict';
(()=>{
 const endpoint='https://zyzwvrogeudwvackduau.supabase.co/functions/v1/website-gallery/sophie';
 let container=null,timer=null,epoch=0,version=null,controller=null;
 const clear=()=>{clearTimeout(timer);controller?.abort();controller=null;};
 function message(text){if(!container)return;container.replaceChildren();const p=document.createElement('p');p.className='gallery-message';p.textContent=text;container.append(p);}
 async function refresh(ticket){
  if(!container||ticket!==epoch)return;
  controller=new AbortController();const deadline=setTimeout(()=>controller?.abort(),10000);
  try{
   const response=await fetch(endpoint,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Unavailable');
   const data=await response.json();if(ticket!==epoch)return;
   if(!Array.isArray(data.photos)||typeof data.version!=='string'||data.photos.some(p=>!/^[-0-9a-f]{36}$/.test(p.id)))throw Error('Invalid gallery');
   if(version!==data.version){version=data.version;const scroll=container.scrollTop;
    container.replaceChildren(...data.photos.map((p,i)=>{
     const figure=document.createElement('figure'),zoom=document.createElement('a'),image=document.createElement('img'),download=document.createElement('a');
     zoom.href=endpoint+'/'+p.id+'/zoom';zoom.target='_blank';zoom.rel='noopener';zoom.setAttribute('aria-label','Open full-resolution photo '+(i+1));
     image.loading='lazy';image.decoding='async';image.width=p.width;image.height=p.height;image.alt='Sophie Trau · photo '+(i+1);image.sizes='(max-width: 540px) 44vw, 240px';image.srcset=endpoint+'/'+p.id+'/display 640w, '+endpoint+'/'+p.id+'/large 1280w';image.src=endpoint+'/'+p.id+'/display';
     download.href=endpoint+'/'+p.id+'/download';download.textContent='Download';download.setAttribute('aria-label','Download full-resolution photo '+(i+1));zoom.append(image);figure.append(zoom,download);return figure;
    }));container.scrollTop=scroll;if(!data.photos.length)message('Photos coming soon');
   }
  }catch(error){if(ticket===epoch){version=null;message('Gallery temporarily unavailable. Please try again shortly.');}}
  finally{clearTimeout(deadline);if(ticket===epoch&&container)timer=setTimeout(()=>refresh(ticket),5000);}
 }
 window.SophieWebsiteGallery={mount(node){clear();epoch++;container?.classList.remove('live-final-gallery');container=node;version=null;if(container){container.classList.add('live-final-gallery');message('Loading photos…');void refresh(epoch);}}};
 window.addEventListener('pagehide',()=>{clear();epoch++;container=null;});
})();
