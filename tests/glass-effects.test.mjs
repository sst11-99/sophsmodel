import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

// Real event handlers with a deterministic clock; no browser or network dependencies.
async function surface() {
  const events = {}, windowEvents = {}, styles = {}, attributes = {};
  let now = 0, serial = 0;
  const timers = new Map();
  const element = {
    style: { setProperty: (name, value) => { styles[name] = value; } },
    setAttribute: (name, value) => { attributes[name] = value; },
    removeAttribute: name => { delete attributes[name]; },
    getBoundingClientRect: () => ({left:20, top:40, width:200, height:50}),
    contains: target => target === element,
    addEventListener: (name, handler) => { events[name] = handler; },
  };
  const source = await readFile(new URL('../glass-effects.js', import.meta.url), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return ''; throw error;
  });
  vm.runInNewContext(source, {
    document: { querySelectorAll: () => [element] },
    window: { addEventListener: (name, handler) => { windowEvents[name] = handler; } },
    setTimeout: (callback, delay) => { timers.set(++serial, {at:now + delay, callback}); return serial; },
    clearTimeout: id => timers.delete(id),
  });
  const fire = (name, detail = {}) => events[name]?.({isPrimary:true,clientX:70,clientY:60,...detail});
  const advance = ms => {
    now += ms;
    for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback(); }
  };
  return {fire, advance, styles, attributes, windowEvents, element};
}

test('light follows the contact point relative to each glass surface', async () => {
  const {fire,styles,attributes} = await surface();
  fire('pointermove');
  assert.equal(styles['--light-x'],'50px');
  assert.equal(styles['--light-y'],'20px');
  assert.equal(attributes['data-glass-lit'],'');
});

test('touch release holds the last highlight for 1.89 seconds before fading', async () => {
  const {fire,advance,attributes,styles} = await surface();
  fire('pointerdown'); fire('pointerup');
  advance(1889);
  assert.equal(attributes['data-glass-lit'],'');
  assert.equal(styles['--light-x'],'50px');
  advance(1);
  assert.equal(attributes['data-glass-lit'],undefined);
});

test('a new contact cancels the previous fading deadline', async () => {
  const {fire,advance,attributes,styles} = await surface();
  fire('pointerenter'); fire('pointerleave');
  advance(1800);
  fire('pointermove',{clientX:200});
  advance(100);
  assert.equal(attributes['data-glass-lit'],'');
  assert.equal(styles['--light-x'],'180px');
  fire('pointerleave'); advance(1890);
  assert.equal(attributes['data-glass-lit'],undefined);
});

test('captured drags keep the highlight within the glass boundary', async () => {
  const {fire,styles} = await surface();
  fire('pointermove',{clientX:400,clientY:0});
  assert.equal(styles['--light-x'],'200px');
  assert.equal(styles['--light-y'],'0px');
});

test('keyboard focus receives a centered highlight', async () => {
  const {fire,styles,attributes,advance} = await surface();
  fire('focusin');
  assert.equal(styles['--light-x'],'100px');
  assert.equal(styles['--light-y'],'25px');
  assert.equal(attributes['data-glass-lit'],'');
  fire('focusout'); advance(1890);
  assert.equal(attributes['data-glass-lit'],undefined);
});

test('focus caused by a tap preserves its edge highlight rather than recentering it', async () => {
  const {fire,styles} = await surface();
  fire('pointerdown',{clientX:25,clientY:44});
  fire('focusin');
  assert.equal(styles['--light-x'],'5px');
  assert.equal(styles['--light-y'],'4px');
});

test('navigation clears old highlights and their timers', async () => {
  const {fire,advance,attributes,windowEvents} = await surface();
  fire('pointerdown'); fire('pointerup');
  windowEvents.siteviewchange?.();
  assert.equal(attributes['data-glass-lit'],undefined);
  fire('pointermove'); advance(2000);
  assert.equal(attributes['data-glass-lit'],'');
});
