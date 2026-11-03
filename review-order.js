'use strict';
(function(root){
 // Same durable intent/revision protocol as choices, with one shared collection row.
 class SharedReviewOrder {
  constructor({storage,key,read,write,online,notify=()=>{}}){
   this.row=null;this.notify=notify;this.acknowledgement=0;
   const merge=row=>{if(row&&(!this.row||row.revision>this.row.revision))this.row=row;return this.row;};
   this.read=async()=>merge(await read());
   this.queue=new ReviewSync({storage,key,online,read:()=>this.read(),write:async(_,selection,revision)=>{const row=await write(selection,revision);merge(row);return row&&row.revision===this.row.revision?row:null;},acknowledged:(_,row)=>{if(row.revision===this.row?.revision)this.acknowledgement++;},notify:()=>notify(this.state())});
  }
  state(){const job=this.queue.snapshot().order;return {order:job?.desired||this.row?.selection||{ids:[],manual:false},job,acknowledgement:this.acknowledgement};}
  async refresh(){await this.queue.request(()=>this.read());this.notify(this.state());await this.queue.flush();}
  move(ids,photo,before=null){
   if(!ids.includes(photo)||before!==null&&!ids.includes(before))return false;
   if(photo===before)return false;
   const next=ids.filter(id=>id!==photo),at=before===null?next.length:next.indexOf(before);next.splice(at,0,photo);
   if(next.every((id,i)=>id===ids[i]))return false;
   this.queue.enqueue('order',{ids:next,manual:true},this.row?.revision??null);return true;
  }
  resolve(useLocal){return this.queue.resolve('order',useLocal);}
  flush(){return this.queue.flush();}
  hasPending(){return !!this.queue.snapshot().order;}
 }
 root.SharedReviewOrder=SharedReviewOrder;
})(typeof window==='undefined'?globalThis:window);
