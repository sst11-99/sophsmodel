(() => {
  document.querySelectorAll('.compound-field').forEach(field => {
    const select = field.querySelector('select');
    const input = field.querySelector('input:not([type="hidden"])');
    if (!select || !input) return;
    const kind = input.name;
    const slots = new Map();
    for (const option of select.options) {
      const slot = document.createElement('input');
      slot.type = 'hidden';
      slot.name = kind + option.value;
      slot.value = '';
      slots.set(option.value, slot);
      field.append(slot);
    }
    const status = document.createElement('span');
    status.className = 'channel-status';
    status.setAttribute('role', 'status');
    field.append(status);
    let active = select.value;
    input.maxLength = kind === 'contact' ? 200 : 300;
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('autocorrect', 'off');
    input.spellcheck = false;

    const refresh = () => {
      input.required = kind === 'contact' && ![...slots.values()].some(slot => slot.value.trim());
      input.setCustomValidity(input.required && input.value && !input.value.trim() ? window.modelingLocale.t('Add at least one contact.') : '');
      status.textContent = input.value.trim() ? window.modelingLocale.t('Added') : '';
      for (const button of field.querySelectorAll('[data-channel-value]')) {
        button.dataset.added = String(Boolean(slots.get(button.dataset.channelValue)?.value.trim()));
      }
    };
    const commit = () => { slots.get(active).value = input.value; refresh(); };
    const configure = () => {
      const telephone = kind === 'contact' && active !== 'Line';
      input.type = telephone ? 'tel' : 'text';
      input.setAttribute('inputmode', telephone ? 'tel' : 'text');
      input.autocomplete = telephone ? `section-${active.toLowerCase()} tel` : 'off';
      input.setAttribute('aria-label', window.modelingLocale.t(active));
      refresh();
    };
    select.addEventListener('change', () => {
      commit();
      active = select.value;
      input.value = slots.get(active).value;
      configure();
    });
    input.addEventListener('input', commit);
    input.addEventListener('change', commit);
    field.commitChannel = commit;
    field.restoreChannels = () => { active = select.value; input.value = slots.get(active).value; configure(); };
    window.addEventListener('localechange', configure);
    commit();
    configure();
  });
})();
