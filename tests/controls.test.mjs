import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

// A minimal DOM event surface: execute the actual control handlers, not a copy.
async function catalogueControl({ reducedMotion = false } = {}) {
  const events = {}, windowEvents = {}, calls = [];
  let now = 0, nextFrame = 0;
  const frames = new Map(), styles = {};
  const advance = (time = 400) => {
    now += time;
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(now));
    if (time === 400) {
      const settled = [...frames.values()]; frames.clear();
      settled.forEach(callback => callback(now + 16));
    }
  };
  const buttons = ['female','male','apply'].map((division, index) => ({
    dataset: { divisionOption: division }, index,
    classList: { toggle() {} }, setAttribute() {},
    closest() { return this; }, focus() {},
  }));
  const control = { dataset: { segmented: 'catalogue' }, clientWidth: 310,
    querySelectorAll: () => buttons, style: { setProperty(key, value) { styles[key] = value; } },
    classList: { add() {}, remove() {} },
    setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {},
    addEventListener: (name, handler) => { events[name] = handler; },
  };
  const document = { querySelectorAll: (selector) => selector === '[data-segmented]' ? [control] : [], querySelector: () => ({ dataset: { divisionView: 'female' } }) };
  const window = { matchMedia: () => ({matches: reducedMotion}), modelingLocale: { locale:'en', t: x => x }, modelingSetDivision: value => calls.push(value), modelingNavigate: value => calls.push(value), addEventListener: (name, handler) => { windowEvents[name] = handler; } };
  vm.runInNewContext(await readFile(new URL('../landing-controls.js', import.meta.url),'utf8'), { document, window, performance: {now: () => now}, requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; }, cancelAnimationFrame: id => frames.delete(id) });
  return { events, buttons, calls, advance, styles, windowEvents };
}

test('three-way catalogue clicks choose male without opening another route', async () => {
  const {events,buttons,calls,advance} = await catalogueControl();
  events.click({target:buttons[1]});
  assert.deepEqual(calls,[]);
  advance();
  assert.deepEqual(calls,['male']);
});

test('three-way catalogue drag can reach the Apply segment', async () => {
  const {events,calls,advance} = await catalogueControl();
  events.pointerdown({isPrimary:true,button:0,pointerId:1,clientX:50,clientY:20});
  events.pointermove({pointerId:1,clientX:250,clientY:20});
  events.pointerup({type:'pointerup',pointerId:1,clientX:250,clientY:20});
  advance();
  assert.deepEqual(calls,['apply']);
});

test('navigation waits for the continuous slide to settle', async () => {
  const {events,buttons,calls,advance,styles} = await catalogueControl();
  events.click({target:buttons[2]});
  assert.deepEqual(calls,[]);
  advance(100);
  assert.ok(styles['--slide'] > 0 && styles['--slide'] < 2);
  assert.deepEqual(calls,[]);
  advance();
  assert.equal(styles['--slide'],2);
  assert.deepEqual(calls,['apply']);
});

test('a newer choice cancels pending navigation', async () => {
  const {events,buttons,calls,advance} = await catalogueControl();
  events.click({target:buttons[2]});
  advance(100);
  events.click({target:buttons[1]});
  advance();
  assert.deepEqual(calls,['male']);
});

test('external navigation cancels a pending slider action', async () => {
  const {events,buttons,calls,advance,windowEvents} = await catalogueControl();
  events.click({target:buttons[2]});
  windowEvents.siteviewchange({detail:'models'});
  advance();
  assert.deepEqual(calls,[]);
});

test('reduced motion activates without an animation delay', async () => {
  const {events,buttons,calls} = await catalogueControl({reducedMotion:true});
  events.click({target:buttons[2]});
  assert.deepEqual(calls,['apply']);
});

test('dragging interrupts an animation at its visible position without a jump', async () => {
  const {events,buttons,calls,advance,styles} = await catalogueControl();
  events.click({target:buttons[2]});
  advance(100);
  const before = styles['--slide'];
  events.pointerdown({isPrimary:true,button:0,pointerId:1,clientX:100,clientY:20});
  events.pointermove({pointerId:1,clientX:120,clientY:20});
  assert.ok(Math.abs(styles['--slide'] - before - .2) < .001);
  events.pointercancel({type:'pointercancel',pointerId:1,clientX:120,clientY:20});
  advance();
  assert.equal(styles['--slide'],0);
  assert.deepEqual(calls,[]);
});

test('keyboard preview of Apply waits for explicit activation', async () => {
  const {events,buttons,calls,advance} = await catalogueControl();
  events.keydown({key:'End',preventDefault(){}});
  advance();
  assert.deepEqual(calls,[]);
  events.click({target:buttons[2]});
  assert.deepEqual(calls,['apply']);
});

test('cancelled drag never changes division or navigates', async () => {
  const {events,calls} = await catalogueControl();
  events.pointerdown({isPrimary:true,button:0,pointerId:1,clientX:50,clientY:20});
  events.pointermove({pointerId:1,clientX:250,clientY:20});
  events.pointercancel({type:'pointercancel',pointerId:1,clientX:250,clientY:20});
  assert.deepEqual(calls,[]);
});
