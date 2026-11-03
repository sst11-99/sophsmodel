export const MAX_AGE=30*24*60*60*1000;
export function readDraft(storage,key,now=Date.now()) {
 try {
  const d=JSON.parse(storage.getItem(key)||'null');
  if(!d||d.version!==1||!Number.isFinite(d.savedAt)||now-d.savedAt>MAX_AGE||d.savedAt>now+60000) return null;
  if(!Number.isInteger(d.step)||d.step<0||d.step>2||!['en','th'].includes(d.language))return null;
  if(typeof d.name!=='string'||d.name.length>100||typeof d.note!=='string'||d.note.length>1000)return null;
  if(!Array.isArray(d.choices)||d.choices.length!==2||!d.choices.every(a=>Array.isArray(a)&&a.length<=30&&a.every(x=>typeof x==='string'&&x.length>0&&x.length<=80)))return null;
  if(!Array.isArray(d.custom)||d.custom.length!==2||!d.custom.every(x=>typeof x==='string'&&x.length<=80))return null;
  if(d.requestId!==null&&!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.requestId))return null;
  if(typeof d.done!=='boolean')return null;
  return d;
 } catch { return null; }
}
export function writeDraft(storage,key,draft,now=Date.now()) {
 try {storage.setItem(key,JSON.stringify({...draft,version:1,savedAt:now}));return true;}catch{return false;}
}
