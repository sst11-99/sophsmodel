// Discovery only: do not retain message content or send conversational replies.
const reply=(status:number)=>new Response(JSON.stringify({ok:status===200}),{status,headers:{'Content-Type':'application/json'}});
Deno.serve(async req=>{
  if(req.method!=='POST') return reply(405);
  const secret=Deno.env.get('LINE_CHANNEL_SECRET');
  if(!secret) return reply(503);
  const raw=await req.text();
  if(raw.length>1000000) return reply(413);
  try {
    const signature=req.headers.get('x-line-signature')||'';
    const bytes=Uint8Array.from(atob(signature),c=>c.charCodeAt(0));
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw))) return reply(403);
  } catch {return reply(403);}
  try {
    const payload=JSON.parse(raw);
    if(!Array.isArray(payload.events)) return reply(400);
    const token=Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
    const keys=Deno.env.get('SUPABASE_SECRET_KEYS');
    const dbKey=keys?JSON.parse(keys).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!token||!dbKey) return reply(503);
    for(const event of payload.events.slice(0,100)) {
      const groupId=event.source?.type==='group'?event.source.groupId:null;
      if(!/^C[0-9a-f]{32}$/i.test(groupId||'')) continue;
      const r=await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
      if(!r.ok) continue;
      const group=await r.json();
      if(group.groupId!==groupId||typeof group.groupName!=='string') continue;
      const saved=await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/record_line_group`,{method:'POST',headers:{apikey:dbKey,Authorization:`Bearer ${dbKey}`,'Content-Type':'application/json'},body:JSON.stringify({p_group_id:groupId,p_name:group.groupName.slice(0,200)}),signal:AbortSignal.timeout(10000)});
      if(!saved.ok) return reply(503);
    }
    return reply(200);
  } catch {return reply(503);}
});
