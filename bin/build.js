'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const INDEX_HTML = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf8');
const JS = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.js'), 'utf8');

const CWD = process.cwd();

const fileNames = fs.readdirSync(CWD).filter(f => /\.mp3$/.test(f));
const data = fileNames.map(f => {
  return {
    src: f,
    label: f.replace('.mp3', '')
  };
})

// TODO: get time
const html = INDEX_HTML
  .replace('{data}', JSON.stringify(fileNames))
  .replace('{js}', JS)
  .replace('{title}', process.argv[2] || 'Simple Audio Player');
console.log(html);
