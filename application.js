const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const translate = (text) => window.modelingLocale?.t(text) || text;

// Nike women's/unisex chart; intermediate EU values are approximate half sizes.
const SHOE_GUIDE = [[33.5, 3.5], [34.5, 4], [35, 4.5], [35.5, 5], [36, 5.5], [36.5, 6], [37.5, 6.5], [38, 7], [38.5, 7.5], [39, 8], [40, 8.5], [40.5, 9], [41, 9.5], [42, 10], [42.5, 10.5], [43, 11], [44, 11.5], [44.5, 12], [45, 12.5], [45.5, 13], [46, 13.5]];

function measurementLabel(value, unit, division = "female", measurement = "") {
  const number = Number(value);
  if (unit === "CM" && measurement === "heightCm") {
    const inches = Math.round(number / 2.54);
    return `${value} ${translate("CM")} - ${Math.floor(inches / 12)} ${translate("FT")} ${inches % 12} ${translate("IN")}`;
  }
  if (unit === "CM") return `${value} ${translate("CM")} - ${(number / 2.54).toFixed(1)} ${translate("IN")}`;
  if (unit === "EU" && number >= 34 && number <= 46) {
    const upper = SHOE_GUIDE.findIndex(([eu]) => eu >= number);
    const [lowEU, lowUS] = SHOE_GUIDE[upper - 1];
    const [highEU, highUS] = SHOE_GUIDE[upper];
    const womenUS = lowUS + ((number - lowEU) / (highEU - lowEU)) * (highUS - lowUS);
    const us = Math.round((womenUS - (division === "male" ? 1.5 : 0)) * 2) / 2;
    return `${value} ${translate("EU")} - ≈${us} ${translate(division === "male" ? "US men" : "US women")}`;
  }
  return `${value} ${translate(unit)}`;
}

function channelValue(channel, value) {
  const cleanValue = String(value || "").trim();
  return cleanValue ? channel + ": " + cleanValue : "";
}

function canonicalExperienceLabel(value) {
  const cleanValue = String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  return cleanValue ? cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1) : "";
}

function uniqueExperienceValues(values) {
  const uniqueValues = new Map();

  values.forEach((value) => {
    const label = canonicalExperienceLabel(value);
    if (label) uniqueValues.set(label.toLocaleLowerCase(), label);
  });

  return [...uniqueValues.values()];
}

function swipeDirection(start, end) {
  const horizontalDistance = end.x - start.x;
  const verticalDistance = end.y - start.y;

  if (Math.abs(horizontalDistance) < 50 || Math.abs(horizontalDistance) <= Math.abs(verticalDistance)) {
    return null;
  }

  return horizontalDistance < 0 ? "next" : "previous";
}

function validateImageFile(file) {
  if (!IMAGE_TYPES.has(file.type)) {
    return { valid: false, message: "Use a JPG or PNG image." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { valid: false, message: "Image must be 5 MB or smaller." };
  }

  return { valid: true, message: file.name };
}

function validatePhotoSelection(files) {
  if (!files.length) return { valid: false, message: "Add at least one photo." };

  for (const file of files) {
    const result = validateImageFile(file);
    if (!result.valid) return result;
  }

  return { valid: true, message: "" };
}

function selectedPhotos(form) {
  return [...form.querySelectorAll("input[type='file']")]
    .flatMap((input) => [...(input.preparedPhotos || input.files)].map((file, index) => ({ slot: input.name, file, index })));
}

function validateSlotPhotos(files, multiple) {
  if (files.length > (multiple ? 4 : 1)) {
    return { valid: false, message: multiple ? "Choose up to 4 photos." : "Choose one photo." };
  }
  return files.length ? validatePhotoSelection(files) : { valid: true, message: "" };
}

function channelEntries(values, kind) {
  const platforms = kind === 'contact' ? ['Line', 'WhatsApp', 'Phone'] : ['Instagram', 'TikTok', 'Facebook'];
  const entries = {};
  for (const platform of platforms) {
    const value = values.get(kind + platform)?.trim();
    if (value) entries[platform] = value;
  }
  const active = values.get(kind + 'Type');
  if (platforms.includes(active)) {
    const current = values.get(kind)?.trim();
    if (current) entries[active] = current;
    else delete entries[active];
  }
  return entries;
}

function walkingVideoUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const url = new URL(raw);
  if (raw.length > 1500 || url.protocol !== 'https:' || url.username || url.password || !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:[/?#][^\s]*)?$/i.test(raw)) {
    throw new Error('Paste a valid HTTPS video link.');
  }
  return raw;
}

function initialiseWalkingVideo(form) {
  const popup = form.querySelector('[data-walking-dialog]');
  if (!popup) return;
  const input = popup.querySelector('input');
  const open = form.querySelector('[data-walking-open]');
  const state = form.querySelector('[data-walking-state]');
  const error = popup.querySelector('[data-walking-error]');
  const sync = () => { state.textContent = translate(input.value.trim() ? 'Video link added' : 'Optional · Link only'); };
  open.addEventListener('click', () => { error.textContent = ''; popup.showModal(); input.focus(); });
  const save = () => {
    try { input.value = walkingVideoUrl(input.value) || ''; error.textContent = ''; sync(); popup.close(); }
    catch { error.textContent = translate('Paste a valid HTTPS video link.'); input.focus(); }
  };
  popup.querySelector('[data-walking-save]').addEventListener('click', save);
  popup.querySelector('[data-walking-close]').addEventListener('click', () => { input.value = input.dataset.saved || ''; sync(); popup.close(); });
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); save(); } });
  popup.addEventListener('cancel', () => { input.value = input.dataset.saved || ''; sync(); });
  popup.addEventListener('close', () => { input.dataset.saved = input.value; open.focus(); });
}

function applicationPayload(form, division) {
  const values = new FormData(form);
  const contactChannels = channelEntries(values, 'contact');
  const socialChannels = channelEntries(values, 'social');
  const primary = (entries, active) => {
    const key = entries[active] ? active : Object.keys(entries)[0];
    return key ? channelValue(key, entries[key]) : null;
  };
  const experienceCategories = uniqueExperienceValues(values.getAll("experienceCategories"));
  const experienceOther = uniqueExperienceValues(values.getAll("experienceOther"));
  const legacyExperience = [...experienceCategories, ...experienceOther].join(" · ");

  return {
    id: crypto.randomUUID(),
    division,
    full_name: values.get("fullName").trim(),
    date_of_birth: values.get("dateOfBirth"),
    city: values.get("city").trim(),
    contact: primary(contactChannels, values.get('contactType')),
    contact_channels: contactChannels,
    email: values.get("email").trim(),
    social: primary(socialChannels, values.get('socialType')),
    social_channels: socialChannels,
    experience: legacyExperience || null,
    walking_video_url: walkingVideoUrl(values.get('walkingVideoUrl')),
    experience_categories: experienceCategories,
    experience_other: experienceOther,
    height_cm: Number(values.get("heightCm")),
    bust_cm: Number(values.get("bustCm")),
    waist_cm: Number(values.get("waistCm")),
    hips_cm: Number(values.get("hipsCm")),
    shoe_eu: Number(values.get("shoeEu")),
    confirmed_accurate_and_adult: values.get("consent") === "on",
    application_data_use_consent: values.get("consent") === "on",
    opportunity_emails_opt_in: values.get("opportunityEmails") === "on",
  };
}

function initialiseExperiencePicker(form) {
  const picker = form.querySelector("[data-experience-select]");
  if (!picker) return { commitPending: () => true };

  const options = picker.querySelector("[data-experience-options]");
  const summary = picker.querySelector("[data-experience-summary]");
  const otherToggle = picker.querySelector("[data-experience-other-toggle]");
  const otherEntry = picker.querySelector("[data-experience-other-entry]");
  const otherInput = picker.querySelector("[data-experience-other-input]");
  const otherList = picker.querySelector("[data-experience-other-list]");
  const addOtherButton = picker.querySelector("[data-add-experience-other]");

  function standardInputs() {
    return [...options.querySelectorAll("input[name='experienceCategories']")];
  }

  function customValues() {
    return [...otherList.querySelectorAll("input[name='experienceOther']")].map((input) => input.value);
  }

  function updateSummary() {
    const chosen = [
      ...standardInputs().filter((input) => input.checked).map((input) => input.value),
      ...customValues(),
    ];
    summary.textContent = chosen.length <= 2 ? chosen.map(translate).join(" · ") || translate("Select experience") : window.modelingLocale.selectedCount(chosen.length);
    otherList.querySelectorAll(".experience-other-value").forEach((row) => {
      row.querySelector("button").setAttribute("aria-label", `${translate("Remove")} ${row.querySelector("span").textContent}`);
    });
  }

  function removeCustomValue(row) {
    row.remove();
    if (!customValues().length) otherInput.setCustomValidity(otherToggle.checked ? translate("Add your other experience.") : "");
    updateSummary();
  }

  function appendCustomValue(value) {
    const label = canonicalExperienceLabel(value);
    if (!label) return false;

    const standardMatch = standardInputs().find((input) => input.value.toLocaleLowerCase() === label.toLocaleLowerCase());
    if (standardMatch) {
      standardMatch.checked = true;
      updateSummary();
      return true;
    }

    if (customValues().some((item) => item.toLocaleLowerCase() === label.toLocaleLowerCase())) return true;
    if (customValues().length >= 8) {
      otherInput.setCustomValidity(translate("Add no more than eight other experience types."));
      otherInput.reportValidity();
      return false;
    }

    const row = document.createElement("div");
    row.className = "experience-other-value";

    const text = document.createElement("span");
    text.textContent = label;

    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = "experienceOther";
    hiddenInput.value = label;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `${translate("Remove")} ${label}`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => removeCustomValue(row));

    row.append(text, hiddenInput, removeButton);
    otherList.append(row);
    otherInput.setCustomValidity("");
    updateSummary();
    return true;
  }

  function commitPending() {
    if (!otherToggle.checked) return true;
    const pendingValue = otherInput.value;

    if (pendingValue.trim()) {
      const added = appendCustomValue(pendingValue);
      if (added) otherInput.value = "";
      return added;
    }

    const valid = customValues().length > 0;
    otherInput.setCustomValidity(valid ? "" : translate("Add your other experience."));
    if (!valid) otherInput.reportValidity();
    return valid;
  }

  function syncOtherEntry() {
    otherEntry.hidden = !otherToggle.checked;
    if (!otherToggle.checked) {
      otherInput.value = "";
      otherInput.setCustomValidity("");
      otherList.replaceChildren();
    } else {
      otherInput.focus();
    }
    updateSummary();
  }

  function addStandardOption(label) {
    const cleanLabel = canonicalExperienceLabel(label);
    if (!cleanLabel || standardInputs().some((input) => input.value.toLocaleLowerCase() === cleanLabel.toLocaleLowerCase())) return;

    const option = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");
    checkbox.type = "checkbox";
    checkbox.name = "experienceCategories";
    checkbox.value = cleanLabel;
    text.textContent = translate(cleanLabel);
    window.addEventListener("localechange", () => { text.textContent = translate(cleanLabel); });
    checkbox.addEventListener("change", updateSummary);
    option.append(checkbox, text);
    options.append(option);
  }

  standardInputs().forEach((input) => input.addEventListener("change", updateSummary));
  otherToggle.addEventListener("change", syncOtherEntry);
  addOtherButton.addEventListener("click", () => {
    if (appendCustomValue(otherInput.value)) otherInput.value = "";
    else otherInput.reportValidity();
  });
  otherInput.addEventListener("input", () => otherInput.setCustomValidity(""));
  otherInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addOtherButton.click();
  });

  window.modelingBackend?.loadExperienceOptions?.()
    .then((labels) => labels.forEach(addStandardOption))
    .catch(() => {});

  updateSummary();
  window.addEventListener("localechange", updateSummary);
  form.addEventListener('draftrestore', event => {
    const fields=event.detail;
    fields.filter(f=>f.name==='experienceCategories'&&f.checked).forEach(f=>{
      addStandardOption(f.value);
      standardInputs().find(input=>input.value===f.value).checked=true;
    });
    const custom=fields.filter(f=>f.name==='experienceOther');
    otherToggle.checked=custom.length>0;
    otherEntry.hidden=!otherToggle.checked;
    custom.forEach(f=>appendCustomValue(f.value));
    updateSummary();
  });
  return { commitPending };
}

function initialiseSiteViews() {
  const catalogScreen = document.querySelector("[data-catalog-screen]");
  if (!catalogScreen) return;

  const dialog = document.querySelector("#application");
  function renderRoute() {
    const hash = window.location.hash;
    const view = hash === "#apply" ? "apply" : "models";
    if (hash === "#intro") window.history.replaceState({view}, "", `${window.location.pathname}${window.location.search}`);
    catalogScreen.hidden = false;
    document.body.dataset.view = view;
    if (view === "apply" && !dialog.open) {
      dialog.showModal();
      dialog.querySelector("[data-application-content]").scrollTop = 0;
      dialog.querySelector("#application-title").focus({ preventScroll: true });
    } else if (view !== "apply" && dialog.open) dialog.close();
    window.dispatchEvent(new CustomEvent("siteviewchange", { detail: view }));
  }
  window.modelingNavigate = (view) => {
    view = view === "apply" ? "apply" : "models";
    const target = view === "models" ? "" : "#apply";
    if (window.location.hash !== target) window.history.pushState({ view }, "", `${window.location.pathname}${window.location.search}${target}`);
    renderRoute();
    window.scrollTo(0, 0);
    if (view !== "apply") {
      const focusTarget = catalogScreen.querySelector("h1");
      focusTarget?.focus({ preventScroll: true });
    }
  };
  for (const [selector, view] of [["[data-open-catalog]", "models"], ["[data-open-application]", "apply"], ["[data-close-application]", "models"]]) {
    document.querySelectorAll(selector).forEach((link) => {
      if (link.closest("[data-segmented]")) return;
      link.addEventListener("click", (event) => {
      event.preventDefault();
        window.modelingNavigate(view);
      });
    });
  }
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    window.modelingNavigate("models");
  });
  window.addEventListener("popstate", renderRoute);
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

function initialiseDivisionPicker() {
  const catalog = document.querySelector("[data-division-view]");
  if (!catalog) return;

  const buttons = [...document.querySelectorAll("[data-division-option]")];
  const profiles = [...document.querySelectorAll("[data-division-profile]")];
  const catalogHeading = document.querySelector("#catalog > h1");
  window.addEventListener("localechange", () => {
    if (catalogHeading) catalogHeading.textContent = translate(`${catalog.dataset.divisionView === "female" ? "Female" : "Male"} model application`);
  });

  window.modelingSetDivision = (division) => {
      if (!['female', 'male'].includes(division)) return;
      catalog.dataset.divisionView = division;
      window.modelingSyncMeasurements?.();
      if (catalogHeading) catalogHeading.textContent = translate(`${division === "female" ? "Female" : "Male"} model application`);

      profiles.forEach((profile) => {
        profile.hidden = profile.dataset.divisionProfile !== division;
      });

      buttons.forEach((option) => {
        const selected = option.dataset.divisionOption === division;
        option.classList.toggle("is-active", selected);
        option.classList.remove("is-flashing");

        if (selected) option.setAttribute("aria-current", "page");
        else option.removeAttribute("aria-current");
      });

      catalog.querySelectorAll("img").forEach((image) => {
        image.setAttribute("aria-hidden", String(division === "male"));
      });

  };
}

function initialiseRanges(dialog) {
  const updates = [];
  dialog.querySelectorAll("input[type='range']").forEach((range) => {
    const output = range.closest("label").querySelector("[data-range-output]");
    const control = range.closest(".range-control");
    const sync = () => {
      const progress = ((Number(range.value) - Number(range.min)) / (Number(range.max) - Number(range.min))) * 100;
      const division = document.querySelector("[data-division-view]")?.dataset.divisionView || "female";
      output.value = measurementLabel(range.value, range.dataset.unit, division, range.name);
      output.textContent = output.value;
      range.setAttribute("aria-valuetext", output.value);
      control.style.setProperty("--range-progress", `${progress}%`);
      control.style.setProperty("--range-position", `${7 + (progress * .86)}%`);
    };

    range.addEventListener("input", sync);
    updates.push(sync);
    sync();
  });
  window.modelingSyncMeasurements = () => updates.forEach((sync) => sync());
  window.addEventListener("localechange", window.modelingSyncMeasurements);
}

function initialisePhotoInputs(dialog, onSelectionChange) {
  dialog.querySelectorAll("input[type='file']").forEach((input) => {
    const card = input.closest("label");
    const preview = card.querySelector("[data-upload-preview]");
    const placeholder = card.querySelector("[data-upload-placeholder]");
    const filename = card.querySelector("[data-file-name]");
    const referenceSrc = preview.dataset.referenceSrc;
    const referenceAlt = preview.alt;

    function showReferenceOrEmpty() {
      card.classList.remove("has-upload");
      if (input.dataset.previewUrl) {
        URL.revokeObjectURL(input.dataset.previewUrl);
        delete input.dataset.previewUrl;
      }

      if (referenceSrc) {
        preview.src = referenceSrc;
        preview.alt = referenceAlt;
        preview.hidden = false;
        placeholder.hidden = true;
      } else {
        preview.removeAttribute("src");
        preview.alt = "";
        preview.hidden = true;
        placeholder.hidden = false;
      }
    }

    let selectionVersion = 0;
    input.addEventListener("change", async () => {
      const version = ++selectionVersion;
      let files = [...input.files];
      let file = files[0];
      delete input.preparedPhotos;
      delete input.dataset.converting;
      input.setCustomValidity("");

      if (!file) {
        filename.textContent = referenceSrc ? "" : translate(input.multiple ? "Optional · Up to 4 photos" : "Add image");
        showReferenceOrEmpty();
        onSelectionChange();
        return;
      }

      if (files.length <= (input.multiple ? 4 : 1) && files.some(f => (window.modelingPhotos?.needsPreparation || window.modelingPhotos?.isHeic)?.(f))) {
        input.dataset.converting = 'true';
        input.setCustomValidity(translate('Preparing your photos…'));
        filename.textContent = translate('Preparing your photos…');
        showReferenceOrEmpty();
        onSelectionChange();
        try {
          const converted = [];
          for (const selected of files) converted.push(await window.modelingPhotos.preparePhoto(selected));
          if (version !== selectionVersion) return;
          files = converted;
          file = files[0];
          input.preparedPhotos = files;
        } catch (error) {
          if (version !== selectionVersion) return;
          delete input.dataset.converting;
          input.preparedPhotos = [];
          input.setCustomValidity(translate(error.message));
          filename.textContent = translate(error.message);
          onSelectionChange();
          return;
        }
        delete input.dataset.converting;
      }
      const result = validateSlotPhotos(files, input.multiple);
      filename.textContent = result.valid ? files.map((selected) => selected.name).join(" · ") : translate(result.message);
      input.setCustomValidity(result.valid ? "" : translate(result.message));

      if (!result.valid) {
        showReferenceOrEmpty();
        onSelectionChange();
        return;
      }

      if (input.dataset.previewUrl) URL.revokeObjectURL(input.dataset.previewUrl);
      input.dataset.previewUrl = URL.createObjectURL(file);
      preview.src = input.dataset.previewUrl;
      preview.alt = `Selected image: ${file.name}`;
      preview.hidden = false;
      placeholder.hidden = true;
      card.classList.add("has-upload");
      onSelectionChange();
    });
  });
}

function initialiseApplication() {
  const dialog = document.querySelector("#application");
  if (!dialog) return;

  const form = dialog.querySelector(".application-form");
  const catalog = document.querySelector("[data-division-view]");
  const submitButton = dialog.querySelector("[data-submit]");
  const status = dialog.querySelector(".form-status");
  const birthDate = form.elements.dateOfBirth;
  const experiencePicker = initialiseExperiencePicker(form);
  initialiseWalkingVideo(form);
  let submissionState = "idle";
  let draftReady = !window.submissionRecovery;

  const adultCutoff = new Date();
  adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
  birthDate.max = adultCutoff.toISOString().slice(0, 10);

  function updateSubmitAvailability() {
    submitButton.disabled = !draftReady || submissionState !== "idle"
      || !!form.querySelector('input[data-converting="true"]')
      || !validatePhotoSelection(selectedPhotos(form).map(({ file }) => file)).valid;
  }

  initialiseRanges(dialog);
  const refreshPhotos = window.photoManagement?.mount(dialog) || (() => {});
  let recoveryUI;
  initialisePhotoInputs(dialog, () => {
    refreshPhotos();
    updateSubmitAvailability();
    recoveryUI?.capture();
  });
  recoveryUI=window.submissionRecovery?.mount(form,catalog,()=>{refreshPhotos();updateSubmitAvailability();});
  recoveryUI?.ready.then(()=>{draftReady=true;updateSubmitAvailability();});
  updateSubmitAvailability();
  submitButton.addEventListener("click", () => form.requestSubmit());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!draftReady || submissionState !== "idle") return;
    status.textContent = "";
    status.classList.remove("is-error");

    if (!experiencePicker.commitPending()) return;
    form.querySelectorAll('.compound-field').forEach(field => field.commitChannel?.());

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const photos = selectedPhotos(form);
    const photoResult = validatePhotoSelection(photos.map(({ file }) => file));
    if (!photoResult.valid) {
      status.textContent = translate(photoResult.message);
      status.classList.add("is-error");
      return;
    }

    submissionState = "pending";
    submitButton.disabled = true;
    submitButton.textContent = translate("Submitting…");
    status.textContent = translate("Uploading your photos…");

    let locked=[];
    try {
      if(form.dataset?.requireRecovery && !window.submissionRecovery)throw new Error('The application could not start safely. Please refresh this page.');
      const payload=applicationPayload(form,catalog.dataset.divisionView);
      recoveryUI?.capture();
      locked=[...(form.elements||[])].filter(el=>!el.disabled);
      locked.forEach(el=>{el.disabled=true;});
      const recovery=await window.submissionRecovery?.prepare(payload,photos);
      const receipt=recovery?.alreadySubmitted ? {alreadySubmitted:true,confirmed:true,id:recovery.id} : await window.modelingBackend.submitApplication(payload,photos,recovery?{
        ...recovery,onProgress:progress=>{
          status.textContent=progress.stage==='upload'
            ? `${translate('Uploading photos')} ${progress.completed+1}/${progress.total}…`
            : translate(progress.stage==='save'?'Saving your application…':'Confirming receipt…');
        }
      }:undefined);
      if(recovery&&!receipt?.confirmed)throw new Error('Receipt is not confirmed. Please retry.');
      recoveryUI?.stop();
      await window.submissionRecovery?.clear();
      submissionState = "submitted";
      status.textContent = translate(receipt?.alreadySubmitted ? "Already submitted." : "Application submitted.") + "\n" + translate(receipt?.alreadySubmitted ? "Your earlier application was received. Later edits have not been submitted." : "Thank you. We have received your details and photos.");
      status.classList.add("is-success");
      submitButton.textContent = translate("Submitted");
      submitButton.hidden = true;
      status.focus({ preventScroll: true });
      status.scrollIntoView({ behavior: "auto", block: "center" });
      if(receipt?.confirmed){
        status.textContent+='\n'+translate('Receipt')+': '+(receipt.id||'✓');
      }else window.setTimeout(() => window.location.assign("/"), 1800);
    } catch (error) {
      locked.forEach(el=>{el.disabled=false;});
      submissionState = "idle";
      status.textContent = translate(error.message || "Your application could not be submitted. Please try again.");
      status.classList.add("is-error");
      submitButton.textContent = translate("Submit application");
      updateSubmitAvailability();
    }
  });
}

window.modelingApplication = {
  canonicalExperienceLabel,
  uniqueExperienceValues,
  measurementLabel,
  channelValue,
  swipeDirection,
  validateImageFile,
  validatePhotoSelection,
  validateSlotPhotos,
  selectedPhotos,
  applicationPayload,
  buildStoragePath: window.modelingBackend?.buildStoragePath,
};

initialiseDivisionPicker();
initialiseApplication();
initialiseSiteViews();
