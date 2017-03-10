'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const INDEX_HTML = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf8');

const CWD = process.cwd();

const fileNames = fs.readdirSync(CWD).filter(f => /\.mp3$/.test(f));

// TODO: get time
const html = INDEX_HTML
  .replace('{data}', JSON.stringify(fileNames))
  .replace('{title}', process.argv[2] || 'Simple Audio Player');
console.log(html);
