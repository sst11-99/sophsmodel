import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {buildMessages} from '../supabase/functions/application-line-alert/format.mjs';
const source = await readFile(new URL('../application.js', import.meta.url), 'utf8');
const context = vm.createContext({URL, window:{}, document:{querySelector:()=>null}});
vm.runInContext(source, context);
test('walking instructions explain sharing sources in English and Thai and offer a close control', async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const locale=await readFile(new URL('../locale.js',import.meta.url),'utf8');
  assert.match(html,/video of you walking from Instagram, Facebook, TikTok or Google Drive/);
  assert.match(locale,/วิดีโอเดินแบบของคุณจาก Instagram, Facebook, TikTok หรือ Google Drive/);
  assert.match(html,/data-walking-close aria-label="Close walking video"/);
  assert.doesNotMatch(html,/data-walking-remove/);
});
test('walking link is optional, bounded, HTTPS only, without credentials',()=>{
  assert.equal(context.walkingVideoUrl(''), null);
  for(const link of ['https://www.instagram.com/reel/example/', 'https://vt.tiktok.com/example/', 'https://youtu.be/example']) assert.equal(context.walkingVideoUrl(' '+link+' '),link);
  for(const link of ['javascript:alert(1)','http://example.com/x','https://user:pass@example.com/x','https://localhost/x','https://example.com/'+ 'a'.repeat(1500)]) assert.throws(()=>context.walkingVideoUrl(link));
});
test('walking link reaches LINE summary without becoming a hosted photo',()=>{
  const applicant={id:'11111111-1111-4111-8111-111111111111',full_name:'Test',date_of_birth:'2000-01-01',created_at:'2026-09-17',photo_manifest:[{slot:'face',path:'11111111-1111-4111-8111-111111111111/face.jpg'}],walking_video_url:'https://www.instagram.com/reel/example/'};
  const messages=buildMessages(applicant,['https://example.com/photo.jpg']);
  assert.match(messages[0].text,/Walking video: https:\/\/www.instagram.com\/reel\/example\//);
  assert.equal(messages[1].contents.contents.length,1);
  assert.doesNotMatch(buildMessages({...applicant,walking_video_url:'javascript:alert(1)'},['https://example.com/photo.jpg'])[0].text,/Walking video/);
});
