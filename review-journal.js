'use strict';
(function(root){
 // Web Locks keep an active tab's journal private; a closed tab releases its lock,
 // allowing the next authorized visit to recover that durable journal.
 async function claim({storage,scope,locks,id=()=>crypto.randomUUID()}){
  if(!locks?.request)throw Error('This browser cannot safely recover review choices. Use a browser with Web Locks support.');
  const keys=[];
  for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(scope+':')){const data=JSON.parse(storage.getItem(key)||'{}');if(Object.keys(data).length)keys.push(key);}}
  keys.push(scope+':'+id());
  for(const key of keys){
   let release;const lifetime=new Promise(resolve=>{release=resolve;});
   let answer;const available=new Promise(resolve=>{answer=resolve;});
   locks.request(key,{ifAvailable:true},async lock=>{answer(!!lock);if(lock)await lifetime;}).catch(()=>answer(false));
   if(await available)return{key,release};
  }
  throw Error('Could not open the pending-choice journal. Retry this page.');
 }
 root.ReviewJournal={claim};
})(typeof window==='undefined'?globalThis:window);
