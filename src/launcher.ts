import { resolve, basename, join } from 'node:path';
import { watchFile, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import multer from 'multer';
import { parseBsDesign } from './parser.js';
import { renderPage } from './renderer.js';
import { buildCss } from './css-builder.js';
import { getDashboardHtml } from './dashboard.js';

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

  if (filePath) {
    let serverRunning = false;
    try {
      execSync('powershell -Command "Invoke-WebRequest -Uri http://localhost:4400 -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue | Out-Null"', { windowsHide: true, stdio: 'pipe' });
      serverRunning = true;
    } catch {}

    if (serverRunning) {
      try {
        const psUpload = `Invoke-WebRequest -Uri http://localhost:4400/api/upload -Method POST -Form @{file=Get-Item '${filePath.replace(/'/g, "''")}'} -UseBasicParsing`;
        execSync(`powershell -Command "${psUpload}"`, { windowsHide: true });
        execSync('start http://localhost:4400', { windowsHide: true });
      } catch {}
      process.exit(0);
    }
  }
}


function build(): boolean {
  try {
    if (!filePath || !existsSync(filePath)) {
      currentHtml = '<h1 style="text-align:center;padding:4rem;color:#8b949e">拖拽 .bsdesign 文件开始预览</h1>';
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
    currentHtml = `<h1 style="text-align:center;padding:4rem;color:red">错误: ${e instanceof Error ? e.message : String(e)}</h1>`;
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
    filePath = resolve(req.file.path);
    build();
    startWatcher();
    notifyClients();
    res.json({ ok: true, name: req.file.originalname });
  } catch (e) {
    res.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

function startServer() {
  build();
  startWatcher();
  tryListen(4400);
}

function tryListen(port: number): void {
  httpServer.listen(port, () => {
    try { execSync(`start http://localhost:${port}`, { windowsHide: true }); } catch {}
  });
  httpServer.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      if (port === 4400) {
        try {
          execSync('powershell -Command "Get-NetTCPConnection -LocalPort 4400 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }"', { windowsHide: true });
        } catch {}
        setTimeout(() => tryListen(4400), 500);
      } else {
        tryListen(port + 1);
      }
    }
  });
}

// Start server (CLI mode or file picker with no running server)
if (filePath) startServer();
