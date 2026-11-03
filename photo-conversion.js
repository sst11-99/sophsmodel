// HEIC conversion runs on-device. No photo is sent to the decoder CDN.
(() => {
  const isHeic = file => /^image\/hei[cf](?:-sequence)?$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  let decoder;
  let queue = Promise.resolve();
  function loadDecoder() {
    if (!decoder) decoder = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/iife/heic-to.js';
      script.integrity = 'sha384-cVm8gaWQ5+URpoh6ACKXpm8TuyoHkfIDDBkxvDoUdIZ18w8nV5en0lVQvWMwO/6S';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(window.HeicTo);
      script.onerror = () => { script.remove(); decoder = null; reject(new Error('Could not load photo conversion. Please try again.')); };
      document.head.append(script);
    });
    return decoder;
  }
  async function decode(file) {
    // Serialize large decodes to keep mobile memory use bounded.
    const job = queue.then(async () => {
      const convert = await loadDecoder();
      return convert({blob:file,type:'image/jpeg',quality:0.82});
    });
    queue = job.catch(() => {});
    return job;
  }
  // Camera photos stay on this device while resized; preserve ordinary smaller files.
  async function resizePhoto(file) {
    if (file.size > 30 * 1024 * 1024) throw new Error('Photo must be 30 MB or smaller.');
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, {resizeWidth: 2048, resizeQuality: 'high', imageOrientation: 'from-image'});
      const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const result = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
      canvas.width = canvas.height = 1;
      if (!result || !result.size || result.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
      return new File([result], file.name.replace(/\.[^.]+$/, '') + '.jpg', {type:'image/jpeg', lastModified:file.lastModified});
    } catch { throw new Error('Could not resize this photo. Please choose a smaller JPG or PNG.'); }
    finally { bitmap?.close(); }
  }
  let resizeQueue = Promise.resolve();
  function optimise(file, resize) {
    const job = resizeQueue.then(() => resize(file));
    resizeQueue = job.catch(() => {});
    return job;
  }
  function needsPreparation(file) {
    return isHeic(file) || file.size > 5 * 1024 * 1024 || !file.type;
  }
  async function preparePhoto(file, convert = decode, resize = resizePhoto) {
    if (!isHeic(file)) {
      if (!file.type && /\.(jpe?g|png)$/i.test(file.name)) file = new File([file], file.name, {type:/\.png$/i.test(file.name)?'image/png':'image/jpeg', lastModified:file.lastModified});
      if (!['image/jpeg','image/png'].includes(file.type)) throw new Error('Use a JPG, PNG or HEIC image.');
      return file.size > 5 * 1024 * 1024 ? optimise(file, resize) : file;
    }
    if (file.size > 20 * 1024 * 1024) throw new Error('HEIC image must be 20 MB or smaller.');
    let jpeg;
    try { jpeg = await convert(file); } catch { throw new Error('Could not convert this photo. Please try another photo or export it as JPG.'); }
    if (!jpeg || jpeg.type !== 'image/jpeg' || !jpeg.size) throw new Error('Could not convert this photo. Please try another photo or export it as JPG.');
    if (jpeg.size > 5 * 1024 * 1024) throw new Error('Converted image must be 5 MB or smaller. Try a smaller photo.');
    return new File([jpeg],file.name.replace(/\.[^.]+$/, '')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified});
  }
  let reviewDecoder;
  async function decodeReview(file) {
    const job = queue.then(async () => {
      reviewDecoder ||= import('./assets/heic-to-csp-1.5.2.mjs');
      const {heicTo} = await reviewDecoder;
      return heicTo({blob:file,type:'image/jpeg',quality:0.95});
    });
    queue = job.catch(() => {});
    return job;
  }
  async function prepareReviewPhoto(file, convert = decodeReview) {
    if (file.size > 25 * 1024 * 1024) throw new Error('Photo must be 25 MB or smaller. Save a link for larger originals.');
    if (!isHeic(file)) {
      if (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name)) {
        const extension = file.name.split('.').pop().toLowerCase();
        file = new File([file],file.name,{type:extension==='png'?'image/png':extension==='webp'?'image/webp':'image/jpeg',lastModified:file.lastModified});
      }
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Use JPG, PNG, WebP or HEIC.');
      return file;
    }
    let jpeg;
    try { jpeg = await convert(file); } catch { throw new Error('Could not convert this HEIC photo. Export it as JPG or save an album link.'); }
    if (!jpeg || jpeg.type !== 'image/jpeg' || !jpeg.size) throw new Error('Could not convert this HEIC photo.');
    if (jpeg.size > 25 * 1024 * 1024) throw new Error('Converted photo is over 25 MB. Save a link to the original.');
    return new File([jpeg],file.name.replace(/\.[^.]+$/, '')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified});
  }
  window.modelingPhotos = {isHeic,needsPreparation,preparePhoto,prepareReviewPhoto};
})();
