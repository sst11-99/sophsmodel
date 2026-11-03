import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const siteRoot = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, siteRoot), "utf8");
}

async function loadApplicationApi() {
  const configSource = await read("supabase-config.js");
  const backendSource = await read("backend.js");
  const source = await read("application.js");
  const context = {
    document: { querySelector: () => null },
    window: {},
  };
  vm.runInNewContext(configSource, context);
  vm.runInNewContext(backendSource, context);
  vm.runInNewContext(source, context);
  return context.window.modelingApplication;
}

test("optional photo groups collect four files each without truncation or path collisions", async () => {
  const { selectedPhotos, validateSlotPhotos, buildStoragePath } = await loadApplicationApi();
  const file = { name: "same.jpg", type: "image/jpeg", size: 100 };
  const groups = ["face", "profile", "fullLength", "jeans", "otherOne", "otherTwo"].map((name, i) => ({ name, files: Array(i < 4 ? 1 : 4).fill(file) }));
  const photos = selectedPhotos({ querySelectorAll: () => groups });
  assert.equal(photos.length, 12);
  const paths = photos.map(p => buildStoragePath("test", p.slot, p.file.name, p.index));
  assert.equal(new Set(paths).size, 12);
  assert.ok(paths.includes("test/other-one-4.jpg"));
  assert.ok(paths.includes("test/other-two-4.jpg"));
  assert.equal(validateSlotPhotos([], true).valid, true);
  assert.equal(validateSlotPhotos(Array(4).fill(file), true).valid, true);
  assert.equal(validateSlotPhotos(Array(5).fill(file), true).valid, false);
  assert.equal(validateSlotPhotos([file, file], false).valid, false);
  assert.equal(validateSlotPhotos([file, { ...file, type: "text/plain" }], true).valid, false);
  assert.equal(validateSlotPhotos([file, { ...file, size: 6 * 1024 * 1024 }], true).valid, false);
  assert.throws(() => buildStoragePath("test", "face", "x.jpg", 1));
  assert.throws(() => buildStoragePath("test", "otherOne", "x.jpg", 4));
  const html = await read("index.html");
  assert.equal((html.match(/type="file" multiple/g) || []).length, 2);
});

test("dual measurement labels preserve metric values and show rounded equivalents", async () => {
  const { measurementLabel } = await loadApplicationApi();
  for (const [cm, inches] of [[170, "66.9"], [82, "32.3"], [64, "25.2"], [90, "35.4"]]) {
    assert.equal(measurementLabel(cm, "CM"), `${cm} CM - ${inches} IN`);
  }
  assert.equal(measurementLabel(38, "EU", "female"), "38 EU - ≈7 US women");
  assert.equal(measurementLabel(38, "EU", "male"), "38 EU - ≈5.5 US men");
  assert.equal(measurementLabel(46, "EU", "male"), "46 EU - ≈12 US men");
  for (let eu = 34; eu <= 46; eu++) {
    for (const division of ["female", "male"]) {
      assert.doesNotMatch(measurementLabel(eu, "EU", division), /NaN|undefined/);
    }
  }
});

test("height uses feet and inches without changing canonical centimetres", async () => {
  const { measurementLabel } = await loadApplicationApi();
  for (const [cm, expected] of [[145, "4 FT 9 IN"], [170, "5 FT 7 IN"], [182, "6 FT 0 IN"], [200, "6 FT 7 IN"]]) {
    assert.equal(measurementLabel(cm, "CM", "female", "heightCm"), `${cm} CM - ${expected}`);
    assert.equal(measurementLabel(cm, "CM", "male", "heightCm"), `${cm} CM - ${expected}`);
  }
  assert.equal(measurementLabel(82, "CM", "female", "bustCm"), "82 CM - 32.3 IN");
  assert.equal(measurementLabel(38.5, "EU", "female", "shoeEu"), "38.5 EU - ≈7.5 US women");
  assert.equal(measurementLabel(38.5, "EU", "male", "shoeEu"), "38.5 EU - ≈6 US men");
  assert.match(await read("index.html"), /id="shoe"[^>]*step="0\.5"/);
  assert.match(await read("application.js"), /measurementLabel\(range.value, range.dataset.unit, division, range.name\)/);
});

test("upload captions distinguish seven photo slots and the walking link", async () => {
  const html = await read("index.html");
  const captions = [...html.matchAll(/class="upload-caption"><b>[^<]+<\/b><span>([^<]+)<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(captions, ["Front · Close-up", "Front · Mid-length", "Side profile", "Front · Full-length", "Full-length · Jeans", "Walking video", "Other", "Portfolio"]);
  const slots = [...html.matchAll(/<input name="([^"]+)" type="file"/g)].map(match => match[1]);
  assert.deepEqual(slots, ["face", "midLength", "profile", "fullLength", "jeans", "otherTwo", "otherOne"]);
  assert.match(html, /Upload at least one photo\. Follow the examples below\./);
  assert.match(html, /name="fullLength"/);
  assert.match(html, /name="jeans"/);
});

test("application is one compact page with a direct route home", async () => {
  const html = await read("index.html");

  assert.match(html, /<dialog[^>]+id=["']application["']/i);
  assert.match(html, /<button[^>]+data-close-application[^>]+aria-label=["']Back to catalog["']/i);
  assert.match(html, /<section[^>]+class=["'][^"']*measurements/i);
  assert.match(html, /<section[^>]+class=["'][^"']*details/i);
  assert.match(html, /<section[^>]+class=["'][^"']*iphone-photos/i);
  assert.doesNotMatch(html, /data-step|data-next|data-back|Before you apply/i);
  assert.match(html, />SM-26<\/a>/i);
  assert.match(html, />SM-26 \/ Application<\/p>/i);

  for (const name of ["heightCm", "bustCm", "waistCm", "hipsCm", "shoeEu"]) {
    assert.match(
      html,
      new RegExp(`<input[^>]+type=["']range["'][^>]+name=["']${name}["']`, "i"),
      `${name} must remain a touch-first measurement`,
    );
  }
});


test("catalog makes its four required shots and application route obvious", async () => {
  const html = await read("index.html");
  const header = html.match(/<header class="site-header">([\s\S]*?)<\/header>/i)?.[1];
  const navigation = header?.match(/<nav class="gender-nav[^\"]*"[^>]*>([\s\S]*?)<\/nav>/i)?.[1];
  const catalog = html.match(/<section class="catalog-track"[^>]*>([\s\S]*?)<\/section>/i)?.[1];

  assert.ok(header, "catalog header must exist");
  assert.ok(navigation, "division and application controls must share one group");
  assert.match(navigation, /data-division-option="female"[\s\S]*data-division-option="male"[\s\S]*data-open-application/i);
  assert.match(header, /data-division-option="female"[^>]+aria-current="page"/i);
  assert.match(header, /data-division-option="male"/i);
  assert.doesNotMatch(header, /aria-disabled="true"/i);
  assert.ok(catalog, "photo guide must exist");
  assert.match(html, /class="catalog-track"[^>]+data-division-view="female"/i);

  for (const [label, count] of [["Front", "01 / 04"], ["Profile", "02 / 04"], ["Shorts", "03 / 04"], ["Jeans", "04 / 04"]]) {
    assert.match(catalog, new RegExp(`<figcaption>\\s*<span>${label}<\\/span>\\s*<span>${count.replace(" / ", " \\/ ")}`, "i"));
  }
});

test("the female catalog scrolls into a concise model profile and keeps a male empty state", async () => {
  const html = await read("index.html");
  const css = await read("styles.css");
  const js = await read("application.js");

  assert.match(html, /<section[^>]+class=["'][^"']*catalog-hero[^"']*["']/i);
  assert.match(html, /data-division-profile=["']female["']/i);
  assert.match(html, /Ploy Shoman/i);
  for (const detail of ["170 CM", "82 CM", "64 CM", "90 CM", "38 EU", "@ploy.shoman"]) {
    assert.match(html, new RegExp(detail.replace(".", "\\."), "i"));
  }
  for (const experience of ["Runway", "Photo shoots", "Advertising"]) {
    assert.match(html, new RegExp(experience, "i"));
  }
  assert.equal((html.match(/class=["'][^"']*experience-shot[^"']*["']/g) ?? []).length, 2);
  assert.match(html, /data-division-profile=["']male["'][^>]+hidden/i);
  assert.match(css, /\.catalog-hero\s*{[^}]*height:\s*100svh[^}]*overflow:\s*hidden/is);
  assert.match(css, /\.model-profile\s*{[^}]*min-height:\s*100svh/is);
  assert.match(js, /data-division-profile/);
});

test("application uses welcoming Bangkok-model defaults and affirmative consent", async () => {
  const html = await read("index.html");

  assert.doesNotMatch(html, /data-age-gate|data-age-dismiss|name=["']adult["']/i);
  for (const [name, value] of [["heightCm", "170"], ["bustCm", "82"], ["waistCm", "64"], ["hipsCm", "90"], ["shoeEu", "38"]]) {
    assert.match(
      html,
      new RegExp(`<input[^>]+name=["']${name}["'][^>]+value=["']${value}["']`, "i"),
      `${name} must use the approved neutral starting value`,
    );
  }
  assert.match(html, /<input[^>]+name=["']consent["'][^>]+required/i);
  assert.match(html, /I confirm my details and photos are accurate, I am over 18, and they may be used to assess my application, match me with relevant castings, and contact me about my application\./i);
  assert.match(html, /<input[^>]+name=["']opportunityEmails["'][^>]*>/i);
  assert.match(html, /Email me about future casting opportunities that may suit my profile\. I can unsubscribe at any time\./i);
});

test("the empty birth-date control shows only its calendar affordance", async () => {
  const html = await read("index.html");
  const css = await read("styles.css");

  assert.match(html, /<label[^>]+class=["'][^"']*date-field[^"']*["'][^>]*>\s*<span>Date of birth<\/span>[\s\S]*?<input[^>]+type=["']date["']/i);
  assert.match(css, /\.date-field\s+input\[type=["']date["']\]:invalid\s*{[^}]*width:\s*44px[^}]*color:\s*transparent/is);
  assert.match(css, /\.date-field\s+input\[type=["']date["']\]:invalid::-webkit-datetime-edit\s*{[^}]*display:\s*none/is);
  assert.match(css, /\.date-field\s+input\[type=["']date["']\]:invalid::-webkit-calendar-picker-indicator\s*{[^}]*margin:\s*0\s+auto/is);
});

test("all seven image slots are optional individually while the form requires one photo overall", async () => {
  const html = await read("index.html");

  assert.match(html, />Model photos<\/h2>/i);
  assert.doesNotMatch(html, />Digitals<\/h2>/i);

  for (const [name, code] of [["face", "CU-01"], ["profile", "PF-01"], ["fullLength", "FL-01"], ["jeans", "JN-01"], ["otherOne", "OT-01"], ["otherTwo", "OT-02"]]) {
    assert.match(html, new RegExp(`>${code}<`, "i"));
    assert.match(html, new RegExp(`<input[^>]+name=["']${name}["'][^>]*>`, "i"));
    assert.doesNotMatch(html, new RegExp(`<input[^>]+name=["']${name}["'][^>]+required`, "i"));
  }
  assert.match(html, /Upload at least one photo/i);
  assert.equal((html.match(/data-upload-preview/g) ?? []).length, 7);
  assert.equal((html.match(/data-reference-src/g) ?? []).length, 5);
  assert.equal((html.match(/class=["'][^"']*upload-prompt[^"']*["']/g) ?? []).length, 7);
  assert.match(html, /<form\b(?![^>]*\baction=)/i);
  assert.match(html, /<button[^>]+type=["']button["'][^>]+data-submit[^>]+disabled/i);
  assert.match(html, /aria-live=["']polite["']/i);
});

test("catalog hero and its guidance fit inside one viewport at every width", async () => {
  const css = await read("styles.css");

  assert.match(css, /\.catalog-hero\s*{[^}]*height:\s*100svh[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto[^}]*overflow:\s*hidden/is);
  assert.match(css, /\.catalog-track\s*{[^}]*height:\s*100%[^}]*min-height:\s*0/is);
  assert.match(css, /\.shot\s*{[^}]*height:\s*100%[^}]*min-height:\s*0/is);
  assert.match(css, /\.guide-strip\s*{[^}]*width:\s*fit-content[^}]*margin:\s*0\s+auto/is);
  assert.match(css, /\.guide-strip\s*{[^}]*max-width:\s*calc\(100%\s*-\s*48px\)/is);
  assert.doesNotMatch(css, /\.shot\s*{[^}]*min-height:\s*calc\(100svh/is);
});

test("range interaction exposes progress for the glass thumb and value capsule", async () => {
  const js = await read("application.js");

  assert.match(js, /--range-progress/);
  assert.match(js, /--range-position/);
});

test("image validation accepts only practical local image files", async () => {
  const { measurementLabel, channelValue, validateImageFile, validatePhotoSelection, buildStoragePath } = await loadApplicationApi();

  assert.equal(measurementLabel("177", "CM"), "177 CM - 69.7 IN");
  assert.equal(channelValue("WhatsApp", " +66 81 234 5678 "), "WhatsApp: +66 81 234 5678");
  assert.equal(channelValue("Instagram", ""), "");
  assert.deepEqual(
    { ...validateImageFile({ name: "face.jpg", type: "image/jpeg", size: 1024 }) },
    { valid: true, message: "face.jpg" },
  );
  assert.deepEqual(
    { ...validateImageFile({ name: "face.webp", type: "image/webp", size: 1024 }) },
    { valid: false, message: "Use a JPG or PNG image." },
  );
  assert.deepEqual(
    { ...validateImageFile({ name: "face.png", type: "image/png", size: 5 * 1024 * 1024 + 1 }) },
    { valid: false, message: "Image must be 5 MB or smaller." },
  );
  assert.deepEqual(
    { ...validatePhotoSelection([]) },
    { valid: false, message: "Add at least one photo." },
  );
  assert.deepEqual(
    { ...validatePhotoSelection([{ name: "face.jpg", type: "image/jpeg", size: 1024 }]) },
    { valid: true, message: "" },
  );
  assert.equal(
    buildStoragePath("51b93b39-86c0-4f78-8c67-8a25850c8d63", "fullLength", "body.JPG"),
    "51b93b39-86c0-4f78-8c67-8a25850c8d63/full-length.jpg",
  );
});

test("the controlled submit button sends the form through native validation", async () => {
  const js = await read("application.js");

  assert.match(js, /submitButton\.addEventListener\(["']click["'],\s*\(\)\s*=>\s*form\.requestSubmit\(\)\)/i);
});

test("application details use translucent entry surfaces and a structured experience picker", async () => {
  const html = await read("index.html");
  const css = await read("styles.css");

  assert.doesNotMatch(html, /field-example|Maylada Srisuk|02 March 2008|Bangkok|maylada@gmail\.com/i);
  assert.match(html, /<select[^>]+name=["']contactType["'][^>]*>[\s\S]*?<option[^>]+value=["']Line["']/i);
  assert.match(html, /<select[^>]+name=["']socialType["'][^>]*>[\s\S]*?<option[^>]+value=["']Instagram["']/i);
  assert.match(html, /class=["'][^"']*entry-surface[^"']*["']/i);
  assert.match(html, /<fieldset[^>]+class=["'][^"']*experience-field[^"']*["']/i);
  assert.match(html, /<summary[^>]+data-experience-summary[^>]*>Select experience<\/summary>/i);
  for (const option of ["Advertising", "Runway", "Photo shoots", "Social media"]) {
    assert.match(html, new RegExp(`name=["']experienceCategories["'][^>]+value=["']${option}["']`, "i"));
  }
  assert.match(html, /<input[^>]+type=["']checkbox["'][^>]+data-experience-other-toggle/i);
  assert.match(html, /<input[^>]+data-experience-other-input[^>]+maxlength=["']80["']/i);
  assert.match(html, /<button[^>]+type=["']button["'][^>]+data-add-experience-other[^>]*>Add<\/button>/i);
  assert.match(html, /data-experience-other-list/i);
  assert.match(html, /name=["']social["'][\s\S]*?class=["'][^"']*experience-field/i);
  assert.match(css, /\.experience-options\s*{[^}]*display:\s*grid/is);
  assert.match(css, /\.compound-field\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[^}]*justify-items:\s*center/is);
  assert.match(css, /\.compound-field\s+select\s*{[^}]*font-size:\s*11px/is);
  assert.match(css, /\.compound-field\s+input\s*{[^}]*text-align:\s*center/is);
});

test("experience labels are normalized consistently and custom values stay independent", async () => {
  const { canonicalExperienceLabel, uniqueExperienceValues } = await loadApplicationApi();

  assert.equal(canonicalExperienceLabel("  tv COMMERCIALS  "), "Tv commercials");
  assert.equal(canonicalExperienceLabel("RUNWAY"), "Runway");
  assert.equal(canonicalExperienceLabel("   "), "");
  assert.deepEqual(
    [...uniqueExperienceValues(["Runway", " runway ", "Tv commercials", "TV COMMERCIALS"])],
    ["Runway", "Tv commercials"],
  );
});

test("Supabase wiring uses a publishable browser key and a private insert-only schema", async () => {
  const html = await read("index.html");
  const config = await read("supabase-config.js");
  const backend = await read("backend.js");
  const application = await read("application.js");
  const migrationNames = await readdir(new URL("supabase/migrations/", siteRoot));
  const migrations = await Promise.all(migrationNames.filter((name) => name.endsWith(".sql")).map((name) => read(`supabase/migrations/${name}`)));
  const sql = migrations.join("\n");

  assert.match(html, /<script src="supabase-config\.js[^>]*><\/script>/i);
  assert.match(config, /https:\/\/zyzwvrogeudwvackduau\.supabase\.co/i);
  assert.match(config, /sb_publishable_/i);
  assert.doesNotMatch(config, /service_role|sb_secret_/i);
  assert.match(backend, /\/storage\/v1\/object\//i);
  assert.match(backend, /\/rest\/v1\/model_applications/i);
  assert.match(sql, /create table public\.model_applications/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /jsonb_array_length\(photo_manifest\) between 1 and 6/i);
  assert.match(sql, /insert into storage\.buckets/i);
  assert.match(sql, /public\s*=\s*false/i);
  assert.match(sql, /for insert\s+to anon/i);
  assert.match(sql, /application_data_use_consent\s+boolean\s+not null/i);
  assert.match(sql, /opportunity_emails_opt_in\s+boolean\s+not null\s+default\s+false/i);
  assert.match(sql, /add column if not exists experience text/i);
  assert.match(sql, /grant insert \(experience\) on table public\.model_applications to anon/i);
  assert.match(sql, /experience_categories\s+text\[\]/i);
  assert.match(sql, /experience_other\s+text\[\]/i);
  assert.match(sql, /create table public\.experience_options/i);
  assert.match(sql, /submission_count\s+integer\s+not null\s+default\s+0/i);
  assert.match(sql, /submission_count\s*\+\s*1\s*>=\s*4/i);
  assert.match(sql, /create trigger[^;]+experience/i);
  assert.match(sql, /grant select on table public\.experience_options to anon/i);
  assert.match(sql, /for select\s+to anon[\s\S]*is_active/i);
  assert.match(sql, /and application_data_use_consent/i);
  assert.match(backend, /application_data_use_consent/i);
  assert.match(backend, /\/rest\/v1\/experience_options/i);
  assert.match(application, /opportunity_emails_opt_in/i);
  assert.match(application, /values\.getAll\(["']experienceCategories["']\)/i);
  assert.match(application, /values\.getAll\(["']experienceOther["']\)/i);
  assert.match(application, /experience_categories:/i);
  assert.match(application, /experience_other:/i);
  assert.doesNotMatch(sql, /grant select[^;]*model_applications[^;]*to anon/i);
  assert.doesNotMatch(sql, /for select[^;]*model_applications[^;]*to anon/i);
});

test("Meridian primary navigation features only AI and Modeling", async () => {
  const meridian = await read("../meridian.group.local/index.html");
  const navigation = meridian.match(/<nav[^>]*aria-label=["']Primary navigation["'][^>]*>([\s\S]*?)<\/nav>/i)?.[1];

  assert.ok(navigation, "Meridian must retain its primary navigation");
  assert.match(navigation, /href=["']ai-systems\.html["'][^>]*>AI<\/a>/i);
  assert.match(navigation, /href=["']\.\.\/modeling\.company\.local\/["'][^>]*>Modeling<\/a>/i);
  assert.doesNotMatch(navigation, />iOS</i);
  assert.doesNotMatch(navigation, />eCom</i);
  assert.doesNotMatch(navigation, />Live Stream</i);
});
