import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraphPackage } from '../src/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templateRoot = path.join(repoRoot, 'templates', 'minimal');

interface RegistryEntry {
  id: string;
  kind: string;
  version: string;
  path: string;
}

describe('bundled minimal template', () => {
  it('keeps registry entries aligned with each graph package manifest', () => {
    const registry = JSON.parse(
      fs.readFileSync(path.join(templateRoot, '.ripplegraph', 'registry.json'), 'utf8'),
    ) as { version: number; graphs: Record<string, RegistryEntry> };
    expect(registry.version).toBe(1);
    const entries = Object.values(registry.graphs);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const packageRoot = path.join(templateRoot, entry.path);
      const pkg = loadGraphPackage(packageRoot);
      expect(pkg.manifest.id).toBe(entry.id);
      expect(pkg.manifest.kind).toBe(entry.kind);
      expect(pkg.manifest.version).toBe(entry.version);
    }
  });
});
