const LABELS = {face:'Front · Close-up','mid-length':'Front · Mid-length',profile:'Side profile','full-length':'Full length',jeans:'Full length · Alternate','other-one':'Portfolio','other-two':'Other'};
const clean = (value,limit=300) => String(value ?? '').replace(/[\r\n\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g,' ').trim().slice(0,limit);
export function ageAt(birthday, at) {
  const b=String(birthday).slice(0,10), d=String(at).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(b)||!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Invalid date');
  return Number(d.slice(0,4))-Number(b.slice(0,4))-(d.slice(5)<b.slice(5)?1:0);
}
export function photoPaths(a) {
  if(!/^[0-9a-f-]{36}$/i.test(a.id)||!Array.isArray(a.photo_manifest)||a.photo_manifest.length<1||a.photo_manifest.length>13) throw new Error('Invalid manifest');
  const counts={};
  const paths=a.photo_manifest.map(p=>{
    if(!Object.hasOwn(LABELS,p.slot)||typeof p.path!=='string'||!p.path.startsWith(a.id+'/')) throw new Error('Invalid photo owner');
    const file=p.path.slice(a.id.length+1);
    const m=file.match(/^(face|mid-length|profile|full-length|jeans|other-one|other-two)(?:-([234]))?\.(jpg|jpeg|png)$/);
    if(!m||m[1]!==p.slot||(m[2]&&!p.slot.startsWith('other-'))) throw new Error('Invalid photo slot');
    counts[p.slot]=(counts[p.slot]||0)+1;
    if(counts[p.slot]>(p.slot.startsWith('other-')?4:1)) throw new Error('Too many slot photos');
    return p.path;
  });
  if(new Set(paths).size!==paths.length) throw new Error('Duplicate photos');
  return paths;
}
export function buildMessages(a,urls) {
  const paths=photoPaths(a);
  if(urls.length!==paths.length||urls.some(u=>!String(u).startsWith('https://'))) throw new Error('Missing photo access');
  const lines=[`New application · ${a.id.slice(0,8)}`,`${clean(a.full_name,120)} · ${ageAt(a.date_of_birth,a.created_at)} · ${clean(a.city,120)}`,
    `Division: ${clean(a.division,20)}`,`Height: ${a.height_cm} cm · Shoes: EU ${a.shoe_eu}`,`Bust / Waist / Hips: ${a.bust_cm} / ${a.waist_cm} / ${a.hips_cm} cm`,
    `Experience: ${clean(a.experience,600)||'Not specified'}`];
  for(const [label,channels] of [['Contact',a.contact_channels],['Social',a.social_channels]]) {
    const allowed=label==='Contact'?['Line','WhatsApp','Phone']:['Instagram','TikTok','Facebook'];
    for(const k of allowed) if(channels?.[k]) lines.push(`${k}: ${clean(channels[k],200)}`);
  }
  if(a.email) lines.push(`Email: ${clean(a.email,320)}`);
  if(typeof a.walking_video_url === 'string' && a.walking_video_url.length <= 1500 && /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:[/?#][^\s]*)?$/i.test(a.walking_video_url)) lines.push(`Walking video: ${a.walking_video_url}`);
  lines.push(`${paths.length} photos · swipe gallery below`,`Submitted: ${new Date(a.created_at).toLocaleString('en-GB',{timeZone:'Asia/Bangkok',hour12:false})} (Bangkok)`,
    'Internal review only. Originals remain in Supabase. Photo links expire after 7 days.');
  const bubbles=a.photo_manifest.map((p,i)=>({
    type:'bubble',size:'mega',hero:{type:'image',url:urls[i],size:'full',aspectRatio:'3:4',aspectMode:'fit',action:{type:'uri',label:'Open photo',uri:urls[i]}},
    body:{type:'box',layout:'vertical',contents:[{type:'text',text:LABELS[p.slot],weight:'bold',size:'sm'},{type:'text',text:`${i+1} / ${paths.length} · ${a.id.slice(0,8)}`,size:'xs',color:'#777777'}]}
  }));
  // LINE allows twelve bubbles per carousel; the seventh slot permits thirteen photos.
  const galleries=[];
  for(let start=0;start<bubbles.length;start+=12){
    galleries.push({type:'flex',altText:`Application photos · ${clean(a.full_name,100)} · ${a.id.slice(0,8)}`,contents:{type:'carousel',contents:bubbles.slice(start,start+12)}});
  }
  return [{type:'text',text:lines.join('\n')},...galleries];
}
