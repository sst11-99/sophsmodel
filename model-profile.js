import {readDraft,writeDraft} from './profile-draft.mjs';
let step=0,name='',note='',busy=false,done=false,pending=null;
const selected=[new Set(),new Set()];
let draftKey='',storageAvailable=true;const custom=['',''];
function saveDraft(){if(!draftKey)return;try{storageAvailable=writeDraft(localStorage,draftKey,{step,name,note,language,choices:selected.map(s=>[...s]),custom,requestId:pending?.id||null,done});}catch{storageAvailable=false;}}
const invite=location.hash.slice(1);
const endpoint='https://zyzwvrogeudwvackduau.supabase.co/functions/v1/model-preferences';
const labels=[['Fashion','E-commerce','Beauty','Runway','Music videos','Dance','Acting','Events','Swimwear','TikTok','Livestreaming','Product reviews','Outdoor','Commercials'],['Dancing','Running','Cycling','Swimming','Climbing','Yoga','Singing','Playing music','Skating','Horse riding','DJ']];
const titles=['What would you love to do?','What else is your thing?','Something you’d like to try?'];
const subtitles=['Choose the work you’re interested in.','Pick your interests, or add your own.','Your next job, a new experience, or more of what you enjoy.'];

let language=new URLSearchParams(location.search).get('lang')==='th'?'th':'en';
const th={
'Fashion':'แฟชั่น','E-commerce':'อีคอมเมิร์ซ','Beauty':'บิวตี้','Runway':'เดินแบบ','Music videos':'มิวสิกวิดีโอ','Dance':'เต้น','Acting':'การแสดง','Events':'อีเวนต์','Swimwear':'ชุดว่ายน้ำ','TikTok':'TikTok','Livestreaming':'ไลฟ์สด','Product reviews':'รีวิวสินค้า','Outdoor':'งานกลางแจ้ง','Commercials':'โฆษณา',
'Dancing':'เต้น','Running':'วิ่ง','Cycling':'ปั่นจักรยาน','Swimming':'ว่ายน้ำ','Climbing':'ปีนผา','Yoga':'โยคะ','Singing':'ร้องเพลง','Playing music':'เล่นดนตรี','Skating':'สเกต','Horse riding':'ขี่ม้า','DJ':'ดีเจ',
'What would you love to do?':'อยากรับงานแบบไหน?','What else is your thing?':'ชอบหรือถนัดอะไรอีกบ้าง?','Something you’d like to try?':'มีอะไรที่อยากลองไหม?',
'Choose the work you’re interested in.':'เลือกงานที่คุณสนใจ','Pick your interests, or add your own.':'เลือกสิ่งที่ชอบ หรือเพิ่มคำตอบของคุณเอง','Your next job, a new experience, or more of what you enjoy.':'งานที่อยากลอง หรือสิ่งที่อยากทำให้มากขึ้น',
'Thank you.':'ขอบคุณค่ะ','Your answers have been saved.':'บันทึกคำตอบแล้ว','Submitted':'ส่งแล้ว','Your profile.':'โปรไฟล์ของคุณ','Open the link SOPHS sent you to get started.':'เปิดลิงก์ที่ SOPHS ส่งให้เพื่อเริ่มต้น','Something else…':'อื่น ๆ…','Add your own choice':'เพิ่มคำตอบของคุณ','Add choice':'เพิ่มคำตอบ','Skip for now':'ข้ามก่อน','Your name':'ชื่อของคุณ','I’d like to…':'อยากลอง…','Something you would like to try':'สิ่งที่อยากลอง','Submit':'ส่ง','Continue':'ถัดไป','Back':'ย้อนกลับ','Submitting…':'กำลังส่ง…','Try again':'ลองอีกครั้ง','Add your name so we know it’s you.':'ใส่ชื่อเพื่อให้เราทราบว่าเป็นคุณ','Connection interrupted. Tap Try again to confirm your submission.':'การเชื่อมต่อขัดข้อง กดลองอีกครั้งเพื่อยืนยันการส่ง','Couldn’t save. Please try again.':'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง','Your answers are shared privately with SOPHS.':'คำตอบของคุณจะถูกเก็บไว้เป็นส่วนตัวกับ SOPHS'
};
const t=value=>language==='th'?(th[value]||value):value;

const main=document.getElementById('main'),next=document.getElementById('next'),back=document.getElementById('back');
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=t(text);return e;}
function render(){
 saveDraft();
 document.documentElement.lang=language;document.getElementById("privacy").textContent=t("Your answers are shared privately with SOPHS.");back.textContent=t("Back");document.getElementById("language").textContent=language==='th'?'EN':'ไทย';document.getElementById("language").disabled=busy||!!pending;main.replaceChildren();back.hidden=step===0||done;next.disabled=busy||done;next.classList.toggle('saved',done);next.setAttribute('aria-busy',String(busy));
 if(done){main.append(el('div','check','✓'),el('h1','','Thank you.'),el('p','','Your answers have been saved.'));next.textContent=t('Submitted');return;}
 if(!/^[a-f0-9]{64}$/.test(invite)){main.append(el('h1','','Your profile.'),el('p','','Open the link SOPHS sent you to get started.'));next.hidden=true;back.hidden=true;return;}
 const progress=el('div','progress');progress.setAttribute('aria-label',`Step ${step+1} of 3`);for(let i=0;i<3;i++)progress.append(el('i',i<=step?'active':''));
 main.append(progress,el('div','eyebrow',`${language==='th'?'โปรไฟล์ของคุณ':'YOUR PROFILE'} / 0${step+1}`),el('h1','',titles[step]),el('p','',subtitles[step]));
 if(step<2){
 const choices=el('div','choices');for(const label of labels[step]){const b=el('button','choice',label);b.setAttribute('aria-pressed',selected[step].has(label));b.onclick=()=>{selected[step].has(label)?selected[step].delete(label):selected[step].add(label);b.setAttribute('aria-pressed',selected[step].has(label));saveDraft();};choices.append(b);}main.append(choices);
 const form=el('form','custom'),input=el('input'),add=el('button','add','+');input.placeholder=t('Something else…');input.setAttribute('aria-label',t('Add your own choice'));input.maxLength=80;input.value=custom[step];input.oninput=()=>{custom[step]=input.value;saveDraft();};add.setAttribute('aria-label',t('Add choice'));form.append(input,add);form.onsubmit=e=>{e.preventDefault();let v=input.value.trim();if(!v||selected[step].size>=30)return;const existing=labels[step].find(x=>x.toLowerCase()===v.toLowerCase());v=existing||v;if(!existing)labels[step].push(v);selected[step].add(v);custom[step]='';render();};main.append(form);
 const skip=el('button','textlink','Skip for now');skip.onclick=()=>{step++;render();};main.append(skip);
 }else{
 const label=el('label','','Your name');label.htmlFor='model-name';const n=el('input','name');n.id='model-name';n.name='name';n.autocomplete='name';n.maxLength=100;n.required=true;n.value=name;n.oninput=()=>{name=n.value;saveDraft();};
 const area=el('textarea','note');area.placeholder=t('I’d like to…');area.setAttribute('aria-label',t('Something you would like to try'));area.maxLength=1000;area.value=note;area.oninput=()=>{note=area.value;saveDraft();};main.append(label,n,area);
 }
 const error=el('p','error');error.id='error';error.setAttribute('role','alert');main.append(error);if(!storageAvailable)error.textContent=language==='th'?'อุปกรณ์นี้บันทึกแบบร่างไม่ได้ กรุณากรอกให้เสร็จก่อนปิด':'Draft saving is unavailable here. Please finish before closing.';if(pending){main.querySelectorAll('input,textarea,button').forEach(x=>x.disabled=true);back.disabled=true;}next.textContent=t(step===2?'Submit':'Continue');window.scrollTo(0,0);
}
back.onclick=()=>{if(!busy&&!pending){step=Math.max(0,step-1);render();}};
next.onclick=async()=>{
 if(busy||done)return;if(step<2){step++;render();return;}
 name=document.getElementById('model-name').value;note=document.querySelector('textarea').value;
 if(!name.trim()){document.getElementById('error').textContent=t('Add your name so we know it’s you.');document.getElementById('model-name').focus();return;}
 if(!pending)pending={id:crypto.randomUUID(),invite,name:name.trim(),interests:[...selected[0]],talents:[...selected[1]],note};
 saveDraft();busy=true;next.disabled=true;back.disabled=true;next.textContent=t('Submitting…');next.setAttribute('aria-busy','true');document.getElementById('error').textContent='';
 document.querySelectorAll('input,textarea').forEach(x=>x.disabled=true);
 try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok||result.saved!==true||result.id!==pending.id)throw Error(result.error||'Couldn’t save. Please try again.');done=true;busy=false;render();}
 catch(e){busy=false;next.disabled=false;next.setAttribute('aria-busy','false');next.textContent=t('Try again');document.getElementById('error').textContent=(e.name==='TimeoutError'||e.name==='TypeError')?t('Connection interrupted. Tap Try again to confirm your submission.'):t(e.message);}
};
document.getElementById("language").onclick=()=>{if(busy||pending)return;language=language==='th'?'en':'th';render();};
async function start(){
 if(/^[a-f0-9]{64}$/.test(invite)){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(invite));draftKey='sophs-profile-v1:'+Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  let d;try{d=readDraft(localStorage,draftKey);}catch{storageAvailable=false;}
  if(d){step=d.step;name=d.name;note=d.note;language=d.language;done=d.done;d.custom.forEach((v,i)=>custom[i]=v);d.choices.forEach((a,i)=>a.forEach(v=>{selected[i].add(v);if(!labels[i].includes(v))labels[i].push(v);}));if(d.requestId)pending={id:d.requestId,invite,name:name.trim(),note,interests:[...selected[0]],talents:[...selected[1]]};}
 }render();
}
window.addEventListener('pagehide',saveDraft);start();
