import { BsComponent } from './parser.js';

function buildUtilityClasses(props: Record<string, unknown>): string {
  const classes: string[] = [];
  const p = props as Record<string, string | number | boolean>;

  if (p['padding-y'] && p['padding-y'] !== '') classes.push(`py-${p['padding-y']}`);
  if (p['padding-y-xl'] && p['padding-y-xl'] !== '') classes.push(`py-xl-${p['padding-y-xl']}`);
  if (p['padding-x'] && p['padding-x'] !== '') classes.push(`px-${p['padding-x']}`);
  if (p['padding'] && p['padding'] !== '') classes.push(`p-${p['padding']}`);
  if (p['margin-bottom'] && p['margin-bottom'] !== '') classes.push(`mb-${p['margin-bottom']}`);
  if (p['margin-x'] && p['margin-x'] !== '') classes.push(`mx-${p['margin-x']}`);
  if (p['gutter-y'] && p['gutter-y'] !== '') classes.push(`gy-${p['gutter-y']}`);
  if (p['display'] && p['display'] !== '') {
    const d = p['display'] as string;
    if (d === 'flex') classes.push('d-flex');
    else if (d === 'block') classes.push('d-block');
    else if (d === 'inline') classes.push('d-inline');
    else classes.push(`d-${d}`);
  }
  if (p['flex-shrink'] && p['flex-shrink'] !== '' && p['flex-shrink'] !== '0') classes.push(`flex-shrink-${p['flex-shrink']}`);
  if (p['fit'] && p['fit'] !== '') classes.push(`object-fit-${p['fit']}`);
  if (p['margin-end'] && p['margin-end'] !== '') classes.push(`me-${p['margin-end']}`);
  if (p['margin-start'] && p['margin-start'] !== '') classes.push(`ms-${p['margin-start']}`);
  if (p['margin-top'] && p['margin-top'] !== '') classes.push(`mt-${p['margin-top']}`);
  if (p['font-weight'] && p['font-weight'] !== '') {
    const fw = p['font-weight'] as string;
    if (fw === 'bold') classes.push('fw-bold');
    else if (fw === 'bolder') classes.push('fw-bolder');
    else if (fw === 'normal') classes.push('fw-normal');
    else if (fw === 'light') classes.push('fw-light');
  }
  if (p['font-size'] && p['font-size'] !== '') classes.push(`fs-${p['font-size']}`);
  if (p['text-lead']) classes.push('lead');
  if (p['text-alignment'] && p['text-alignment'] !== '') classes.push(`text-${p['text-alignment']}`);
  if (p['contextual-color'] && p['contextual-color'] !== '') classes.push(`text-${p['contextual-color']}`);
  if (p['contextual-background'] && p['contextual-background'] !== '') classes.push(p['contextual-background'] as string);
  if (p['contextual-border-radius'] && p['contextual-border-radius'] !== '') classes.push(p['contextual-border-radius'] as string);
  if (p['heading-display'] && p['heading-display'] !== '') classes.push(`display-${p['heading-display']}`);
  if (p['cardStyle'] && p['cardStyle'] !== '') classes.push(p['cardStyle'] as string);

  return classes.join(' ');
}

function getBootstrapClass(comp: BsComponent): string {
  const main = comp.cssClasses?.system?.main || '';
  const custom = comp.cssClasses?.system?.customPropClasses || '';
  const utils = buildUtilityClasses(comp.properties || {});
  return [main, custom, utils].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function renderChildren(children: (BsComponent | string)[] | undefined): string {
  if (!children || children.length === 0) return '';
  let result = '';
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (typeof c === 'string') {
      const prev = children[i - 1];
      if (prev && typeof prev !== 'string' && prev.class === 'InlineCharacter' && prev.children && prev.children.length > 0) continue;
      result += escapeHtml(c);
    } else {
      result += renderComponent(c);
    }
  }
  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderComponent(comp: BsComponent): string {
  const cls = getBootstrapClass(comp);
  const children = renderChildren(comp.children);
  const props = comp.properties || {};
  const overrides = comp.overrides?.['/'] || {};

  switch (comp.class) {
    case 'HTML':
    case 'Body':
      return children;

    case 'Container': {
      const fluid = props.fluid ? '-fluid' : '';
      return `<div class="container${fluid} ${cls}">\n${children}\n</div>`;
    }

    case 'Row':
      return `<div class="row ${cls}">\n${children}\n</div>`;

    case 'Column':
      return `<div class="${cls}">\n${children}\n</div>`;

    case 'Heading': {
      const level = (props.type as string) || 'h2';
      return `<${level} class="${cls}">${children}</${level}>`;
    }

    case 'Paragraph':
      return `<p class="${cls}">${children}</p>`;

    case 'Badge':
      return `<span class="${cls}">${children}</span>`;

    case 'Button': {
      const href = (props.href as string) || '#';
      return `<a href="${href}" class="btn ${cls}">${children}</a>`;
    }

    case 'Image': {
      const src = overrides.src || '';
      const width = overrides.width || '';
      const height = overrides.height || '';
      const alt = overrides.alt || '';
      return `<img src="${src}" class="${cls}"${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''} alt="${alt}">`;
    }

    case 'Div':
      return `<div class="${cls}">\n${children}\n</div>`;

    case 'Span':
      return `<span class="${cls}">${children}</span>`;

    case 'Link': {
      const href = overrides.href || '#';
      return `<a href="${href}" class="${cls}">${children}</a>`;
    }

    case 'InlineCharacter':
      return escapeHtml((comp.children as string[])?.[0] || '');

    case 'CustomCode':
      return children;

    case 'Form':
      return `<form class="${cls}">\n${children}\n</form>`;

    case 'Input': {
      const type = overrides.type || 'text';
      const placeholder = overrides.placeholder || '';
      return `<input type="${type}" class="form-control ${cls}" placeholder="${placeholder}">`;
    }

    case 'Textarea': {
      const placeholder = overrides.placeholder || '';
      return `<textarea class="form-control ${cls}" placeholder="${placeholder}">${children}</textarea>`;
    }

    case 'Select':
      return `<select class="form-select ${cls}">\n${children}\n</select>`;

    case 'Label':
      return `<label class="form-label ${cls}">${children}</label>`;

    case 'Card':
      return `<div class="card ${cls}">\n${children}\n</div>`;

    case 'CardBody':
      return `<div class="card-body ${cls}">\n${children}\n</div>`;

    case 'CardTitle':
      return `<h5 class="card-title ${cls}">${children}</h5>`;

    case 'CardText':
      return `<p class="card-text ${cls}">${children}</p>`;

    case 'Navbar': {
      const expand = cls.includes('expand') ? '' : ' navbar-expand-lg';
      return `<nav class="navbar${expand} bg-body-tertiary ${cls}">\n${children}\n</nav>`;
    }

    case 'Nav':
      return `<ul class="nav ${cls}">\n${children}\n</ul>`;

    case 'NavItem':
      return `<li class="nav-item ${cls}">${children}</li>`;

    case 'Table':
      return `<table class="table ${cls}">\n${children}\n</table>`;

    case 'Alert':
      return `<div class="alert ${cls}">${children}</div>`;

    case 'Accordion':
      return `<div class="accordion ${cls}">\n${children}\n</div>`;

    case 'ListGroup':
      return `<ul class="list-group ${cls}">\n${children}\n</ul>`;

    default:
      return `<div class="${cls}">\n${children}\n</div>`;
  }
}

export function renderPage(html: BsComponent, pageName: string): string {
  const bodyContent = renderComponent(html);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(pageName)}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <!-- CUSTOM_CSS -->
  <style id="inline-style">
    body { padding: 2rem 1rem; }
    .bslive-toolbar {
      position: fixed; bottom: 16px; right: 16px;
      background: #1a1a2e; color: #00ff88;
      border-radius: 8px; padding: 6px 14px;
      font-family: monospace; font-size: 12px;
      z-index: 9999; opacity: 0.85;
      border: 1px solid #00ff8844;
    }
    .bslive-dot { display: inline-block; width: 8px; height: 8px;
      background: #00ff88; border-radius: 50%; margin-right: 6px;
      animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  </style>
</head>
<body>
${bodyContent}
<div class="bslive-toolbar" id="toolbar"><span class="bslive-dot"></span>Live Preview</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script>/* CUSTOM_JS */</script>
<script>
(function() {
  var proto = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(proto + '://' + location.host + '/ws');
  ws.onmessage = function() { location.reload(); };
  ws.onclose = function() {
    document.getElementById('toolbar').innerHTML = '<span class="bslive-dot" style="background:#ff4444"></span>Disconnected';
    setTimeout(function() { location.reload(); }, 2000);
  };
})();
</script>
</body>
</html>`;
}
