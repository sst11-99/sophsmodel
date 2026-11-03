import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMessages, photoPaths, ageAt } from '../supabase/functions/application-line-alert/format.mjs';

const applicant = {id:'11111111-1111-4111-8111-111111111111', full_name:'Demo Person', date_of_birth:'2003-09-10', created_at:'2026-09-09T08:00:00Z', city:'Bangkok', division:'female', height_cm:172, bust_cm:82, waist_cm:61, hips_cm:89, shoe_eu:38, experience:'Runway', photo_manifest:[{slot:'face',path:'11111111-1111-4111-8111-111111111111/face.jpg'}]};
test('age is calculated at submission, including birthday boundary',()=>{
  assert.equal(ageAt('2003-09-10','2026-09-09'),22);
  assert.equal(ageAt('2003-09-10','2026-09-10'),23);
});
test('summary has canonical measurements and no raw DOB or AI fields',()=>{
  const messages=buildMessages({...applicant,ai_summary:'PRIVATE'},['https://example.com/photo']);
  assert.match(messages[0].text,/172 cm/); assert.match(messages[0].text,/82 \/ 61 \/ 89/);
  assert.doesNotMatch(messages[0].text,/2003-09-10|PRIVATE/);
  assert.equal(messages[1].contents.contents[0].body.contents[0].text,'Front · Close-up');
});
test('rejects photo paths belonging to another applicant or traversal',()=>{
  for(const path of ['other/face.jpg',applicant.id+'/../face.jpg',applicant.id+'/face.svg']){
    assert.throws(()=>photoPaths({...applicant,photo_manifest:[{slot:'face',path}]}));
  }
});
test('supports all twelve labelled photos in one carousel',()=>{
  const slots=['face','profile','full-length','jeans','other-one','other-one','other-one','other-one','other-two','other-two','other-two','other-two'];
  const a={...applicant,photo_manifest:slots.map((slot,i)=>({slot,path:`${applicant.id}/${slot}${i>4 && i<8?'-'+(i-3):i>8?'-'+(i-7):''}.jpg`}))};
  assert.equal(photoPaths(a).length,12);
  assert.equal(buildMessages(a,slots.map(()=> 'https://example.com/photo'))[1].contents.contents.length,12);
});
test('does not pretend photos were delivered if URLs are missing',()=>{
  assert.throws(()=>buildMessages(applicant,[]));
});
