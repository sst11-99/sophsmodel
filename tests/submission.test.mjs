import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../application.js', import.meta.url), 'utf8');

function mount(submit, recovery) {
  const timers = [], redirects = [];
  const handlers = {};
  const button = { disabled: false, addEventListener() {} };
  const classes = new Set();
  const status = { classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) }, focus() { this.focused = true; }, scrollIntoView() { this.scrolled = true; } };
  const form = {
    elements: Object.assign([{disabled:false}], { dateOfBirth: {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    checkValidity: () => true,
    addEventListener: (event, handler) => { handlers[event] = handler; },
  };
  const dialog = { querySelector: selector => ({ '.application-form': form, '[data-submit]': button, '.form-status': status })[selector] };
  const context = {
    document: { querySelector: () => null },
    window: { submissionRecovery: recovery, modelingBackend: { submitApplication: submit }, setTimeout: (callback, delay) => timers.push({callback, delay}), location: { assign: path => redirects.push(path) } },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.document.querySelector = selector => selector === '#application' ? dialog : { dataset: { divisionView: 'female' } };
  context.initialiseExperiencePicker = () => ({ commitPending: () => true });
  context.initialiseRanges = () => {};
  context.initialisePhotoInputs = (_dialog, onChange) => { context.changePhoto = onChange; };
  context.selectedPhotos = () => [{ slot: 'face', file: { name: 'fixture.jpg', type: 'image/jpeg', size: 100 } }];
  context.applicationPayload = () => ({ id: 'synthetic-test-only' });
  vm.runInContext('initialiseApplication()', context);
  return { button, status, timers, redirects, submit: () => handlers.submit({ preventDefault() {} }), changePhoto: () => context.changePhoto() };
}

test('a second submit event cannot start a concurrent upload or insert', async () => {
  let calls = 0, finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const ui = mount(async () => { calls++; await gate; });
  const pending = ui.submit();
  assert.equal(ui.status.classList.contains('is-success'), false);
  await ui.submit();
  assert.equal(calls, 1);
  ui.changePhoto();
  assert.equal(ui.button.disabled, true, 'changing photos must not re-enable submission while pending');
  finish();
  await pending;
});

test('a completed application cannot be submitted again from the same form instance', async () => {
  let calls = 0;
  const ui = mount(async () => { calls++; });
  await ui.submit();
  ui.changePhoto();
  await ui.submit();
  assert.equal(ui.button.disabled, true);
  assert.equal(calls, 1);
  assert.equal(ui.status.classList.contains('is-success'), true);
  assert.match(ui.status.textContent, /Application submitted\./);
  assert.equal(ui.status.textContent, 'Application submitted.\nThank you. We have received your details and photos.');
  assert.equal(ui.button.hidden, true);
  assert.equal(ui.timers.length, 1);
  assert.equal(ui.timers[0].delay, 1800);
  ui.timers[0].callback();
  assert.deepEqual(ui.redirects, ['/']);
  assert.equal(ui.status.focused, true);
  assert.equal(ui.status.scrolled, true);
});

test('a rejected attempt releases the form for a deliberate retry', async () => {
  let calls = 0;
  const ui = mount(async () => { if (++calls === 1) throw new Error('Upload rejected'); });
  await ui.submit();
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.status.textContent, 'Upload rejected');
  assert.equal(ui.timers.length, 0);
  assert.equal(ui.status.classList.contains('is-success'), false);
  await ui.submit();
  assert.equal(calls, 2);
  assert.equal(ui.button.disabled, true);
});

const recoveryFixture=()=>({mount:()=>({ready:Promise.resolve(),capture(){},stop(){}}),prepare:async()=>({attempt:{id:'test'}}),clear:async()=>{}});
test('recovery UI refuses success without server verification',async()=>{
  const ui=mount(async()=>undefined,recoveryFixture());
  await Promise.resolve();await ui.submit();
  assert.equal(ui.status.classList.contains('is-success'),false);
  assert.match(ui.status.textContent,/not confirmed/);
  assert.equal(ui.button.disabled,false);
});
test('verified receipt stays visible instead of redirecting',async()=>{
  const ui=mount(async()=>({confirmed:true,id:'test-receipt'}),recoveryFixture());
  await Promise.resolve();await ui.submit();
  assert.equal(ui.status.classList.contains('is-success'),true);
  assert.match(ui.status.textContent,/Receipt: test-receipt/);
  assert.equal(ui.timers.length,0);
});
