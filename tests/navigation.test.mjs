import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('public roster remains home and legacy intro navigation returns there', async () => {
  let focused;
  const surface = name => ({querySelector: selector => ({focus: () => { focused = `${name}:${selector}`; }})});
  const intro = surface('intro'), models = surface('models');
  const dialog = {open:false, addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},querySelector:selector=>({focus:()=>{focused=`apply:${selector}`;}})};
  const window = {
    location:{hash:'',pathname:'/',search:''},
    history:{replaceState:(_state,_title,url)=>{window.location.hash='';},pushState:(_state,_title,url)=>{window.location.hash=url.includes('#') ? url.slice(url.indexOf('#')) : ''; }},
    dispatchEvent(){},addEventListener(){},scrollTo(){},
  };
  const document = {querySelector:()=>null,querySelectorAll:()=>[],body:{dataset:{}}};
  const context = vm.createContext({document,window,CustomEvent:class{}});
  vm.runInContext(await readFile(new URL('../application.js',import.meta.url),'utf8'),context);
  document.querySelector = selector => ({'[data-intro-screen]':intro,'[data-catalog-screen]':models,'#application':dialog})[selector];
  vm.runInContext('initialiseSiteViews()',context);
  window.modelingNavigate('models');
  assert.equal(focused,'models:h1');
  assert.equal(document.body.dataset.view,'models');
  window.modelingNavigate('apply');
  assert.equal(focused,'apply:#application-title');
  window.modelingNavigate('intro');
  assert.equal(focused,'models:h1');
  assert.equal(document.body.dataset.view,'models');
  assert.equal(window.location.hash,'');
  assert.equal(dialog.open,false);
  window.location.hash='#intro';
  vm.runInContext('initialiseSiteViews()',context);
  assert.equal(window.location.hash,'');
  assert.equal(document.body.dataset.view,'models');
});
