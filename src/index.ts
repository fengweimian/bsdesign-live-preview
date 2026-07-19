#!/usr/bin/env node
import { resolve, basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
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

if (!process.argv[2]) {
  console.log('No file specified. Open http://localhost:4400 and drag a .bsdesign file to start.');
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

    const allCssFiles = data.design.assets.css.children || [];
    const allBlocks = allCssFiles.flatMap(f => f.blocks || []);
    const customCss = buildCss(allBlocks);

    const allJsFiles = data.design.assets.js.children || [];
    const customJs = allJsFiles.flatMap(f => f.blocks?.map((b: { value?: string }) => b.value || '') || []).join('\n');

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

function tryListen(port: number): void {
  server.listen(port, () => {
    console.log(`\n  BSDesign Live Preview`);
    console.log(`  ─────────────────────`);
    console.log(`  Dashboard: http://localhost:${port}`);
    console.log(`  File:      ${filePath || '(none - drag a file)'}\n`);
  });
  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      if (port === 4400) {
        try {
          if (process.platform === 'win32') {
            execSync('powershell -Command "Get-NetTCPConnection -LocalPort 4400 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"', { windowsHide: true });
          } else {
            execSync('lsof -ti:4400 | xargs kill -9 2>/dev/null', { windowsHide: true });
          }
        } catch {}
        console.log(`  Port 4400 was busy (old process killed). Retrying...`);
        setTimeout(() => tryListen(4400), 500);
      } else {
        console.log(`  Port 4400 unavailable. Using port ${port}`);
        tryListen(port + 1);
      }
    } else {
      console.error(`  Server error: ${e.message}`);
    }
  });
}
tryListen(4400);
