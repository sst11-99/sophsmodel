export const KEY = 'sophs.sophie.swipe-demo.v1';
const side = () => ({position:0, decisions:{}, history:[]});
export const fresh = () => ({version:1, side:'agency', limit:50, agency:side(), model:side()});
export function decide(state, ids, expected, decision) {
  const s=state[state.side], id=ids[s.position];
  if (!id || id!==expected || !['keep','reject'].includes(decision)) return false;
  s.history.push({id,side:state.side,previous:s.decisions[id]??null,next:decision,position:s.position});
  s.decisions[id]=decision; s.position++; return true;
}
export function undo(state) {
  const s=state[state.side], item=s.history.pop(); if (!item) return false;
  if(item.previous===null) delete s.decisions[item.id]; else s.decisions[item.id]=item.previous;
  s.position=item.position; return true;
}
export function restore(raw, allIds) {
  if(!raw) return fresh();
  const s=JSON.parse(raw), known=new Set(allIds);
  if(s.version!==1 || !['agency','model'].includes(s.side) || ![50,allIds.length].includes(s.limit)) throw Error('Invalid demo data');
  for(const role of ['agency','model']) {
    const t=s[role];
    if(!t || !Number.isInteger(t.position) || t.position<0 || t.position>Math.min(s.limit,allIds.length) || !Array.isArray(t.history) || !t.decisions || typeof t.decisions!=='object') throw Error('Invalid demo data');
    for(const [id,v] of Object.entries(t.decisions)) if(!known.has(id)||!['keep','reject'].includes(v)) throw Error('Invalid choice');
    for(const h of t.history) if(h.side!==role || !Number.isInteger(h.position) || allIds[h.position]!==h.id || ![null,'keep','reject'].includes(h.previous)||!['keep','reject'].includes(h.next)) throw Error('Invalid history');
  }
  return s;
}
export function persist(storage,state) {
  try {storage.setItem(KEY,JSON.stringify(state)); return true;} catch {return false;}
}
export function track(g,x,y) {
  const dx=x-g.x,dy=y-g.y;
  if(!g.axis && Math.hypot(dx,dy)>10) g.axis=Math.abs(dx)>Math.abs(dy)*1.8?'x':'cancel';
  return {dx,dy,axis:g.axis};
}
export function direction(g,x,y,width) {
  const {dx,dy,axis}=track(g,x,y);
  return axis==='x' && Math.abs(dx)>=Math.max(60,Math.min(110,width*.22)) && Math.abs(dx)>Math.abs(dy)*1.8 ? (dx>0?'keep':'reject'):null;
}

export function keptPhotos(state,photos,finalView=false){
  return photos.slice(0,state.limit).filter(p=>finalView
    ? state.agency.decisions[p.id]==='keep' && state.model.decisions[p.id]==='keep'
    : state[state.side].decisions[p.id]==='keep');
}
