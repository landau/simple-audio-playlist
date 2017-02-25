'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const INDEX_HTML = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf8');
const ITEM_HTML = fs.readFileSync(path.join(TEMPLATES_DIR, 'item.html'), 'utf8');

const CWD = process.cwd();

const fileNames = fs.readdirSync(CWD).filter(f => /\.mp3$/.test(f));

// TODO: get time
const items = fileNames.map(f => ITEM_HTML.replace('{src}', f)).join('\n');
const html = INDEX_HTML
  .replace('{items}', items)
  .replace('{title}', process.argv[2] || 'Simple Audio Player');
console.log(html);
