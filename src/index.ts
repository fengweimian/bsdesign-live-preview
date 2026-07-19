#!/usr/bin/env node
import { resolve } from 'node:path';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { watch } from 'chokidar';
import { parseBsDesign } from './parser.js';
import { renderPage } from './renderer.js';
import { buildCss } from './css-builder.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: bsdesign-live <path/to/file.bsdesign>');
  process.exit(1);
}

const absPath = resolve(filePath);
const PORT = parseInt(process.env.PORT || '4400', 10);

let currentHtml = '';
let lastBuild = '';

function build() {
  try {
    const data = parseBsDesign(absPath);
    const page = data.design.pages.children[0];
    const html = renderPage(page.html, page.name);

    const cssFile = data.design.assets.css.children[0];
    const customCss = cssFile?.blocks ? buildCss(cssFile.blocks) : '';

    const jsFile = data.design.assets.js.children?.[0];
    const customJs = jsFile?.blocks?.map((b: { value?: string }) => b.value || '').join('\n') || '';

    const full = html
      .replace('<!-- CUSTOM_CSS -->', `<style>\n${customCss}\n</style>`)
      .replace('/* CUSTOM_JS */', customJs);

    if (full !== lastBuild) {
      lastBuild = full;
      currentHtml = full;
      return true;
    }
    currentHtml = full;
    return false;
  } catch (e) {
    console.error('Build error:', e instanceof Error ? e.message : e);
    return false;
  }
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

let clients: import('ws').WebSocket[] = [];

wss.on('connection', (ws) => {
  clients.push(ws);
  ws.on('close', () => { clients = clients.filter(c => c !== ws); });
});

function notifyClients() {
  for (const client of clients) {
    try { client.send('reload'); } catch {}
  }
}

app.get('/', (_req, res) => {
  if (!currentHtml) build();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(currentHtml || '<h1>Build failed</h1>');
});

build();
console.log(`\n  BSDesign Live Preview`);
console.log(`  ─────────────────────`);
console.log(`  URL:     http://localhost:${PORT}`);
console.log(`  File:    ${absPath}`);
console.log(`  Watching for changes...\n`);

const watcher = watch(absPath, { persistent: true, awaitWriteFinish: { stabilityThreshold: 200 } });
watcher.on('change', () => {
  const changed = build();
  if (changed) {
    notifyClients();
    console.log(`  [${new Date().toLocaleTimeString()}] File changed - reloading ${clients.length} client(s)`);
  }
});

server.listen(PORT, () => {});
