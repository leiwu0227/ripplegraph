import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerGraphPackage } from '../../src/index.js';

export function makeRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeGraphPackage(
  root: string,
  folder: string,
  manifest: Record<string, unknown>,
  now: string,
  force = false,
): string {
  const packageRoot = path.join(root, folder);
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'graph.json'), JSON.stringify(manifest), 'utf8');
  registerGraphPackage({ workflowRoot: root, packageRoot, force, now });
  return packageRoot;
}

export function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}
