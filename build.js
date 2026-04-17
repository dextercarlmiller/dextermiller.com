#!/usr/bin/env node
/**
 * build.js — sync shared partials into all HTML pages.
 *
 * Run:  node build.js
 *
 * Each page is processed by replacing the content between the
 * <!-- @@partial:start --> / <!-- @@partial:end --> marker pairs
 * with the current content of src/partials/<partial>.html.
 *
 * To change the nav, footer, back-to-top button, theme-flash
 * script, or common script tags: edit the file in src/partials/,
 * then run `node build.js` to propagate the change to all pages.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

/* ── Partials to sync ──────────────────────────────────────── */
const PARTIALS = ['nav', 'footer', 'back-to-top', 'theme-flash', 'scripts-common', 'analytics'];

/* ── Pages to process (resume is standalone, skip it) ──────── */
const PAGES = [
  { file: 'index.html',   activePage: 'about'    },
  { file: 'project.html', activePage: 'projects' },
  { file: 'contact.html', activePage: 'contact'  },
  { file: '404.html',     activePage: null        },
];

/* ── Load all partials ──────────────────────────────────────── */
const partialContent = {};
let loadErrors = 0;
for (const name of PARTIALS) {
  const p = path.join('src', 'partials', name + '.html');
  if (fs.existsSync(p)) {
    try {
      partialContent[name] = fs.readFileSync(p, 'utf8');
    } catch (err) {
      console.error(`  ERROR  failed to read partial "${name}": ${err.message}`);
      loadErrors++;
    }
  } else {
    console.error(`  ERROR  partial not found: ${p}`);
    loadErrors++;
  }
}
if (loadErrors > 0) {
  console.error(`\nAborted — ${loadErrors} partial(s) could not be loaded.`);
  process.exit(1);
}

/* ── Build nav for a specific page (sets the active link) ───── */
function buildNav(activePage) {
  let nav = partialContent['nav'] || '';
  nav = nav.replace('{{ACTIVE_ABOUT}}',    activePage === 'about'    ? ' active' : '');
  nav = nav.replace('{{ACTIVE_PROJECTS}}', activePage === 'projects' ? ' active' : '');
  nav = nav.replace('{{ACTIVE_CONTACT}}',  activePage === 'contact'  ? ' active' : '');
  return nav;
}

/* ── Replace a partial region in an HTML string ─────────────── */
function replacePartial(html, name, content) {
  const start = `<!-- @@${name}:start -->`;
  const end   = `<!-- @@${name}:end -->`;
  const si = html.indexOf(start);
  const ei = html.indexOf(end);
  if (si === -1 || ei === -1) return html; // marker not present, skip
  return html.slice(0, si + start.length) + '\n' + content + html.slice(ei);
}

/* ── Process each page ──────────────────────────────────────── */
let built = 0;
let pageErrors = 0;
for (const { file, activePage } of PAGES) {
  if (!fs.existsSync(file)) {
    console.warn(`  skip  ${file} (not found)`);
    continue;
  }

  try {
    let html = fs.readFileSync(file, 'utf8');

    for (const name of PARTIALS) {
      const content = name === 'nav' ? buildNav(activePage) : partialContent[name];
      if (content !== undefined) {
        html = replacePartial(html, name, content);
      }
    }

    fs.writeFileSync(file, html, 'utf8');
    console.log(`  built ${file}`);
    built++;
  } catch (err) {
    console.error(`  ERROR  failed to process ${file}: ${err.message}`);
    pageErrors++;
  }
}

if (pageErrors > 0) {
  console.error(`\nFinished with errors — ${built} built, ${pageErrors} failed.`);
  process.exit(1);
}
console.log(`\nDone — ${built} page(s) rebuilt.`);
