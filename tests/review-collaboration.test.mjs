import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../review-choice-state.js',import.meta.url),'utf8'),context);const C=context.ReviewChoiceState;
test('model overrides are separate; untouched photos inherit agency suggestions',()=>{const agency={a:{decision:'keep',types:['runway']},b:{decision:'reject',types:[]}};const model={a:{decision:'favourite',types:['beauty']}};const result=C.effective(agency,model);assert.equal(result.a.decision,'favourite');assert.equal(result.b.decision,'reject');assert.equal(agency.a.decision,'keep');assert.deepEqual(agency.a.types,['runway']);});
test('comparison detects decisions, labels, notes and order without treating set order as a change',()=>{const a={decision:'keep',types:['beauty','runway'],notes:'A',position:1};const same={...a,types:['runway','beauty']};assert.equal(C.differences(a,same).length,0);const changes=Array.from(C.differences(a,{...a,decision:'reject',types:['commercial-lifestyle'],notes:'B',position:3}));assert.deepEqual(changes,['decision','types','notes','position']);});
test('copies do not share mutable category arrays',()=>{const a={types:['runway'],uses:['comp-card']};const normalized=C.choice(a);normalized.types.push('beauty');assert.deepEqual(a.types,['runway']);});

test('updating an existing choice sends only columns permitted by database grants',async()=>{
 const requests=[];
 const node={textContent:'',hidden:false,append(){},value:'collection'};
 const sandbox={window:{modelingSupabaseConfig:{url:'https://example.supabase.co',publishableKey:'public'}},location:{search:'',replace(){}},document:{querySelector:()=>({...node}),createElement:()=>({...node})},ModelAuth:{current:async()=>({id:'user',email:'model@example.com'}),token:async()=>'token'},Response,URL,URLSearchParams,crypto,localStorage:{},fetch:async(url,options)=>{
  let rows=[];
  if(url.includes('/review_members')) rows=[{collection_id:'collection',role:'model'}];
  else if(url.includes('/review_collections')) rows=[{id:'collection',name:'Test'}];
  else if(url.includes('/review_photos')) rows=['photo','photo2','photo3'].map(id=>({id,storage_path:'collection/'+id+'.jpg',original_name:id+'.jpg'}));
  else if(url.includes('/object/sign/')) rows=JSON.parse(options.body).paths.map(path=>({path,signedURL:'/object/sign/model-review/'+path+'?token=example',error:null}));
  else if(url.includes('/review_choices')) {
   if(options.method==='PATCH'){requests.push(JSON.parse(options.body));rows=[{photo_id:'photo',side:'model',selection:requests[0].selection,revision:2}];}
   else rows=[{photo_id:'photo',side:'model',selection:{decision:'keep'},revision:1}];
  }
  return new Response(JSON.stringify(rows));
 }};
 vm.createContext(sandbox);
 vm.runInContext(readFileSync(new URL('../review-choice-state.js',import.meta.url),'utf8'),sandbox);
 sandbox.ReviewChoiceState=sandbox.window.ReviewChoiceState;
 vm.runInContext(readFileSync(new URL('../review-collaboration.js',import.meta.url),'utf8'),sandbox);
 await sandbox.window.modelReviewTransport('/api/photos');
 const response=await sandbox.window.modelReviewTransport('/api/selection',{body:JSON.stringify({filename:'photo',selection:{decision:'favourite',position:3}})});
 assert.equal(response.status,200,JSON.stringify(await response.json()));
 assert.deepEqual(Object.keys(requests[0]).sort(),['actor_user_id','selection']);
 assert.equal(requests[0].selection.decision,'favourite');
 assert.equal(requests[0].actor_user_id,'user');
 const order=sandbox.window.reviewOrdered(['photo','photo2','photo3'].map(filename=>({filename})));
 assert.deepEqual(Array.from(order,p=>p.filename),['photo2','photo3','photo']);
});

test('large collections load every choice and sign photos in batches without losing order',async()=>{
 const photos=Array.from({length:527},(_,i)=>({id:'p'+i,storage_path:'collection/p'+i+'.jpg',original_name:'p'+i+'.jpg'}));
 const choices=photos.flatMap(p=>['agency','model'].map(side=>({photo_id:p.id,side,selection:{decision:side==='model'&&p.id==='p526'?'favourite':'keep'},revision:1})));
 const batches=[],node={textContent:'',hidden:false,append(){}};
 const sandbox={window:{modelingSupabaseConfig:{url:'https://example.supabase.co',publishableKey:'public'}},location:{search:'',replace(){}},document:{querySelector:()=>({...node}),createElement:()=>({...node})},ModelAuth:{current:async()=>({id:'user',email:'model@example.com'}),token:async()=>'token'},Response,URL,URLSearchParams,crypto,localStorage:{},fetch:async(url,options)=>{
  const u=new URL(url);let rows=[];
  if(u.pathname.endsWith('/review_members'))rows=[{collection_id:'collection',role:'model'}];
  if(u.pathname.endsWith('/review_collections'))rows=[{id:'collection',name:'Sophie'}];
  if(['/review_photos','/review_choices'].some(p=>u.pathname.endsWith(p))){const all=u.pathname.endsWith('/review_photos')?photos:choices;const offset=Number(u.searchParams.get('offset')),limit=Number(u.searchParams.get('limit'));rows=all.slice(offset,offset+limit);}
  if(u.pathname.endsWith('/object/sign/model-review')){const body=JSON.parse(options.body);batches.push(body.paths.length);rows=body.paths.map(path=>({path,signedURL:'/object/sign/model-review/'+path+'?token=example',error:null})).reverse();}
  return new Response(JSON.stringify(rows));
 }};
 vm.createContext(sandbox);vm.runInContext(readFileSync(new URL('../review-choice-state.js',import.meta.url),'utf8'),sandbox);sandbox.ReviewChoiceState=sandbox.window.ReviewChoiceState;vm.runInContext(readFileSync(new URL('../review-collaboration.js',import.meta.url),'utf8'),sandbox);
 const response=await sandbox.window.modelReviewTransport('/api/photos');assert.equal(response.status,200);const data=await response.json();assert.equal(data.photos.length,527);assert.equal(data.selections.p526.decision,'favourite');assert.equal(data.photos[526].filename,'p526');assert.ok(data.photos[526].image.includes('/p526.jpg'));assert.deepEqual(batches,[100,100,100,100,100,27]);
});
