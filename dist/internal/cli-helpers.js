import fs from 'node:fs';
import { RipplegraphError } from '../schema.js';
export function parseArgs(argv) {
    const [command = '', ...rest] = argv;
    const positional = [];
    const flags = {};
    for (let i = 0; i < rest.length; i++) {
        const arg = rest[i];
        if (!arg.startsWith('--')) {
            positional.push(arg);
            continue;
        }
        const key = arg.slice(2);
        const next = rest[i + 1];
        if (next === undefined || next.startsWith('--')) {
            appendFlag(flags, key, true);
        }
        else {
            appendFlag(flags, key, next);
            i++;
        }
    }
    return { command, positional, flags };
}
function appendFlag(flags, key, value) {
    const existing = flags[key];
    if (existing === undefined) {
        flags[key] = value;
        return;
    }
    if (Array.isArray(existing)) {
        if (typeof value === 'string')
            existing.push(value);
        return;
    }
    if (typeof existing === 'string' && typeof value === 'string') {
        flags[key] = [existing, value];
        return;
    }
    flags[key] = value;
}
export function stringFlag(flags, name) {
    const value = flags[name];
    if (Array.isArray(value))
        return value.at(-1);
    return typeof value === 'string' ? value : undefined;
}
export function stringFlags(flags, name) {
    const value = flags[name];
    if (Array.isArray(value))
        return value;
    return typeof value === 'string' ? [value] : [];
}
export function workflowRoot(flags) {
    return stringFlag(flags, 'workflow-root') ?? process.cwd();
}
export function effectPolicyFromFlags(flags) {
    const repeated = stringFlags(flags, 'allow-effect');
    const commaSeparated = stringFlags(flags, 'allow-effects').flatMap((value) => value
        .split(',')
        .map((effect) => effect.trim())
        .filter(Boolean));
    return { allowedEffects: [...repeated, ...commaSeparated] };
}
export function required(value, message) {
    if (!value)
        throw new RipplegraphError('E_MISSING_ARG', message);
    return value;
}
export function requiredFlag(flags, name) {
    return required(stringFlag(flags, name), `missing --${name}`);
}
export function parseJson(raw, missingMessage, invalidPrefix) {
    if (!raw)
        throw new RipplegraphError('E_MISSING_ARG', missingMessage);
    try {
        return JSON.parse(raw);
    }
    catch (error) {
        throw new RipplegraphError('E_BAD_JSON', `${invalidPrefix}: ${error.message}`);
    }
}
export function parseJsonFromFileOrValue(filePath, raw, missingMessage, invalidPrefix) {
    const payload = filePath ? fs.readFileSync(filePath, 'utf8') : required(raw, missingMessage);
    return parseJson(payload, missingMessage, invalidPrefix);
}
export function emitLine(text) {
    process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}
export function emitJson(payload) {
    emitLine(JSON.stringify(payload, null, 2));
}
export function jsonErrorPayload(error) {
    if (error instanceof RipplegraphError) {
        return error.details === undefined
            ? { status: 'error', code: error.code, message: error.message }
            : { status: 'error', code: error.code, message: error.message, details: error.details };
    }
    return { status: 'error', code: 'E_INTERNAL', message: error.message };
}
export function errorText(error) {
    if (error instanceof RipplegraphError)
        return `${error.code}: ${error.message}`;
    return `E_INTERNAL: ${error.message}`;
}
