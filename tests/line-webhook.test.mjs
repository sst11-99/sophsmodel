import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
let handler;
globalThis.Deno={serve:fn=>handler=fn,env:{get:key=>({LINE_CHANNEL_SECRET:'test-only-secret',LINE_CHANNEL_ACCESS_TOKEN:'test-token',SUPABASE_SERVICE_ROLE_KEY:'test-server-key'}[key])}};
await import('../supabase/functions/line-group-webhook/index.ts');
test('webhook rejects unsigned input without processing it',async()=>{
 assert.equal((await handler(new Request('https://example.test',{method:'POST',body:'{"events":[]}'}))).status,403);
});
test('webhook accepts correctly signed LINE verification without sending messages',async()=>{
 const body='{"events":[]}';
 const signature=createHmac('sha256','test-only-secret').update(body).digest('base64');
 assert.equal((await handler(new Request('https://example.test',{method:'POST',body,headers:{'x-line-signature':signature}}))).status,200);
});
test('webhook rejects tampering after signing',async()=>{
 const signature=createHmac('sha256','test-only-secret').update('{"events":[]}').digest('base64');
 assert.equal((await handler(new Request('https://example.test',{method:'POST',body:'{"events":[],"changed":true}',headers:{'x-line-signature':signature}}))).status,403);
});
