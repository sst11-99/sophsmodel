"use strict";
// Public output is an explicit list. No network, shell commands, environment files,
// migrations, private records or source-image discovery are used by this build.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "public");
const files = JSON.parse(fs.readFileSync(path.join(__dirname, "runtime-files.json"), "utf8"));
if (!Array.isArray(files) || files.length !== new Set(files).size || files.length === 0) throw new Error("Invalid runtime manifest");
for (const name of files) {
  if (typeof name !== "string" || !name || name.includes("\\") || name.split("/").some(p => !p || p === "." || p === ".." || p.startsWith(".")) || path.isAbsolute(name)) throw new Error("Unsafe runtime path");
  const source = path.resolve(root, name);
  if (!source.startsWith(root + path.sep) || !fs.lstatSync(source).isFile() || fs.realpathSync(source) !== source) throw new Error("Runtime sources must be ordinary files inside this repository");
}
// Never remove unexpected files or symbolic links from an existing output folder.
if (fs.existsSync(output)) {
  if (!fs.lstatSync(output).isDirectory() || fs.realpathSync(output) !== output) throw new Error("Unsafe existing output");
  const allowed = new Set(files);
  function inspect(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Symbolic link in output");
      if (entry.isDirectory()) inspect(full);
      else if (!entry.isFile() || !allowed.has(path.relative(output, full).split(path.sep).join("/"))) throw new Error("Unexpected file in output; preserve it before rebuilding");
    }
  }
  inspect(output);
}
const temporary = fs.mkdtempSync(path.join(root, ".runtime-build-"));
try {
  for (const name of files) {
    const target = path.join(temporary, name);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(root, name), target);
  }
  if (fs.existsSync(output)) fs.rmSync(output, {recursive: true});
  fs.renameSync(temporary, output);
} finally {
  if (fs.existsSync(temporary)) fs.rmSync(temporary, {recursive: true});
}
console.log(`Built ${files.length} allowlisted static files in public/. api/locale.js remains a separate server function.`);
