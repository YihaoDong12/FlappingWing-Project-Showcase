'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
// Deploy only the page and media actually referenced by it, never local logs or launch scripts.
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = new Set(['index.html', 'style.css', 'app.js', 'favicon.svg']);
for (const match of html.matchAll(/(?:src|poster|data-film)="(media\/[^"?#]+)"/g)) {
  const relative = match[1];
  if (!/^media\/[a-zA-Z0-9._-]+$/.test(relative)) throw new Error('Invalid media path: ' + relative);
  files.add(relative);
}
for (const relative of files) {
  const source = path.join(root, relative);
  if (!fs.statSync(source).isFile()) throw new Error('Missing deployment file: ' + relative);
}
if (fs.existsSync(output)) {
  // Fail closed instead of reusing a potentially stale publishing directory.
  throw new Error('_site already exists. Build in a clean checkout to avoid publishing stale files.');
}
fs.mkdirSync(output);
let totalBytes = 0;
for (const relative of files) {
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, relative), destination);
  totalBytes += fs.statSync(destination).size;
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(JSON.stringify({ files: [...files], totalBytes }, null, 2));
