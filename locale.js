/* Translate presentation only: input values and Supabase keys stay unchanged. */
(() => {
  const thai = {
    "Photo must be 30 MB or smaller.": "รูปภาพต้องมีขนาดไม่เกิน 30 MB",
    "Could not resize this photo. Please choose a smaller JPG or PNG.": "ปรับขนาดรูปภาพไม่ได้ โปรดเลือกไฟล์ JPG หรือ PNG ที่เล็กลง",

    "Your details and photos are saved on this device for up to 7 days, until you submit or clear them. Avoid shared devices.": "บันทึกรายละเอียดและรูปภาพบนอุปกรณ์นี้ไว้ 7 วัน จนกว่าจะส่งหรือล้างฉบับร่าง โปรดหลีกเลี่ยงอุปกรณ์ที่ใช้ร่วมกัน",
    "Clear saved draft": "ล้างฉบับร่าง",
    "Uploading photos": "กำลังอัปโหลดรูปภาพ",
    "Saving your application…": "กำลังบันทึกใบสมัคร…",
    "Confirming receipt…": "กำลังยืนยันว่าได้รับใบสมัคร…",
    "Receipt": "เลขที่ยืนยัน",
    "Already submitted.": "ได้รับใบสมัครแล้ว",
    "Your earlier application was received. Later edits have not been submitted.": "ได้รับใบสมัครก่อนหน้านี้แล้ว การแก้ไขภายหลังยังไม่ได้ส่ง",
    "The application could not start safely. Please refresh this page.": "เริ่มใบสมัครไม่ได้ โปรดรีเฟรชหน้านี้",
    "The connection could not complete your application. Your draft is kept; please retry.": "การเชื่อมต่อขัดข้อง ยังไม่ยืนยันใบสมัคร ฉบับร่างยังอยู่ โปรดลองอีกครั้ง",
    "We could not confirm receipt. Your draft is kept; please retry.": "ยังยืนยันการรับใบสมัครไม่ได้ ฉบับร่างยังอยู่ โปรดลองอีกครั้ง",
    "Receipt is not confirmed yet. Keep this page open and retry; your uploaded photos are saved.": "ยังยืนยันการรับไม่ได้ โปรดเปิดหน้านี้ไว้แล้วลองอีกครั้ง รูปภาพที่อัปโหลดแล้วถูกบันทึกไว้",

    "Walking video": "วิดีโอเดินแบบ",
    "Add video link": "เพิ่มลิงก์วิดีโอ",
    "Optional · Link only": "ไม่บังคับ · ลิงก์เท่านั้น",
    "Video link added": "เพิ่มลิงก์วิดีโอแล้ว",
    "Video link": "ลิงก์วิดีโอ",
    "Paste a link to a video of you walking from Instagram, Facebook, TikTok or Google Drive. Make sure we can open it.": "วางลิงก์วิดีโอเดินแบบของคุณจาก Instagram, Facebook, TikTok หรือ Google Drive และตั้งค่าการแชร์ให้เราเปิดดูได้",
    "Close walking video": "ปิดช่องลิงก์วิดีโอเดินแบบ",
    "Paste a valid HTTPS video link.": "กรุณาวางลิงก์วิดีโอ HTTPS ที่ถูกต้อง",
    "Done": "เสร็จสิ้น",
    "Photo guide": "คู่มือถ่ายรูป",
    "Preparing your photos…": "กำลังเตรียมรูปถ่าย…",
    "Use a JPG, PNG or HEIC image.": "กรุณาใช้รูปภาพ JPG, PNG หรือ HEIC",
    "HEIC image must be 20 MB or smaller.": "รูปภาพ HEIC ต้องมีขนาดไม่เกิน 20 MB",
    "Converted image must be 5 MB or smaller. Try a smaller photo.": "รูปภาพหลังแปลงต้องไม่เกิน 5 MB กรุณาเลือกรูปที่เล็กลง",
    "Could not convert this photo. Please try another photo or export it as JPG.": "แปลงรูปนี้ไม่สำเร็จ กรุณาเลือกรูปอื่นหรือส่งออกเป็น JPG",
    "Portfolio": "ผลงาน",
    "Optional · Up to 4 photos": "ไม่บังคับ · สูงสุด 4 รูป", "Choose up to 4 photos.": "เลือกรูปได้สูงสุด 4 รูป", "Choose one photo.": "เลือกได้ 1 รูป",
    "Mid-length": "ครึ่งตัว", "US women": "สหรัฐฯ หญิง", "US men": "สหรัฐฯ ชาย",
    "CM": "ซม.", "FT": "ฟุต", "IN": "นิ้ว", "EU": "ยุโรป",
    "Now opening the door for new faces.": "เปิดรับนางแบบและนายแบบหน้าใหม่",
    "All nationalities.": "ยินดีต้อนรับทุกสัญชาติ",
    "Apply now": "สมัครเลย", "See models": "ดูนางแบบ / นายแบบ", "Apply": "สมัคร",
    "Language": "ภาษา", "Explore Sophs Model": "สำรวจ Sophs Model",
    "Female": "นางแบบ", "Male": "นายแบบ", "Model division": "ประเภทนางแบบ / นายแบบ",
    "Female model application": "สมัครนางแบบ", "Male model application": "สมัครนายแบบ",
    "Sophs Model introduction": "หน้าแรก Sophs Model", "Back to catalog": "กลับไปดูนางแบบ / นายแบบ", "Back": "กลับ",
    "SM-26 / Application": "SM-26 / ใบสมัคร", "SM-26 / Male": "SM-26 / นายแบบ",
    "Open call": "เปิดรับสมัคร", "Profiles coming soon.": "พบกับโปรไฟล์เร็ว ๆ นี้",
    "Male models": "นายแบบ", "Photo guide": "ตัวอย่างการถ่ายภาพ",
    "Front": "หน้าตรง", "Profile": "ด้านข้าง", "Shorts": "กางเกงขาสั้น", "Jeans": "กางเกงยีนส์",
    "Photos · No makeup": "รูปถ่าย · ไม่แต่งหน้า", "Photo requirement: no makeup": "ข้อกำหนดรูปถ่าย: ไม่แต่งหน้า",
    "Measurements": "สัดส่วน", "Height": "ส่วนสูง", "Bust": "รอบอก", "Waist": "รอบเอว", "Hips": "รอบสะโพก", "Shoe": "เบอร์รองเท้า",
    "Details": "ข้อมูลส่วนตัว", "Name": "ชื่อ-นามสกุล", "Date of birth": "วันเดือนปีเกิด", "Choose date of birth": "เลือกวันเดือนปีเกิด",
    "City": "เมือง", "Contact": "ช่องทางติดต่อ", "Contact type": "ประเภทช่องทางติดต่อ", "Phone": "โทรศัพท์",
    "Email": "อีเมล", "Social": "โซเชียลมีเดีย", "Social platform": "แพลตฟอร์มโซเชียลมีเดีย",
    "Experience": "ประสบการณ์", "Select experience": "เลือกประสบการณ์", "Advertising": "งานโฆษณา", "Runway": "เดินแบบ",
    "Photo shoots": "ถ่ายแบบ", "Social media": "โซเชียลมีเดีย", "Other": "อื่น ๆ", "Other experience": "ประสบการณ์อื่น ๆ",
    "Runway · Photo shoots · Advertising": "เดินแบบ · ถ่ายแบบ · งานโฆษณา",
    "Add your experience": "เพิ่มประสบการณ์ของคุณ", "Add": "เพิ่ม", "Added": "เพิ่มแล้ว", "Remove": "ลบ",
    "Add at least one contact.": "กรุณาเพิ่มช่องทางติดต่ออย่างน้อยหนึ่งช่องทาง",
    "Add your other experience.": "กรุณาเพิ่มประสบการณ์อื่น ๆ ของคุณ",
    "Add no more than eight other experience types.": "เพิ่มประสบการณ์อื่น ๆ ได้ไม่เกิน 8 ประเภท",
    "Model photos": "รูปถ่ายสำหรับสมัคร", "Add at least one photo. Any frame can be used.": "เพิ่มรูปถ่ายอย่างน้อย 1 รูป เลือกใช้ช่องใดก็ได้",
    "Front · Mid-length": "หน้าตรง · ครึ่งตัว", "Front · Close-up": "หน้าตรง · ระยะใกล้", "Full length · Alternate": "เต็มตัว · อีกภาพ",
    "Upload at least one photo. Follow the examples below.": "อัปโหลดรูปถ่ายอย่างน้อย 1 รูป ตามตัวอย่างด้านล่าง",
    "Front · Full-length": "หน้าตรง · เต็มตัว", "Full-length · Jeans": "เต็มตัว · กางเกงยีนส์",
    "Face front": "ใบหน้าตรง", "Side profile": "ใบหน้าด้านข้าง", "Full length / bike shorts": "เต็มตัว / กางเกงปั่นจักรยาน",
    "Full length / jeans": "เต็มตัว / กางเกงยีนส์", "Full length": "เต็มตัว", "Add image": "เพิ่มรูปภาพ", "Upload": "อัปโหลด",
    "Use a JPG or PNG image.": "กรุณาใช้รูปภาพ JPG หรือ PNG", "Image must be 5 MB or smaller.": "รูปภาพต้องมีขนาดไม่เกิน 5 MB",
    "Add at least one photo.": "กรุณาเพิ่มรูปถ่ายอย่างน้อย 1 รูป",
    "Submit application": "ส่งใบสมัคร", "Submitting…": "กำลังส่ง…", "Uploading your photos…": "กำลังอัปโหลดรูปถ่าย…",
    "Application submitted.": "ส่งใบสมัครเรียบร้อยแล้ว", "Submitted": "ส่งแล้ว",
    "Thank you. We have received your details and photos.": "ขอบคุณ เราได้รับข้อมูลและรูปภาพของคุณแล้ว",
    "Applications are temporarily unavailable.": "ระบบสมัครไม่พร้อมใช้งานชั่วคราว",
    "Confirm the application details before submitting.": "กรุณายืนยันข้อมูลในใบสมัครก่อนส่ง",
    "A photo could not be uploaded. Please try again.": "อัปโหลดรูปถ่ายไม่สำเร็จ กรุณาลองอีกครั้ง",
    "Your application could not be saved. Please try again.": "บันทึกใบสมัครไม่สำเร็จ กรุณาลองอีกครั้ง",
    "Your application could not be submitted. Please try again.": "ส่งใบสมัครไม่สำเร็จ กรุณาลองอีกครั้ง",
    "I confirm my details and photos are accurate, I am over 18, and they may be used to assess my application, match me with relevant castings, and contact me about my application.": "ฉันยืนยันว่าข้อมูลและรูปถ่ายถูกต้อง ฉันมีอายุมากกว่า 18 ปี และยินยอมให้ใช้ข้อมูลและรูปถ่ายเพื่อพิจารณาใบสมัคร คัดเลือกงานแคสติ้งที่เหมาะสม และติดต่อฉันเกี่ยวกับใบสมัคร",
    "Email me about future casting opportunities that may suit my profile. I can unsubscribe at any time.": "ส่งอีเมลแจ้งโอกาสแคสติ้งในอนาคตที่เหมาะกับโปรไฟล์ของฉัน ฉันสามารถยกเลิกการรับอีเมลได้ทุกเมื่อ",
    "Close-up example: face forward, natural skin, hair pulled back": "ภาพตัวอย่างระยะใกล้: หน้าตรง ไม่แต่งหน้า รวบผม",
    "Profile example: exact side profile, natural skin, hair pulled back": "ภาพตัวอย่างด้านข้าง: ไม่แต่งหน้า รวบผม",
    "Full-length example: fitted black tank, bike shorts and bare feet": "ภาพตัวอย่างเต็มตัว: เสื้อกล้ามสีดำเข้ารูป กางเกงปั่นจักรยาน ไม่สวมรองเท้า",
    "Full-length alternate: fitted black tank, low-rise straight jeans and bare feet": "ภาพตัวอย่างเต็มตัว: เสื้อกล้ามสีดำเข้ารูป กางเกงยีนส์ทรงตรง ไม่สวมรองเท้า",
    "Reference framing for a face-front photo": "ตัวอย่างรูปใบหน้าตรง", "Reference framing for a side-profile photo": "ตัวอย่างรูปใบหน้าด้านข้าง",
    "Reference framing for a full-length photo": "ตัวอย่างรูปเต็มตัว",
    "Ploy Shoman profile": "โปรไฟล์ Ploy Shoman", "Ploy Shoman full-length portfolio example": "ตัวอย่างผลงานเต็มตัวของ Ploy Shoman",
    "Ploy Shoman advertising portfolio example": "ตัวอย่างผลงานโฆษณาของ Ploy Shoman",
  };
  const storageKey = "sophs-models-language";
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch {}
  let locale = saved === "th" || saved === "en" ? saved : "en";
  let manuallyChosen = saved === "th" || saved === "en";
  const records = [];
  const t = (text) => locale === "th" ? thai[text] || text : text;
  // Capture original static copy once, never form values or subsequently added user content.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const key = node.textContent.trim();
    if (thai[key]) records.push({ node, key, last: node.textContent, attribute: null });
  }
  document.querySelectorAll("[aria-label], [placeholder], img[alt]").forEach((node) => {
    for (const attribute of ["aria-label", "placeholder", "alt"]) {
      const key = node.getAttribute(attribute);
      if (thai[key]) records.push({ node, key, last: key, attribute });
    }
  });
  function setLocale(next, persist = false) {
    if (next !== "th" && next !== "en") return;
    locale = next;
    if (persist) {
      manuallyChosen = true;
      try { localStorage.setItem(storageKey, locale); } catch {}
    }
    document.documentElement.lang = locale;
    records.forEach((record) => {
      const { node, key, attribute, last } = record;
      const current = attribute ? node.getAttribute(attribute) : node.textContent;
      // A filename, status or selection that changed dynamically owns its own translation.
      if (current !== last) return;
      record.last = t(key);
      if (attribute) node.setAttribute(attribute, record.last);
      else node.textContent = record.last;
    });
    window.dispatchEvent(new CustomEvent("localechange", { detail: locale }));
  }
  window.modelingLocale = { t, setLocale, get locale() { return locale; }, selectedCount: (count) => locale === "th" ? `เลือกแล้ว ${count} รายการ` : `${count} selected` };
  setLocale(locale);
  if (!manuallyChosen) {
    fetch("/api/locale", { cache: "no-store", signal: AbortSignal.timeout(4000) })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (!manuallyChosen) setLocale(data.locale); })
      .catch(() => { if (!manuallyChosen) setLocale(navigator.language.startsWith("th") ? "th" : "en"); });
  }
})();
