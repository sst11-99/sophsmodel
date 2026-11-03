// Local preview only: never included in the production HTML or deployment allowlist.
(async () => {
  const duplicate = new URLSearchParams(location.search).has('duplicate');
  window.modelingBackend = {submitApplication: async () => {
    await new Promise(resolve => setTimeout(resolve, 900));
    return {alreadySubmitted: duplicate};
  }};
  window.modelingNavigate('apply');
  const banner = document.createElement('aside');
  banner.style.cssText = 'padding:16px;text-align:center;background:#fff4cf;color:#222;font:14px system-ui;position:relative;z-index:10';
  banner.innerHTML = 'LOCAL DEMO — no uploads, database saves or LINE messages. <a href="/submission-demo#apply">First submission</a> · <a href="/submission-demo?duplicate=1#apply">Already submitted</a>';
  const form = document.querySelector('.application-form');
  form.prepend(banner);
  for (const [name,value] of Object.entries({fullName:'Demo Applicant',dateOfBirth:'2000-01-01',city:'Bangkok',email:'demo@example.com',contact:'demo-account',social:'demo-account'})) {
    const input = form.querySelector(`input[name="${name}"]`);
    if (input) { input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); }
  }
  const blob = await (await fetch('assets/cu-01-v2.jpg')).blob();
  const transfer = new DataTransfer();
  transfer.items.add(new File([blob],'demo-photo.jpg',{type:'image/jpeg'}));
  const photo = form.elements.namedItem('face');
  photo.files = transfer.files;
  photo.dispatchEvent(new Event('change',{bubbles:true}));
  const submit = document.querySelector('[data-submit]');
  submit.scrollIntoView({block:'center'});
})();
