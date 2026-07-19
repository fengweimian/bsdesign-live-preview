import { resolve, basename, join } from 'node:path';
import { watchFile, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import multer from 'multer';
import { parseBsDesign } from './parser.js';
import { renderPage } from './renderer.js';
import { buildCss } from './css-builder.js';
import { getDashboardHtml } from './dashboard.js';

const PORT = 4400;
let filePath = '';
let currentHtml = '';

// Parse command line or show file picker
const arg = process.argv[2];
if (arg) {
  filePath = resolve(arg);
} else {
  try {
    const ps = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Filter = 'Bootstrap Studio Files (*.bsdesign)|*.bsdesign'; $f.Title = 'Select .bsdesign file'; if ($f.ShowDialog() -eq 'OK') { $f.FileName }`;
    filePath = execSync(`powershell -Command "${ps}"`, { encoding: 'utf-8', windowsHide: true }).trim();
  } catch {}
}

function build(): boolean {
  try {
    if (!filePath || !existsSync(filePath)) {
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
    currentHtml = html
      .replace('<!-- CUSTOM_CSS -->', `<style>\n${customCss}\n</style>`)
      .replace('/* CUSTOM_JS */', customJs);
    return true;
  } catch (e) {
    currentHtml = `<h1 style="text-align:center;padding:4rem;color:red">Error: ${e instanceof Error ? e.message : String(e)}</h1>`;
    return true;
  }
}

function startWatcher() {
  if (!filePath || !existsSync(filePath)) return;
  watchFile(filePath, { interval: 200 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      build();
      notifyClients();
    }
  });
}

const app = express();
app.use(express.json());
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

let clients: import('ws').WebSocket[] = [];
wss.on('connection', (ws) => {
  clients.push(ws);
  ws.on('close', () => { clients = clients.filter(c => c !== ws); });
});

function notifyClients() {
  for (const client of clients) { try { client.send('reload'); } catch {} }
}

app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(getDashboardHtml(filePath));
});

app.get('/preview', (_req, res) => {
  if (!currentHtml) build();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(currentHtml || '<h1>Build failed</h1>');
});

const upload = multer({ dest: join(tmpdir(), 'bsdesign-uploads') });

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) { res.json({ ok: false, error: 'No file uploaded' }); return; }
    const newPath = resolve(req.file.path);
    filePath = newPath;
    build();
    startWatcher();
    notifyClients();
    res.json({ ok: true, name: req.file.originalname });
  } catch (e) {
    res.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

build();
startWatcher();

httpServer.listen(PORT, () => {
  const { execSync: e } = require('node:child_process');
  try { e(`start http://localhost:${PORT}`, { windowsHide: true }); } catch {}
  console.log(`\n  BSDesign Live Preview\n  Dashboard: http://localhost:${PORT}\n`);
});
