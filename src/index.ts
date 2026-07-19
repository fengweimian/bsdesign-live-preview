#!/usr/bin/env node
import { resolve, basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { watch } from 'chokidar';
import multer from 'multer';
import { parseBsDesign } from './parser.js';
import { renderPage } from './renderer.js';
import { buildCss } from './css-builder.js';
import { getDashboardHtml } from './dashboard.js';

let filePath = resolve(process.argv[2] || '');
const PORT = parseInt(process.env.PORT || '4400', 10);

if (!process.argv[2]) {
  console.log('No file specified. Open http://localhost:' + PORT + ' and drag a .bsdesign file to start.');
}

let currentHtml = '';
let watcher: ReturnType<typeof watch> | null = null;

function build(): boolean {
  try {
    if (!existsSync(filePath)) {
      currentHtml = '<h1 style="text-align:center;padding:4rem">Drop a .bsdesign file to preview</h1>';
      return true;
    }
    const data = parseBsDesign(filePath);
    const page = data.design.pages.children[0];
    const html = renderPage(page.html, page.name);

    const cssFile = data.design.assets.css.children[0];
    const customCss = cssFile?.blocks ? buildCss(cssFile.blocks) : '';

    const jsFile = data.design.assets.js.children?.[0];
    const customJs = jsFile?.blocks?.map((b: { value?: string }) => b.value || '').join('\n') || '';

    const full = html
      .replace('<!-- CUSTOM_CSS -->', `<style>\n${customCss}\n</style>`)
      .replace('/* CUSTOM_JS */', customJs);

    currentHtml = full;
    return true;
  } catch (e) {
    console.error('Build error:', e instanceof Error ? e.message : e);
    currentHtml = `<h1 style="text-align:center;padding:4rem;color:red">Build error: ${e instanceof Error ? e.message : String(e)}</h1>`;
    return true;
  }
}

function startWatcher() {
  if (watcher) watcher.close();
  if (!existsSync(filePath)) return;
  watcher = watch(filePath, { persistent: true, awaitWriteFinish: { stabilityThreshold: 200 } });
  watcher.on('change', () => {
    build();
    notifyClients();
  });
}

const app = express();
app.use(express.json());

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

// Dashboard (main UI)
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getDashboardHtml(filePath));
});

// Live preview page (rendered .bsdesign)
app.get('/preview', (_req, res) => {
  if (!currentHtml) build();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(currentHtml || '<h1>Build failed</h1>');
});

// API: upload file
const upload = multer({ dest: join(tmpdir(), 'bsdesign-uploads') });
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) { res.json({ ok: false, error: 'No file uploaded' }); return; }
    filePath = resolve(req.file.path);
    build();
    startWatcher();
    notifyClients();
    res.json({ ok: true, name: req.file.originalname });
  } catch (e) {
    res.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

// Startup
if (filePath) build();
startWatcher();

server.listen(PORT, () => {
  console.log(`\n  BSDesign Live Preview`);
  console.log(`  ─────────────────────`);
  console.log(`  Dashboard: http://localhost:${PORT}`);
  console.log(`  File:      ${filePath || '(none - drag a file)'}\n`);
});
