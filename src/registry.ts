import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { loadGraphPackage, type GraphPackage } from './graph-package.js';
import { readJson, writeJson } from './internal/json-io.js';
import { formatIssues } from './internal/zod-issues.js';
import { registryPath } from './storage.js';
import {
  idSchema,
  RipplegraphError,
  startRequirementSchema,
  type CallableGraphManifest,
  type DispatcherGraphManifest,
  type GraphPackageManifest,
  type WorkflowGraphManifest,
} from './schema.js';

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

export type RegistryEntry = z.infer<typeof registryEntrySchema>;
export type GraphRegistry = z.infer<typeof registrySchema>;

export interface RegisterGraphPackageOptions {
  workflowRoot: string;
  packageRoot: string;
  force?: boolean;
  now?: string;
}

// Maps the requested kind to the manifest variant the runtime kind checks below guarantee,
// so callers that pass an explicit kind get a narrowed manifest without local guards.
export type ManifestForKind<K extends RegistryEntry['kind'] | undefined> = K extends 'dispatcher'
  ? DispatcherGraphManifest
  : K extends 'workflow'
    ? WorkflowGraphManifest
    : K extends 'callable'
      ? CallableGraphManifest
      : GraphPackageManifest;

export interface ResolveRegisteredGraphPackageOptions<
  K extends RegistryEntry['kind'] | undefined = RegistryEntry['kind'] | undefined,
> {
  workflowRoot: string;
  graphId: string;
  kind?: K;
}

function sortRegistry(registry: GraphRegistry): GraphRegistry {
  return {
    version: 1,
    graphs: Object.fromEntries(Object.entries(registry.graphs).sort(([left], [right]) => left.localeCompare(right))),
  };
}

function normalizeRegisteredPath(workflowRoot: string, packageRoot: string): string {
  const root = path.resolve(workflowRoot);
  const target = path.resolve(packageRoot);
  const relative = path.relative(root, target);
  const insideRoot =
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
  return (insideRoot ? relative : target).replaceAll(path.sep, '/');
}

export function readRegistry(workflowRoot: string): GraphRegistry {
  const filePath = registryPath(workflowRoot);
  if (!fs.existsSync(filePath)) return { version: 1, graphs: {} };
  const result = registrySchema.safeParse(readJson(filePath));
  if (!result.success) {
    throw new RipplegraphError('E_INVALID_REGISTRY', formatIssues(result.error.issues));
  }
  return sortRegistry(result.data);
}

export function writeRegistry(workflowRoot: string, registry: GraphRegistry): void {
  writeJson(registryPath(workflowRoot), registrySchema.parse(sortRegistry(registry)));
}

export function listRegisteredGraphs(workflowRoot: string): RegistryEntry[] {
  return Object.values(readRegistry(workflowRoot).graphs).sort((left, right) => left.id.localeCompare(right.id));
}

export function registerGraphPackage(options: RegisterGraphPackageOptions): RegistryEntry {
  const graphPackage = loadGraphPackage(options.packageRoot);
  const registry = readRegistry(options.workflowRoot);
  const registeredPath = normalizeRegisteredPath(options.workflowRoot, graphPackage.path);
  const existing = registry.graphs[graphPackage.manifest.id];
  if (existing && existing.path !== registeredPath && !options.force) {
    throw new RipplegraphError(
      'E_GRAPH_ALREADY_REGISTERED',
      `${graphPackage.manifest.id} is already registered at ${existing.path}; rerun with --force to replace it`,
    );
  }

  const entry: RegistryEntry = {
    id: graphPackage.manifest.id,
    version: graphPackage.manifest.version,
    kind: graphPackage.manifest.kind,
    title: graphPackage.manifest.title,
    description: graphPackage.manifest.description,
    activationHints: graphPackage.manifest.activationHints,
    requires: graphPackage.manifest.kind === 'workflow' ? graphPackage.manifest.requires : [],
    effects: graphPackage.manifest.kind === 'dispatcher' ? [] : graphPackage.manifest.effects,
    path: registeredPath,
    registeredAt: options.now ?? new Date().toISOString(),
  };
  registry.graphs[entry.id] = entry;
  writeRegistry(options.workflowRoot, registry);
  return entry;
}

export function resolveRegisteredGraphPackage<K extends RegistryEntry['kind'] | undefined = undefined>(
  options: ResolveRegisteredGraphPackageOptions<K>,
): {
  entry: RegistryEntry;
  graphPackage: GraphPackage<ManifestForKind<K>>;
} {
  const entry = readRegistry(options.workflowRoot).graphs[options.graphId];
  if (!entry) throw new RipplegraphError('E_UNKNOWN_GRAPH', `unknown registered graph: ${options.graphId}`);
  if (options.kind && entry.kind !== options.kind) {
    throw new RipplegraphError('E_WRONG_GRAPH_KIND', `graph ${options.graphId} is ${entry.kind}, expected ${options.kind}`);
  }
  const packageRoot = path.isAbsolute(entry.path) ? entry.path : path.join(options.workflowRoot, entry.path);
  const graphPackage = loadGraphPackage(packageRoot);
  if (graphPackage.manifest.id !== entry.id || graphPackage.manifest.kind !== entry.kind) {
    throw new RipplegraphError(
      'E_REGISTRY_PACKAGE_MISMATCH',
      `registered graph ${entry.id} points to package ${graphPackage.manifest.id} (${graphPackage.manifest.kind})`,
    );
  }
  // The kind checks above guarantee the manifest matches the requested kind's variant.
  return { entry, graphPackage: graphPackage as GraphPackage<ManifestForKind<K>> };
}
