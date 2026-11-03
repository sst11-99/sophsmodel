import {validate} from './validation.mjs';
const allowed=new Set(['https://sophsmodel.vercel.app']);
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})};
 const reply=(status:number,b:unknown)=>new Response(JSON.stringify(b),{status,headers});
 if(origin&&!allowed.has(origin))return reply(403,{error:'Unavailable here'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'POST required'});
 let b;try{const raw=await req.text();if(raw.length>12000)return reply(413,{error:'Too large'});b=JSON.parse(raw);}catch{return reply(400,{error:'Invalid request'});}
 if(!validate(b))return reply(400,{error:'Check your answers'});
 try{
 // Custom authentication: server checks SHA-256 of a 256-bit invitation capability,
 // its expiry/revocation and bounded submission quota inside one DB transaction.
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(b.invite)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const keys=Deno.env.get('SUPABASE_SECRET_KEYS');const key=keys?JSON.parse(keys).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)throw Error('configuration');
 const result=await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/submit_model_preferences`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({p_hash:hash,p_id:b.id,p_name:b.name.trim(),p_interests:b.interests,p_talents:b.talents,p_note:b.note}),signal:AbortSignal.timeout(15000)});
 if(!result.ok)throw Error('storage');const data=await result.json();
 if(data.saved===true)return reply(200,{saved:true,id:data.id});
 return reply(data.error==='try_later'?429:data.error==='request_conflict'?409:403,{error:data.error==='try_later'?'Please try again shortly.':'This link is unavailable. Ask SOPHS for a fresh link.'});
 }catch{return reply(503,{error:'Couldn’t save. Please try again.'});}
});
