// Read-only smoke check. Never creates or retrieves applicant records.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8'), context);
const config = context.window.modelingSupabaseConfig;
const site = 'https://modeling-company.vercel.app';
const results = [];
async function check(name, operation) {
  try { results.push({ check: name, ...await operation() }); }
  catch (error) { results.push({ check: name, pass: false, error: error.name, cause: error.cause?.code }); }
}
const request = (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(20000) });

async function main() {
  await Promise.all([
    check('public experience options', async () => {
      const response = await request(`${config.url}/rest/v1/experience_options?select=label&is_active=eq.true`, { headers: { apikey: config.publishableKey } });
      const value = await response.json();
      return { pass: response.ok && Array.isArray(value), status: response.status };
    }),
    check('anonymous applicant reads denied', async () => {
      const response = await request(`${config.url}/rest/v1/model_applications?select=id&limit=0`, { headers: { apikey: config.publishableKey } });
      return { pass: [401, 403].includes(response.status), status: response.status };
    }),
    ...['/', '/application.js', '/backend.js', '/supabase-config.js', '/api/locale'].map(asset => check(`public asset ${asset}`, async () => {
      const response = await request(site + asset);
      const result = { pass: response.ok, status: response.status };
      if (['/application.js', '/backend.js', '/supabase-config.js'].includes(asset) && response.ok) {
        const hash = value => createHash('sha256').update(value).digest('hex');
        result.matches_local = hash(await response.text()) === hash(fs.readFileSync(path.join(root, asset.slice(1))));
      }
      return result;
    })),
    ...['/README.md', '/VIRGIN-1.md', '/BACKEND-CONTRACT.md', '/.git/config', '/supabase/migrations/20260902080119_create_model_applications.sql', '/scripts/check-live.cjs'].map(asset => check(`private source excluded ${asset}`, async () => {
      const response = await request(site + asset, { method: 'HEAD' });
      return { pass: [403, 404].includes(response.status), status: response.status };
    })),
  ]);
  results.sort((a, b) => a.check.localeCompare(b.check));
  console.log(JSON.stringify({ checked_at: new Date().toISOString(), read_only: true, results }, null, 2));
  if (results.some(result => !result.pass)) process.exitCode = 1;
}
main();
