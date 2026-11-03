(() => {
  const remove = (files, index) => files.filter((_, i) => i !== index);
  function move(source, index, target, limit) {
    if (!source[index] || (limit > 1 && target.length >= limit)) return null;
    const next = [...source];
    const file = next[index];
    if (limit === 1 && target.length) next[index] = target[0];
    else next.splice(index, 1);
    return {source: next, target: limit === 1 ? [file] : [...target, file]};
  }
  function mount(dialog) {
    const inputs = [...dialog.querySelectorAll('input[type="file"]')];
    let dragged = null;
    let urls = [];
    const files = input => [...(input.preparedPhotos || input.files)];
    const label = input => input.closest('.upload-card').querySelector('.upload-caption > span').textContent;
    const thai = () => document.documentElement.lang === 'th';
    function set(input, photos) {
      const transfer = new DataTransfer();
      photos.forEach(photo => transfer.items.add(photo));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }
    function transfer(source, index, target) {
      if (source === target || source.dataset.converting || target.dataset.converting) return;
      const result = move(files(source), index, files(target), target.multiple ? 4 : 1);
      if (!result) return;
      set(source, result.source);
      set(target, result.target);
    }
    inputs.forEach(input => {
      const card = input.closest('.upload-card');
      card.addEventListener('click', event => {
        // A selected photograph is a preview, not a file-picker or navigation link.
        if (event.target.closest('.selected-photo-gallery')) {
          event.stopPropagation();
          if (!event.target.closest('select, option')) event.preventDefault();
        }
      });
      card.addEventListener('dragover', event => {
        if (!dragged || input.dataset.converting) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        card.classList.add('photo-drop-target');
      });
      card.addEventListener('dragleave', () => card.classList.remove('photo-drop-target'));
      card.addEventListener('drop', event => {
        if (!dragged) return;
        event.preventDefault();
        event.stopPropagation();
        card.classList.remove('photo-drop-target');
        transfer(dragged.input, dragged.index, input);
        dragged = null;
      });
    });
    function refresh() {
      urls.forEach(url => URL.revokeObjectURL(url));
      urls = [];
      inputs.forEach(input => {
        const card = input.closest('.upload-card');
        card.querySelector('.selected-photo-gallery')?.remove();
        const selected = files(input);
        if (!card.classList.contains('has-upload') || input.dataset.converting || !selected.length) return;
        const gallery = document.createElement('span');
        gallery.className = 'selected-photo-gallery';
        gallery.dataset.count = selected.length;
        selected.forEach((file, index) => {
          const frame = document.createElement('span');
          frame.className = 'selected-photo';
          frame.draggable = true;
          frame.addEventListener('dragstart', event => {
            dragged = {input, index};
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', file.name);
          });
          frame.addEventListener('dragend', () => {
            dragged = null;
            inputs.forEach(item => item.closest('.upload-card').classList.remove('photo-drop-target'));
          });
          const image = document.createElement('img');
          image.src = URL.createObjectURL(file);
          urls.push(image.src);
          image.alt = `${label(input)}: ${file.name}`;
          image.draggable = false;
          const close = document.createElement('button');
          close.type = 'button';
          close.className = 'photo-remove';
          close.textContent = '×';
          close.setAttribute('aria-label', `${thai() ? 'ลบรูป' : 'Remove photo'}: ${file.name}`);
          close.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            set(input, remove(files(input), index));
            const next = card.querySelector('.photo-remove') || input;
            next.focus({preventScroll:true});
          });
          const picker = document.createElement('select');
          picker.className = 'photo-move';
          picker.setAttribute('aria-label', `${thai() ? 'ย้ายรูป' : 'Move photo'}: ${file.name}`);
          const hint = document.createElement('option');
          hint.value = '';
          hint.textContent = thai() ? 'ย้ายไป…' : 'Move to…';
          picker.append(hint);
          inputs.filter(target => target !== input).forEach(target => {
            const option = document.createElement('option');
            option.value = target.name;
            option.textContent = label(target);
            option.disabled = !!target.dataset.converting || (target.multiple && files(target).length >= 4);
            picker.append(option);
          });
          picker.addEventListener('change', event => {
            event.stopPropagation();
            const target = inputs.find(item => item.name === picker.value);
            if (target) {
              transfer(input, index, target);
              target.closest('.upload-card').querySelector('.photo-move')?.focus({preventScroll:true});
            }
          });
          frame.append(image, close, picker);
          gallery.append(frame);
        });
        card.querySelector('.upload-object').append(gallery);
      });
    }
    window.addEventListener('localechange', refresh);
    return refresh;
  }
  window.photoManagement = {remove, move, mount};
})();
