(() => {
  const ttl = 7 * 24 * 60 * 60 * 1000;
  let dbPromise, state = {updated: Date.now(), fields: [], photos: [], attempt: null}, queue = Promise.resolve(), storageOK = true;
  const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : value))].map(n=>n.toString(16).padStart(2,'0')).join('');
  function db() {
    return dbPromise ||= new Promise((resolve,reject)=>{
      const request=indexedDB.open('sophs-application-draft',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('draft');
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
  }
  async function transaction(mode,action) {
    const database=await db();return new Promise((resolve,reject)=>{
      const tx=database.transaction('draft',mode),request=action(tx.objectStore('draft'));
      tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }
  function save() {
    state.updated=Date.now();const snapshot=structuredClone(state);
    queue=queue.catch(()=>{}).then(()=>transaction('readwrite',store=>store.put(snapshot,'current'))).catch(()=>{storageOK=false;});return queue;
  }
  async function load() {
    try {const stored=await transaction('readonly',store=>store.get('current'));if(stored&&Date.now()-stored.updated<ttl) state=stored;else if(stored)await transaction('readwrite',store=>store.delete('current'));}
    catch {storageOK=false;}
    return state;
  }
  let clearTimer=()=>{};
  async function clear() {clearTimer();state={updated:Date.now(),fields:[],photos:[],attempt:null};await queue;try{await transaction('readwrite',store=>store.delete('current'));}catch{storageOK=false;}}
  async function prepare(payload,photos) {
    // Resolve any earlier uncertain save BEFORE creating a different attempt.
    if(state.attempt&&await window.modelingBackend.checkReceipt(state.attempt))return {alreadySubmitted:true,id:state.attempt.id};
    const {id,...details}=payload;
    const digests=await Promise.all(photos.map(async p=>[p.slot,p.index||0,p.file.name,await hash(await p.file.arrayBuffer())]));
    const fingerprint=await hash(JSON.stringify([details,digests]));
    if(state.attempt?.fingerprint!==fingerprint){
      const token=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
      state.attempt={id,token,tokenHash:await hash(token),fingerprint,uploaded:{}};
    }
    await save();return {attempt:state.attempt,persist:save};
  }
  function mount(form,catalog,onRestore) {
    const message=form.querySelector('[data-draft-status]'),clearButton=form.querySelector('[data-clear-draft]');
    let restoring=true,stopped=false,timer;
    clearTimer=()=>{stopped=true;clearTimeout(timer);};
    const say=(en,th)=>{if(message)message.textContent=document.documentElement.lang==='th'?th:en;};
    function capture(){
      if(restoring||stopped)return;
      state.division=catalog.dataset.divisionView;
      state.fields=[...form.elements].filter(e=>e.name&&e.type!=='file'&&e.name!=='consent').map(e=>({name:e.name,value:e.value,type:e.type,checked:e.checked}));
      state.photos=window.modelingApplication.selectedPhotos(form);
      save().then(()=>say(storageOK?'Draft saved on this device for 7 days.':'Draft could not be saved on this device. Keep this page open.',storageOK?'บันทึกฉบับร่างบนอุปกรณ์นี้ไว้ 7 วัน':'บันทึกฉบับร่างไม่ได้ โปรดเปิดหน้านี้ไว้'));
    }
    form.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(capture,400);});
    form.addEventListener('change',()=>{clearTimeout(timer);timer=setTimeout(capture,100);});
    form.addEventListener('click',()=>{clearTimeout(timer);timer=setTimeout(capture,100);});
    window.addEventListener('pagehide',capture);
    const ready=load().then(saved=>{
      if(saved.fields.length){
        for(const f of saved.fields){
          if(f.name==='experienceOther')continue;
          const matches=[...form.elements].filter(e=>e.name===f.name);
          const el=matches.find(e=>e.type==='checkbox'?e.value===f.value:true);
          if(el){if(el.type==='checkbox')el.checked=f.checked;else el.value=f.value;}
          else if(f.type==='hidden'){const input=document.createElement('input');input.type='hidden';input.name=f.name;input.value=f.value;form.append(input);}
        }
        form.querySelectorAll('.compound-field').forEach(field=>field.restoreChannels?.());
        form.dispatchEvent(new CustomEvent('draftrestore',{detail:saved.fields}));
        window.modelingSetDivision?.(saved.division==='male'?'male':'female');
        for(const input of form.querySelectorAll('input[type="file"]')){
          const transfer=new DataTransfer();saved.photos.filter(p=>p.slot===input.name).forEach(p=>transfer.items.add(p.file));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
        }
        say('Your draft was restored. Please review your details before submitting.','กู้คืนฉบับร่างแล้ว โปรดตรวจสอบก่อนส่ง');
        window.modelingSyncMeasurements?.();onRestore();
      }else if(!storageOK)say('Draft saving is unavailable. Keep this page open.','ไม่สามารถบันทึกฉบับร่างได้ โปรดเปิดหน้านี้ไว้');
    }).catch(()=>{say('Some draft fields could not be restored. Please review the form.','โปรดตรวจสอบแบบฟอร์ม กู้คืนบางช่องไม่ได้');}).finally(()=>{restoring=false;onRestore();});
    clearButton?.addEventListener('click',async()=>{await clear();window.location.reload();});
    return {ready,capture,stop:()=>{clearTimer();}};
  }
  window.submissionRecovery={hash,prepare,clear,mount};
})();
