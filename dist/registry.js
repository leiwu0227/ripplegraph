import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { loadGraphPackage } from './graph-package.js';
import { registryPath } from './storage.js';
import { idSchema, RipplegraphError, startRequirementSchema } from './schema.js';
export const registryEntrySchema = z
    .object({
    id: idSchema,
    version: z.string().min(1),
    kind: z.enum(['dispatcher', 'workflow', 'callable']),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    activationHints: z.array(z.string().min(1)).default([]),
    requires: z.array(startRequirementSchema).default([]),
    effects: z.array(idSchema).default([]),
    path: z.string().min(1),
    registeredAt: z.string().min(1),
})
    .strict();
export const registrySchema = z
    .object({
    version: z.literal(1),
    graphs: z.record(idSchema, registryEntrySchema).default({}),
})
    .strict();
function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    catch (error) {
        throw new RipplegraphError('E_BAD_JSON', `failed to read JSON at ${filePath}: ${error.message}`);
    }
}
function writeJson(filePath, payload) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}
function formatIssues(issues) {
    return issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
}
function sortRegistry(registry) {
    return {
        version: 1,
        graphs: Object.fromEntries(Object.entries(registry.graphs).sort(([left], [right]) => left.localeCompare(right))),
    };
}
function normalizeRegisteredPath(workflowRoot, packageRoot) {
    const root = path.resolve(workflowRoot);
    const target = path.resolve(packageRoot);
    const relative = path.relative(root, target);
    const insideRoot = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    return (insideRoot ? relative : target).replaceAll(path.sep, '/');
}
export function readRegistry(workflowRoot) {
    const filePath = registryPath(workflowRoot);
    if (!fs.existsSync(filePath))
        return { version: 1, graphs: {} };
    const result = registrySchema.safeParse(readJson(filePath));
    if (!result.success) {
        throw new RipplegraphError('E_INVALID_REGISTRY', formatIssues(result.error.issues));
    }
    return sortRegistry(result.data);
}
export function writeRegistry(workflowRoot, registry) {
    writeJson(registryPath(workflowRoot), registrySchema.parse(sortRegistry(registry)));
}
export function listRegisteredGraphs(workflowRoot) {
    return Object.values(readRegistry(workflowRoot).graphs).sort((left, right) => left.id.localeCompare(right.id));
}
export function registerGraphPackage(options) {
    const graphPackage = loadGraphPackage(options.packageRoot);
    const registry = readRegistry(options.workflowRoot);
    const registeredPath = normalizeRegisteredPath(options.workflowRoot, graphPackage.path);
    const existing = registry.graphs[graphPackage.manifest.id];
    if (existing && existing.path !== registeredPath && !options.force) {
        throw new RipplegraphError('E_GRAPH_ALREADY_REGISTERED', `${graphPackage.manifest.id} is already registered at ${existing.path}; rerun with --force to replace it`);
    }
    const entry = {
        id: graphPackage.manifest.id,
        version: graphPackage.manifest.version,
        kind: graphPackage.manifest.kind,
        title: graphPackage.manifest.title,
        description: graphPackage.manifest.description,
        activationHints: graphPackage.manifest.activationHints,
        requires: graphPackage.manifest.requires,
        effects: graphPackage.manifest.effects,
        path: registeredPath,
        registeredAt: options.now ?? new Date().toISOString(),
    };
    registry.graphs[entry.id] = entry;
    writeRegistry(options.workflowRoot, registry);
    return entry;
}
export function resolveRegisteredGraphPackage(options) {
    const entry = readRegistry(options.workflowRoot).graphs[options.graphId];
    if (!entry)
        throw new RipplegraphError('E_UNKNOWN_GRAPH', `unknown registered graph: ${options.graphId}`);
    if (options.kind && entry.kind !== options.kind) {
        throw new RipplegraphError('E_WRONG_GRAPH_KIND', `graph ${options.graphId} is ${entry.kind}, expected ${options.kind}`);
    }
    const packageRoot = path.isAbsolute(entry.path) ? entry.path : path.join(options.workflowRoot, entry.path);
    const graphPackage = loadGraphPackage(packageRoot);
    if (graphPackage.manifest.id !== entry.id || graphPackage.manifest.kind !== entry.kind) {
        throw new RipplegraphError('E_REGISTRY_PACKAGE_MISMATCH', `registered graph ${entry.id} points to package ${graphPackage.manifest.id} (${graphPackage.manifest.kind})`);
    }
    return { entry, graphPackage };
}
