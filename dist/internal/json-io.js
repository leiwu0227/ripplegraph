import fs from 'node:fs';
import path from 'node:path';
import { RipplegraphError } from '../schema.js';
export function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    catch (error) {
        throw new RipplegraphError('E_BAD_JSON', `failed to read JSON at ${filePath}: ${error.message}`);
    }
}
export function writeJson(filePath, payload) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}
