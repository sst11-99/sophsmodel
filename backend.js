const PHOTO_SLOTS = Object.freeze({
  face: "face",
  midLength: "mid-length",
  profile: "profile",
  fullLength: "full-length",
  jeans: "jeans",
  otherOne: "other-one",
  otherTwo: "other-two",
});

function buildStoragePath(applicationId, slot, fileName, index = 0) {
  const safeSlot = PHOTO_SLOTS[slot];
  if (!safeSlot) throw new Error("Unknown photo slot.");
  const limit = slot === "otherOne" || slot === "otherTwo" ? 4 : 1;
  if (!Number.isInteger(index) || index < 0 || index >= limit) throw new Error("Too many photos in this slot.");

  const extension = fileName.split(".").pop().toLowerCase();
  if (!new Set(["jpg", "jpeg", "png"]).has(extension)) throw new Error("Unsupported photo extension.");

  return `${applicationId}/${safeSlot}${index ? `-${index + 1}` : ""}.${extension}`;
}

function objectUrl(config, path) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${config.url}/storage/v1/object/${config.bucket}/${encodedPath}`;
}

async function uploadPhoto(config, applicationId, photo) {
  const path = buildStoragePath(applicationId, photo.slot, photo.file.name, photo.index);
  const response = await fetch(objectUrl(config, path), {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "Content-Type": photo.file.type,
      "x-upsert": "false",
    },
    body: photo.file,
  });

  if (!response.ok) throw new Error("A photo could not be uploaded. Please try again.");

  return {
    slot: PHOTO_SLOTS[photo.slot],
    path,
    mime_type: photo.file.type,
    size_bytes: photo.file.size,
  };
}

async function createApplication(config, payload) {
  const response = await fetch(`${config.url}/rest/v1/model_applications`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Your application could not be saved. Please try again.");
}

async function loadExperienceOptions() {
  const config = window.modelingSupabaseConfig;
  if (!config?.url || !config?.publishableKey) return [];

  const response = await fetch(
    `${config.url}/rest/v1/experience_options?select=label&is_active=eq.true&order=sort_order.asc.nullslast,label.asc`,
    { headers: { apikey: config.publishableKey } },
  );

  if (!response.ok) throw new Error("Experience options could not be loaded.");
  const options = await response.json();
  return options.map(({ label }) => label);
}

async function submitApplication(payload, photos, options) {
  const config = window.modelingSupabaseConfig;
  if (!config?.url || !config?.publishableKey) throw new Error("Applications are temporarily unavailable.");
  if (!payload.confirmed_accurate_and_adult || !payload.application_data_use_consent) {
    throw new Error("Confirm the application details before submitting.");
  }

  const paths = photos.map(photo => buildStoragePath(payload.id, photo.slot, photo.file.name, photo.index));
  const slots = new Map();
  if (!photos.length || photos.length > 13) throw new Error("Choose between 1 and 13 photos.");
  for (const photo of photos) {
    const key = `${photo.slot}:${photo.index || 0}`;
    if (slots.has(key)) throw new Error("Duplicate photo position.");
    slots.set(key, true);
  }
  if (new Set(paths).size !== paths.length) throw new Error("Duplicate photo path.");
  if (options?.attempt) return submitResumable(config,payload,photos,options);
  const photoManifest = await Promise.all(
    photos.map((photo) => uploadPhoto(config, payload.id, photo)),
  );
  await createApplication(config, { ...payload, photo_manifest: photoManifest });
}

async function recoveryRequest(url,options) {
  let last;
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch(url,{...options,signal:controller.signal});
      if(response.ok)return response;
      let details={};try{details=await response.json();}catch{}
      const error=new Error('The connection could not complete your application. Your draft is kept; please retry.');
      error.status=Number(details.statusCode)||response.status;error.code=details.code||details.error;
      error.retryable=response.status===408||response.status===429||response.status>=500;
      throw error;
    }catch(error){last=error;if(error.retryable===false||attempt===2)throw error;}
    finally{clearTimeout(timer);}
    await new Promise(resolve=>setTimeout(resolve,600*(attempt+1)));
  }
  throw last;
}
async function checkReceipt(attempt) {
  const config=window.modelingSupabaseConfig;
  const response=await recoveryRequest(`${config.url}/rest/v1/rpc/application_receipt`,{
    method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},
    body:JSON.stringify({application_id:attempt.id,receipt_token:attempt.token})
  });
  const received=await response.json();
  if(typeof received!=='boolean')throw new Error('We could not confirm receipt. Your draft is kept; please retry.');
  return received;
}
async function submitResumable(config,payload,photos,{attempt,persist,onProgress=()=>{}}) {
  const photoManifest=[];
  // Sequential uploads avoid saturating a mobile connection and retain each confirmed file.
  for(const photo of photos){
    const path=buildStoragePath(attempt.id,photo.slot,photo.file.name,photo.index);
    if(!attempt.uploaded[path]){
      onProgress({stage:'upload',completed:photoManifest.length,total:photos.length});
      try{await recoveryRequest(objectUrl(config,path),{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':photo.file.type,'x-upsert':'false'},body:photo.file});}
      catch(error){
        // Same random attempt + immutable fingerprint: retrying a lost upload response.
        if(error.status!==409&&error.code!=='Duplicate')throw error;
      }
      attempt.uploaded[path]=true;await persist();
    }
    photoManifest.push({slot:PHOTO_SLOTS[photo.slot],path,mime_type:photo.file.type,size_bytes:photo.file.size});
  }
  onProgress({stage:'save'});
  try{
    await recoveryRequest(`${config.url}/rest/v1/model_applications`,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({...payload,id:attempt.id,receipt_token_hash:attempt.tokenHash,photo_manifest:photoManifest})});
  }catch(error){
    // A timeout or duplicate may mean the first request committed. Verify rather than guess.
    if(!await checkReceipt(attempt))throw error;
  }
  onProgress({stage:'verify'});
  if(!await checkReceipt(attempt))throw new Error('Receipt is not confirmed yet. Keep this page open and retry; your uploaded photos are saved.');
  return {confirmed:true,id:attempt.id};
}
window.modelingBackend = {
  checkReceipt,
  buildStoragePath,
  loadExperienceOptions,
  submitApplication,
};
