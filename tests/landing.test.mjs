import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import locale from '../api/locale.js';

test('all twelve photos upload independently and are retained in the saved manifest', async () => {
  const calls = [];
  const context = { window: {}, fetch: async (url, options) => { calls.push({ url, options }); return { ok: true }; } };
  for (const file of ['supabase-config.js', 'backend.js']) vm.runInNewContext(await readFile(new URL('../' + file, import.meta.url), 'utf8'), context);
  const photos = ['face', 'profile', 'fullLength', 'jeans', 'otherOne', 'otherTwo'].flatMap((slot, i) => Array.from({length: i < 4 ? 1 : 4}, (_, index) => ({slot, index, file: {name:'same.jpg',type:'image/jpeg',size:100}})));
  await context.window.modelingBackend.submitApplication({id:'00000000-0000-4000-8000-000000000001', confirmed_accurate_and_adult:true, application_data_use_consent:true}, photos);
  assert.equal(calls.length, 13);
  assert.equal(new Set(calls.slice(0,12).map(c => c.url)).size, 12);
  const manifest = JSON.parse(calls[12].options.body).photo_manifest;
  assert.equal(manifest.length, 12);
  assert.equal(manifest.filter(p => p.slot === 'other-one').length, 4);
  assert.equal(manifest.filter(p => p.slot === 'other-two').length, 4);
});

test('country-based language defaults are private and never cached between visitors', () => {
  for (const [country, accept, expected] of [['TH','en','th'], ['US','th','en'], ['', 'th-TH,th;q=0.9', 'th'], ['', 'en', 'en']]) {
    let body, cache;
    const res = { setHeader: (name, value) => { if (name === 'Cache-Control') cache = value; }, status(code) { assert.equal(code, 200); return this; }, json(value) { body = value; } };
    locale({ headers: { 'x-vercel-ip-country': country, 'accept-language': accept } }, res);
    assert.deepEqual(body, { locale: expected });
    assert.match(cache, /private, no-store/);
  }
});

test('localized application retains canonical values and separate custom experiences through upload and insert', async () => {
  const calls = [];
  const values = new Map(Object.entries({ fullName: ' Test Model ', dateOfBirth: '2000-01-01', city: 'กรุงเทพ', contactType: 'Phone', contact: ' 123 ', contactLine: ' line-id ', contactWhatsApp: '+66123456789', email: 'test@example.com', socialType: 'Instagram', social: ' test ', socialTikTok: ' tiktok-id ', socialFacebook: 'facebook-id', experienceCategories: ['Runway', 'Advertising'], experienceOther: ['Dancing', ' Acting '], heightCm: '170', bustCm: '82', waistCm: '64', hipsCm: '90', shoeEu: '38', consent: 'on' }));
  const context = { document: { querySelector: () => null }, window: { modelingLocale: { locale: 'th' } }, crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' }, FormData: class { get(key) { return values.get(key) || null; } getAll(key) { return values.get(key) || []; } }, fetch: async (url, options) => { calls.push({ url, options }); return { ok: true }; } };
  for (const file of ['supabase-config.js', 'backend.js', 'application.js']) vm.runInNewContext(await readFile(new URL('../' + file, import.meta.url), 'utf8'), context);
  const payload = context.window.modelingApplication.applicationPayload({}, 'female');
  await context.window.modelingBackend.submitApplication(payload, [{ slot: 'face', file: { name: 'photo.JPG', type: 'image/jpeg', size: 200 } }]);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/face.jpg$/);
  assert.match(calls[1].url, /\/rest\/v1\/model_applications$/);
  const saved = JSON.parse(calls[1].options.body);
  assert.deepEqual(saved.experience_categories, ['Runway', 'Advertising']);
  assert.deepEqual(saved.experience_other, ['Dancing', 'Acting']);
  assert.equal(saved.city, 'กรุงเทพ');
  assert.equal(saved.contact, 'Phone: 123');
  assert.deepEqual(saved.contact_channels, {Line:'line-id', WhatsApp:'+66123456789', Phone:'123'});
  assert.deepEqual(saved.social_channels, {Instagram:'test', TikTok:'tiktok-id', Facebook:'facebook-id'});
  values.set('contact', '');
  values.set('contactPhone', 'stale');
  const switched = context.window.modelingApplication.applicationPayload({}, 'female');
  assert.equal(switched.contact, 'Line: line-id');
  assert.equal(switched.contact_channels.Phone, undefined, 'clearing the active field removes its previous stored value');
  assert.equal(saved.height_cm, 170);
  assert.equal(saved.opportunity_emails_opt_in, false);
  assert.equal(saved.photo_manifest[0].slot, 'face');
  values.set('opportunityEmails', 'on');
  assert.equal(context.window.modelingApplication.applicationPayload({}, 'female').opportunity_emails_opt_in, true);
  values.delete('opportunityEmails');
  values.delete('consent');
  const unchecked = context.window.modelingApplication.applicationPayload({}, 'female');
  assert.equal(unchecked.opportunity_emails_opt_in, false);
  assert.equal(unchecked.application_data_use_consent, false);
  await assert.rejects(context.window.modelingBackend.submitApplication(unchecked, []), /Confirm the application details/);
  assert.equal(calls.length, 2, 'unchecked required confirmation prevents further uploads or inserts');
});

test('failed photo upload does not insert an incomplete application', async () => {
  const calls = [];
  const context = { window: {}, fetch: async (url) => { calls.push(url); return { ok: false }; } };
  for (const file of ['supabase-config.js', 'backend.js']) vm.runInNewContext(await readFile(new URL('../' + file, import.meta.url), 'utf8'), context);
  await assert.rejects(context.window.modelingBackend.submitApplication({ id: 'example', confirmed_accurate_and_adult: true, application_data_use_consent: true }, [{ slot: 'face', file: { name: 'photo.jpg', type: 'image/jpeg', size: 200 } }]), /could not be uploaded/);
  assert.equal(calls.length, 1);
});
