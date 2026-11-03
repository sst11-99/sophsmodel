(() => {
  const surfaces = document.querySelectorAll('.glass-switch, .entry-surface:not(.compound-field), .compound-field > input');
  surfaces.forEach(surface => {
    let fadeTimer;
    let pointerActive = false;
    const clearHold = () => { clearTimeout(fadeTimer); fadeTimer = undefined; };
    const lightAt = (x, y) => {
      clearHold();
      surface.style.setProperty('--light-x', `${x}px`);
      surface.style.setProperty('--light-y', `${y}px`);
      surface.setAttribute('data-glass-lit', '');
    };
    const follow = event => {
      if (!event.isPrimary) return;
      pointerActive = true;
      const bounds = surface.getBoundingClientRect();
      lightAt(Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)), Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)));
    };
    const hold = () => {
      pointerActive = false;
      clearHold();
      fadeTimer = setTimeout(() => surface.removeAttribute('data-glass-lit'), 1890);
    };
    const reset = () => { pointerActive = false; clearHold(); surface.removeAttribute('data-glass-lit'); };
    ['pointerenter', 'pointermove', 'pointerdown'].forEach(name => surface.addEventListener(name, follow, {passive:true}));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(name => surface.addEventListener(name, hold, {passive:true}));
    surface.addEventListener('focusin', () => {
      if (pointerActive) return;
      const bounds = surface.getBoundingClientRect();
      lightAt(bounds.width / 2, bounds.height / 2);
    });
    surface.addEventListener('focusout', event => {
      if (!surface.contains(event.relatedTarget)) hold();
    });
    ['siteviewchange', 'pagehide', 'blur'].forEach(name => window.addEventListener(name, reset));
  });
})();
