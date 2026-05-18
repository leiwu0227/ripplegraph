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
            flags[key] = true;
        }
        else {
            flags[key] = next;
            i++;
        }
    }
    return { command, positional, flags };
}
export function stringFlag(flags, name) {
    const value = flags[name];
    return typeof value === 'string' ? value : undefined;
}
export function workflowRoot(flags) {
    return stringFlag(flags, 'workflow-root') ?? process.cwd();
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
        return { status: 'error', code: error.code, message: error.message };
    }
    return { status: 'error', code: 'E_INTERNAL', message: error.message };
}
export function errorText(error) {
    if (error instanceof RipplegraphError)
        return `${error.code}: ${error.message}`;
    return `E_INTERNAL: ${error.message}`;
}
