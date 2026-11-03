(() => {
  // Preserve native select values for FormData, with larger swipeable choices above.
  document.querySelectorAll('.compound-field select').forEach((select) => {
    const control = document.createElement('span');
    control.className = 'glass-switch channel-switch';
    control.dataset.segmented = 'channel';
    control.setAttribute('role', 'group');
    control.setAttribute('aria-label', select.getAttribute('aria-label'));
    control.channelSelect = select;
    const thumb = document.createElement('span');
    thumb.className = 'glass-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    control.append(thumb);
    [...select.options].forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.channelValue = option.value;
      button.textContent = window.modelingLocale.t(option.value);
      button.setAttribute('aria-label', button.textContent);
      control.append(button);
    });
    select.before(control);
    select.hidden = true;
  });
  document.querySelectorAll("[data-segmented]").forEach((control) => {
    const buttons = [...control.querySelectorAll("button")];
    const isLanguage = control.dataset.segmented === "language";
    const isCatalogue = control.dataset.segmented === "catalogue";
    const isChannel = control.dataset.segmented === "channel";
    const lastIndex = buttons.length - 1;
    const clamp = (value) => Math.max(0, Math.min(lastIndex, value));
    control.style.setProperty('--segments', buttons.length);
    let selected = isLanguage && window.modelingLocale.locale === "en" ? 1 : 0;
    if (isChannel) selected = Math.max(0, buttons.findIndex(button => button.dataset.channelValue === control.channelSelect.value));
    let gesture = null;
    let suppressClick = false;
    let position = selected;
    let targetIndex = selected;
    let frame = null;
    const stopAnimation = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      control.classList.remove('is-settling');
    };
    const paint = (nextPosition) => {
      position = nextPosition;
      control.style.setProperty("--slide", position);
      buttons.forEach((button, index) => button.classList.toggle("is-selected", index === Math.round(position)));
    };
    function commit(index, activate) {
      selected = index;
      if (isLanguage) {
        if (activate) window.modelingLocale.setLocale(buttons[index].dataset.locale, true);
        buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
      } else if (isCatalogue) {
        if (activate && index < 2) window.modelingSetDivision(buttons[index].dataset.divisionOption);
        if (activate && index === 2) window.modelingNavigate('apply');
      } else if (isChannel) {
        if (activate) {
          control.channelSelect.value = buttons[index].dataset.channelValue;
          control.channelSelect.dispatchEvent(new Event('change', {bubbles:true}));
        }
        buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      } else if (activate) {
        window.modelingNavigate(index === 0 ? "apply" : "models");
      }
    }
    function choose(index, activate = true, immediate = false) {
      stopAnimation();
      targetIndex = index;
      if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(index - position) < .001) {
        paint(index);
        commit(index, activate);
        return;
      }
      const from = position;
      const started = performance.now();
      control.classList.add('is-settling');
      const animate = (now) => {
        const progress = Math.min(1, (now - started) / 280);
        // A restrained acceleration; direct manipulation never uses easing.
        paint(from + (index - from) * Math.pow(progress, 1.22));
        if (progress < 1) frame = requestAnimationFrame(animate);
        else {
          // Leave the final position on screen for a frame before changing views.
          frame = requestAnimationFrame(() => {
            stopAnimation();
            commit(index, activate);
          });
        }
      };
      frame = requestAnimationFrame(animate);
    }
    control.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (suppressClick) { suppressClick = false; return; }
      choose(buttons.indexOf(button));
    });
    control.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      stopAnimation();
      suppressClick = false;
      gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, selected: position, dragging: false };
    });
    control.addEventListener("pointermove", (event) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.startX;
      if (!gesture.dragging && Math.abs(event.clientY - gesture.startY) > Math.abs(dx)) { gesture = null; return; }
      if (!gesture.dragging && Math.abs(dx) > 8) {
        gesture.dragging = true;
        control.setPointerCapture(event.pointerId);
        control.classList.add("is-dragging");
      }
      if (gesture.dragging) paint(clamp(gesture.selected + dx / ((control.clientWidth - 10) / buttons.length)));
    });
    const endGesture = (event) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const { dragging, startX, selected: start } = gesture;
      gesture = null;
      control.classList.remove("is-dragging");
      if (control.hasPointerCapture(event.pointerId)) control.releasePointerCapture(event.pointerId);
      if (!dragging) return;
      suppressClick = true;
      const index = Math.round(clamp(start + (event.clientX - startX) / ((control.clientWidth - 10) / buttons.length)));
      if (event.type === "pointercancel") choose(selected, false);
      else choose(index);
    };
    control.addEventListener("pointerup", endGesture);
    control.addEventListener("pointercancel", endGesture);
    control.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? lastIndex : clamp(targetIndex + (event.key === 'ArrowLeft' ? -1 : 1));
      buttons[index].focus();
      choose(index, isLanguage || isChannel || (isCatalogue && index < 2));
    });
    window.addEventListener("localechange", () => {
      if (isLanguage) choose(window.modelingLocale.locale === "th" ? 0 : 1, false, true);
      if (isChannel) {
        buttons.forEach(button => {
          button.textContent = window.modelingLocale.t(button.dataset.channelValue);
          button.setAttribute('aria-label', button.textContent);
        });
        control.setAttribute('aria-label', control.channelSelect.getAttribute('aria-label'));
      }
    });
    window.addEventListener("siteviewchange", (event) => {
      if (isCatalogue) choose(event.detail === 'apply' ? 2 : document.querySelector('[data-division-view]').dataset.divisionView === 'male' ? 1 : 0, false, true);
      else if (!isLanguage && !isChannel) choose(0, false, true);
    });
    if (isChannel) control.closest('form')?.addEventListener('draftrestore', () => {
      choose(Math.max(0, buttons.findIndex(button => button.dataset.channelValue === control.channelSelect.value)), false, true);
    });
    choose(selected, false, true);
  });
})();
