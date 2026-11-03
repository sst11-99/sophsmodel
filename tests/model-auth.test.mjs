import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('email login never creates an account and returns only to the login page', async () => {
 const requests=[];
 const context={window:{modelingSupabaseConfig:{url:'https://project.example',publishableKey:'test-publishable'}},location:{origin:'https://sophs.example'},fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({})};}};
 vm.runInNewContext(await readFile(new URL('../model-auth.js',import.meta.url),'utf8'),context);
 await context.window.ModelAuth.signIn(' approved@example.com ');
 assert.equal(requests.length,1);
 assert.deepEqual(JSON.parse(requests[0].options.body),{email:'approved@example.com',create_user:false});
 const url=new URL(requests[0].url);
 assert.equal(url.pathname,'/auth/v1/otp');
 assert.equal(url.searchParams.get('redirect_to'),'https://sophs.example/model-login.html');
});
