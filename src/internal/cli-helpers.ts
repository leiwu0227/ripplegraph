import fs from 'node:fs';
import type { EffectPolicy } from '../effects.js';
import { RipplegraphError } from '../schema.js';

export interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | string[] | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = '', ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) {
      appendFlag(flags, key, true);
    } else {
      appendFlag(flags, key, next);
      i++;
    }
  }
  return { command, positional, flags };
}

function appendFlag(flags: ParsedArgs['flags'], key: string, value: string | boolean): void {
  const existing = flags[key];
  if (existing === undefined) {
    flags[key] = value;
    return;
  }
  if (Array.isArray(existing)) {
    if (typeof value === 'string') existing.push(value);
    return;
  }
  if (typeof existing === 'string' && typeof value === 'string') {
    flags[key] = [existing, value];
    return;
  }
  flags[key] = value;
}

export function stringFlag(flags: ParsedArgs['flags'], name: string): string | undefined {
  const value = flags[name];
  if (Array.isArray(value)) return value.at(-1);
  return typeof value === 'string' ? value : undefined;
}

export function stringFlags(flags: ParsedArgs['flags'], name: string): string[] {
  const value = flags[name];
  if (Array.isArray(value)) return value;
  return typeof value === 'string' ? [value] : [];
}

export function workflowRoot(flags: ParsedArgs['flags']): string {
  return stringFlag(flags, 'workflow-root') ?? process.cwd();
}

export function effectPolicyFromFlags(flags: ParsedArgs['flags']): EffectPolicy {
  const repeated = stringFlags(flags, 'allow-effect');
  const commaSeparated = stringFlags(flags, 'allow-effects').flatMap((value) =>
    value
      .split(',')
      .map((effect) => effect.trim())
      .filter(Boolean),
  );
  return { allowedEffects: [...repeated, ...commaSeparated] };
}

export function required(value: string | undefined, message: string): string {
  if (!value) throw new RipplegraphError('E_MISSING_ARG', message);
  return value;
}

export function requiredFlag(flags: ParsedArgs['flags'], name: string): string {
  return required(stringFlag(flags, name), `missing --${name}`);
}

export function parseJson(raw: string | undefined, missingMessage: string, invalidPrefix: string): unknown {
  if (!raw) throw new RipplegraphError('E_MISSING_ARG', missingMessage);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new RipplegraphError('E_BAD_JSON', `${invalidPrefix}: ${(error as Error).message}`);
  }
}

export function parseJsonFromFileOrValue(filePath: string | undefined, raw: string | undefined, missingMessage: string, invalidPrefix: string): unknown {
  const payload = filePath ? fs.readFileSync(filePath, 'utf8') : required(raw, missingMessage);
  return parseJson(payload, missingMessage, invalidPrefix);
}

export function emitLine(text: string): void {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}

export function emitJson(payload: unknown): void {
  emitLine(JSON.stringify(payload, null, 2));
}

export function jsonErrorPayload(error: unknown): { status: 'error'; code: string; message: string } {
  if (error instanceof RipplegraphError) {
    return { status: 'error', code: error.code, message: error.message };
  }
  return { status: 'error', code: 'E_INTERNAL', message: (error as Error).message };
}

export function errorText(error: unknown): string {
  if (error instanceof RipplegraphError) return `${error.code}: ${error.message}`;
  return `E_INTERNAL: ${(error as Error).message}`;
}
