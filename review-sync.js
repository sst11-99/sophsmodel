'use strict';
// Each browser tab owns its journal key. Server revisions arbitrate every write.
(function(root){
 const clone=v=>JSON.parse(JSON.stringify(v));
 const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
 const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
 class ReviewSync {
  constructor({storage,key,read,write,notify=()=>{},online=()=>true,id=()=>crypto.randomUUID(),acknowledged=()=>{},schedule=root.setTimeout?.bind(root),cancel=root.clearTimeout?.bind(root),timeout=15000,retryDelays=[1000,3000,10000]}){
   Object.assign(this,{storage,key,read,write,notify,online,id,acknowledged,schedule,cancel,timeout,retryDelays});this.retryTimer=null;this.retryCount=0;this.running=false;this.jobs={};this.resolutions=new Map();
   const saved=storage.getItem(key);if(saved)this.jobs=JSON.parse(saved);
  }
  commit(){this.storage.setItem(this.key,JSON.stringify(this.jobs));this.notify(this.snapshot());}
  snapshot(){return clone(this.jobs);}
  async request(run){
   if(!this.schedule)return run();let timer;
   try{return await Promise.race([Promise.resolve().then(run),new Promise((_,reject)=>{timer=this.schedule(()=>reject(Error('Connection timed out. Changes remain on this device.')),this.timeout);})]);}
   finally{this.cancel?.(timer);}
  }
  complete(photo,job,row){
   delete this.jobs[photo];
   try{this.storage.setItem(this.key,JSON.stringify(this.jobs));}catch(error){this.jobs[photo]=job;throw error;}
   this.retryCount=0;this.acknowledged(photo,clone(row));this.notify(this.snapshot());
  }
  retryLater(){
   if(!this.schedule||this.retryTimer!==null||!this.online()||this.retryCount>=this.retryDelays.length)return;
   const retryable=Object.values(this.jobs).some(job=>job.status!=='conflict'&&job.error&&!/sign in|session expired|refresh.token|invalid.*token/i.test(job.error));
   if(retryable)this.retryTimer=this.schedule(()=>{this.retryTimer=null;void this.flush();},this.retryDelays[this.retryCount++]);
  }
  enqueue(photo,selection,revision=null){
   this.retryCount=0;const before=this.snapshot(),originalJobs={...this.jobs},job=this.jobs[photo];
   this.jobs[photo]=job?Object.assign(job,{desired:clone(selection),generation:job.generation+1}):{id:this.id(),revision,desired:clone(selection),generation:1,status:'pending'};
   try{this.commit();}catch(error){for(const [name,original] of Object.entries(originalJobs)){for(const key of Object.keys(original))delete original[key];Object.assign(original,before[name]);}this.jobs=originalJobs;throw Error('This browser could not retain your choice. Nothing was queued.');}
   void this.flush();return clone(selection);
  }
  async resolve(photo,useLocal){
   const job=this.jobs[photo];if(!job)return;
   const id=job.id,generation=job.generation,ticket={};this.resolutions.set(photo,ticket);
   const remote=await this.request(()=>this.read(photo));
   if(this.resolutions.get(photo)!==ticket||this.jobs[photo]?.id!==id||this.jobs[photo]?.generation!==generation)return;
   this.resolutions.delete(photo);const before=this.snapshot();
   if(useLocal){job.generation++;job.revision=remote?.revision??null;delete job.sent;job.status='pending';delete job.error;}
   else delete this.jobs[photo];
   try{this.commit();}catch(error){this.jobs=before;throw Error('This browser could not retain the resolution. Pending changes remain.');}void this.flush();return remote;
  }
  async flush(){
   if(this.running)return;
   if(this.retryTimer!==null){this.cancel?.(this.retryTimer);this.retryTimer=null;}
   if(!this.online())return;this.running=true;
   try{
    const processed=new Set();
    const next=()=>Object.keys(this.jobs).find(photo=>!processed.has(photo+':'+this.jobs[photo].id+':'+this.jobs[photo].generation));
    while(next()&&this.online()){
     const photo=next();processed.add(photo+':'+this.jobs[photo].id+':'+this.jobs[photo].generation);
     let job=this.jobs[photo];if(job.status==='conflict')continue;
     try{
      // Reconcile first: a previous request may have committed before its response was lost.
      const remote=await this.request(()=>this.read(photo));
      if(job.sent&&remote&&equal(remote.selection,job.sent.selection)){
       job.revision=remote.revision;
       if(job.generation===job.sent.generation){this.complete(photo,job,remote);continue;}
       delete job.sent;
      }else if((remote?.revision??null)!==job.revision){
       job.status='conflict';job.error='Changed elsewhere. Compare your pending choice with the saved version.';job.remote=remote;this.commit();continue;
      }
      while(this.jobs[photo]&&this.online()){
       job=this.jobs[photo];const sent={selection:clone(job.desired),generation:job.generation};
       job.sent=sent;job.status='pending';delete job.error;this.commit();
       const row=await this.request(()=>this.write(photo,sent.selection,job.revision));
       if(!row){job.status='conflict';job.remote=await this.request(()=>this.read(photo));job.error='Changed elsewhere. Review before saving.';this.commit();break;}
       job.revision=row.revision;
       if(job.generation===sent.generation){this.complete(photo,job,row);break;}
       delete job.sent;this.commit();
      }
     }catch(error){
      if(this.jobs[photo]){job.status='pending';job.error=error.message||'Connection interrupted.';try{this.commit();}catch{} }
      break; // Bounded backoff, explicit retry or reconnect; no request storm.
     }
    }
   }finally{this.running=false;this.notify(this.snapshot());this.retryLater();}
  }
 }
 root.ReviewSync=ReviewSync;
})(typeof window==='undefined'?globalThis:window);
