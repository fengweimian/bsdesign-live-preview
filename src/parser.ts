import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

export interface CssBlock {
  selector: string;
  mediaQuery: boolean | string;
  containerQuery: boolean | string;
  system: boolean;
  enabled: boolean;
  rules: CssRule[];
}

export interface CssRule {
  property: string;
  value: string;
  enabled: boolean;
  system: boolean;
}

export interface BsComponent {
  class: string;
  label?: string;
  cssClasses?: { system?: { main?: string; customPropClasses?: string } };
  overrides?: Record<string, Record<string, string>>;
  properties?: Record<string, unknown>;
  children?: (BsComponent | string)[];
}

interface BsDesignFile {
  version: number;
  timestamp: number;
  design: {
    name: string;
    settings: Record<string, unknown>;
    framework: string;
    assets: {
      css: { children: { name: string; blocks: CssBlock[] }[] };
      js: { children: { name: string; blocks: { value?: string }[] }[] };
    };
    pages: {
      children: {
        name: string;
        html: BsComponent;
      }[];
    };
  };
}

export function parseBsDesign(filePath: string): BsDesignFile {
  const raw = readFileSync(filePath);
  const magic = raw.readUInt16BE(0);
  if (magic === 0x1f8b) {
    return JSON.parse(gunzipSync(raw).toString('utf-8')) as BsDesignFile;
  }
  return JSON.parse(raw.toString('utf-8')) as BsDesignFile;
}
