import {buildMessages, photoPaths} from './format.mjs';

const response=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const env=(name:string)=>{const value=Deno.env.get(name); if(!value) throw new Error('Configuration missing'); return value;};
async function boundedFetch(url:string,options:RequestInit={}) {return await fetch(url,{...options,signal:AbortSignal.timeout(20000)});}
function dbHeaders() {
  const keys=Deno.env.get('SUPABASE_SECRET_KEYS');
  const key=keys?JSON.parse(keys).default:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key) throw new Error('Server credential missing');
  return {'apikey':key,'Authorization':`Bearer ${key}`,'Content-Type':'application/json'};
}
async function rpc(name:string,args:unknown) {
  const r=await boundedFetch(`${env('SUPABASE_URL')}/rest/v1/rpc/${name}`,{method:'POST',headers:dbHeaders(),body:JSON.stringify(args)});
  if(!r.ok) throw new Error('Database operation failed');
  return await r.json();
}
async function line(path:string,options:RequestInit={}) {
  return await boundedFetch(`https://api.line.me/v2/bot/${path}`,{...options,headers:{'Authorization':`Bearer ${env('LINE_CHANNEL_ACCESS_TOKEN')}`,'Content-Type':'application/json',...options.headers}});
}
Deno.serve(async req=>{
  if(req.method!=='POST') return response(405,{error:'POST required'});
  let body;
  try {const raw=await req.text(); if(raw.length>2048) return response(413,{error:'Too large'}); body=JSON.parse(raw);} catch {return response(400,{error:'Invalid request'});}
  try {
    // Administrative read-only check. No application or LINE message is created.
    if(body.health===true) {
      if(req.headers.get('Authorization')!==`Bearer ${env('LINE_CHANNEL_ACCESS_TOKEN')}`) return response(403,{error:'Forbidden'});
      const bot=await line('info'),group=await line(`group/${env('LINE_APPLICATION_GROUP_ID')}/summary`),quota=await line('message/quota');
      return response(bot.ok&&group.ok&&quota.ok?200:503,{bot:bot.ok?await bot.json():{status:bot.status},group:group.ok?await group.json():{status:group.status},quota:quota.ok?await quota.json():{status:quota.status}});
    }
    if(!/^[0-9a-f-]{36}$/i.test(body.job_id??'')||! /^[0-9a-f]{64}$/i.test(body.dispatch_token??'')) return response(403,{error:'Forbidden'});
    // Custom authentication: per-event 256-bit capability; only server RPC can claim.
    const claim=await rpc('claim_line_application_event',{p_id:body.job_id,p_token:body.dispatch_token});
    if(!claim) return response(403,{error:'Invalid or unavailable event'});
    try {
      const a=claim.application;
      const urls=[];
      for(const path of photoPaths(a)) {
        const r=await boundedFetch(`${env('SUPABASE_URL')}/storage/v1/object/sign/model-applications/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:dbHeaders(),body:JSON.stringify({expiresIn:604800})});
        if(!r.ok) throw new Error('Photo unavailable');
        const result=await r.json();
        if(typeof result.signedURL!=='string'||!result.signedURL.startsWith('/object/sign/')) throw new Error('Invalid signed URL');
        urls.push(`${env('SUPABASE_URL')}/storage/v1${result.signedURL}`);
      }
      const sent=await line('message/push',{method:'POST',headers:{'X-Line-Retry-Key':claim.id},body:JSON.stringify({to:env('LINE_APPLICATION_GROUP_ID'),messages:buildMessages(a,urls)})});
      const accepted=sent.ok||(sent.status===409&&!!sent.headers.get('x-line-accepted-request-id'));
      await rpc('finish_line_application_event',{p_id:claim.id,p_lease:claim.lease_id,p_success:accepted,p_error:accepted?null:`LINE_HTTP_${sent.status}`,p_request_id:sent.headers.get('x-line-accepted-request-id')||sent.headers.get('x-line-request-id')});
      return response(accepted?200:502,{accepted});
    } catch {
      await rpc('finish_line_application_event',{p_id:claim.id,p_lease:claim.lease_id,p_success:false,p_error:'DELIVERY_OR_PHOTO_ERROR',p_request_id:null});
      return response(502,{error:'Delivery pending retry'});
    }
  } catch {return response(503,{error:'Service unavailable'});}
});
