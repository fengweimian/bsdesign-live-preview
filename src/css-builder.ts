import { CssBlock } from './parser.js';

export function buildCss(blocks: CssBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (!block.enabled) continue;
    const rules = block.rules
      .filter(r => r.enabled)
      .map(r => `  ${r.property}: ${r.value};`);
    if (rules.length === 0) continue;
    lines.push(`${block.selector} {`);
    lines.push(rules.join('\n'));
    lines.push('}\n');
  }
  return lines.join('\n');
}
