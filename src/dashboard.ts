import { readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';

function getDashboardHtml(filePath: string): string {
  const stats = statSync(filePath);
  const name = basename(filePath);
  const size = (stats.size / 1024).toFixed(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BSDesign Live Preview</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0d1117; color: #e6edf3; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

  /* Toolbar */
  .toolbar {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 16px; background: #161b22;
    border-bottom: 1px solid #30363d; flex-shrink: 0;
  }
  .toolbar .logo { font-weight: 700; font-size: 15px; color: #00ff88; white-space: nowrap; }
  .toolbar .file-info { flex: 1; font-size: 12px; color: #8b949e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .toolbar .file-info span { color: #e6edf3; }
  .toolbar .status { display: flex; align-items: center; gap: 6px; font-size: 11px; }
  .toolbar .dot { width: 8px; height: 8px; border-radius: 50%; background: #00ff88; animation: pulse 1.5s infinite; }
  .toolbar .dot.off { background: #ff4444; animation: none; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* Drop zone */
  .drop-zone {
    margin: 8px; padding: 20px; border: 2px dashed #30363d;
    border-radius: 8px; text-align: center; color: #8b949e;
    font-size: 13px; cursor: pointer; transition: all .2s; flex-shrink: 0;
  }
  .drop-zone:hover, .drop-zone.drag { border-color: #00ff88; color: #00ff88; background: #0d111744; }
  .drop-zone input { display: none; }

  /* Preview */
  .preview-wrap { flex: 1; position: relative; min-height: 0; }
  .preview-wrap iframe { width: 100%; height: 100%; border: none; background: #fff; }

  /* Toast */
  .toast {
    position: fixed; bottom: 16px; right: 16px;
    background: #1a1a2e; color: #00ff88; padding: 10px 16px;
    border-radius: 6px; font-size: 12px; border: 1px solid #00ff8844;
    z-index: 100; opacity: 0; transition: opacity .3s; pointer-events: none;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
<div class="toolbar">
  <div class="logo">BSDesign Live</div>
  <div class="file-info">📄 <span id="filename">${name}</span> · ${size} KB · ${stats.mtime.toLocaleTimeString()}</div>
  <div class="status"><span class="dot" id="dot"></span><span id="status-text">Connected</span></div>
</div>

<label class="drop-zone" id="drop-zone" for="file-input">
  Drop a <strong>.bsdesign</strong> file here or click to browse
  <input type="file" id="file-input" accept=".bsdesign">
</label>

<div class="preview-wrap">
  <iframe id="preview" src="/preview"></iframe>
</div>

<div class="toast" id="toast"></div>

<script>
const toast = document.getElementById('toast');
const dot = document.getElementById('dot');
const statusText = document.getElementById('status-text');
const filename = document.getElementById('filename');
const previewFrame = document.getElementById('preview');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

function showToast(msg, duration) {
  toast.textContent = msg; toast.classList.add('show');
  setTimeout(function(){ toast.classList.remove('show'); }, duration || 2500);
}

// WebSocket for live reload
function connectWS() {
  var proto = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(proto + '://' + location.host + '/ws');
  ws.onopen = function() {
    dot.classList.remove('off');
    statusText.textContent = 'Connected';
  };
  ws.onmessage = function() {
    previewFrame.src = previewFrame.src;
    showToast('File changed - preview reloaded');
  };
  ws.onclose = function() {
    dot.classList.add('off');
    statusText.textContent = 'Reconnecting...';
    setTimeout(connectWS, 2000);
  };
}
connectWS();

// File select via dialog
fileInput.addEventListener('change', function() {
  if (fileInput.files.length > 0) {
    selectFile(fileInput.files[0].path || fileInput.files[0].name);
  }
});

// Drag and drop
dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drag'); });
dropZone.addEventListener('drop', function(e) {
  e.preventDefault(); dropZone.classList.remove('drag');
  var file = e.dataTransfer.files[0];
  if (file) selectFile(file.path || file.name);
});

// Click on preview frame to reload
previewFrame.addEventListener('load', function() { showToast('Preview ready', 1500); });

function selectFile(path) {
  filename.textContent = '...';
  fetch('/api/select', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({file:path}) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) {
        filename.textContent = data.name;
        previewFrame.src = '/preview?_=' + Date.now();
        showToast('Loaded: ' + data.name);
      } else {
        showToast('Error: ' + (data.error || 'unknown'));
      }
    });
}
</script>
</body>
</html>`;
}

export { getDashboardHtml };
