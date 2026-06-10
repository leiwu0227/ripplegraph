import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface GraphPackageManifestBaseInput {
  id: string;
  version?: string;
  title?: string;
  description?: string;
  activationHints?: string[];
}

export interface DispatcherGraphPackageManifestInput extends GraphPackageManifestBaseInput {
  kind: 'dispatcher';
}

interface ExecutableGraphPackageManifestBaseInput extends GraphPackageManifestBaseInput {
  effects?: string[];
  outputSchema?: unknown;
  entry: string;
  nodes: Record<string, unknown>;
}

export interface WorkflowGraphPackageManifestInput extends ExecutableGraphPackageManifestBaseInput {
  kind?: 'workflow';
  requires?: unknown[];
}

export interface CallableGraphPackageManifestInput extends ExecutableGraphPackageManifestBaseInput {
  kind: 'callable';
  inputSchema?: unknown;
}

export type GraphPackageManifestInput =
  | DispatcherGraphPackageManifestInput
  | WorkflowGraphPackageManifestInput
  | CallableGraphPackageManifestInput;

export interface WorkspaceManifestInput {
  id?: string;
  version?: string;
  title?: string;
  description?: string;
  entryGraph?: string;
}

export interface CreateTestWorkspaceOptions {
  prefix?: string;
  workspace?: WorkspaceManifestInput;
  graphs: GraphPackageManifestInput[];
  hidden?: boolean;
}

const DEFAULT_REGISTERED_AT = '2026-05-23T00:00:00.000Z';

function packageDir(rootDir: string, graphId: string): string {
  return path.join(rootDir, '.ripplegraph', 'graphs', graphId);
}

function packageRelativePath(graphId: string): string {
  return ['.ripplegraph', 'graphs', graphId].join('/');
}

function normalizedManifest(input: GraphPackageManifestInput): Record<string, unknown> {
  const base = {
    id: input.id,
    version: input.version ?? '0.1.0',
    kind: input.kind ?? 'workflow',
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.activationHints !== undefined ? { activationHints: input.activationHints } : {}),
  };
  if (input.kind === 'dispatcher') return base;
  return {
    ...base,
    ...(input.effects !== undefined ? { effects: input.effects } : {}),
    ...(input.outputSchema !== undefined ? { outputSchema: input.outputSchema } : {}),
    ...(input.kind === 'callable' && input.inputSchema !== undefined ? { inputSchema: input.inputSchema } : {}),
    ...(input.kind !== 'callable' && input.requires !== undefined ? { requires: input.requires } : {}),
    entry: input.entry,
    nodes: input.nodes,
  };
}

function workspaceManifest(input: WorkspaceManifestInput | undefined): Record<string, unknown> {
  const workspace = input ?? {};
  return {
    id: workspace.id ?? 'test-workspace',
    version: workspace.version ?? '0.1.0',
    ...(workspace.title !== undefined ? { title: workspace.title } : {}),
    ...(workspace.description !== undefined ? { description: workspace.description } : {}),
    ...(workspace.entryGraph !== undefined ? { entryGraph: workspace.entryGraph } : {}),
  };
}

export function createTestWorkspace(options: CreateTestWorkspaceOptions): string {
  const prefix = options.prefix ?? 'ripplegraph-workspace-';
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  const workspaceFile = options.hidden
    ? path.join(root, '.ripplegraph', 'workflow.json')
    : path.join(root, 'workflow.json');
  fs.mkdirSync(path.dirname(workspaceFile), { recursive: true });
  fs.writeFileSync(workspaceFile, JSON.stringify(workspaceManifest(options.workspace)), 'utf8');

  const registryEntries: Record<string, unknown> = {};
  for (const graph of options.graphs) {
    const manifest = normalizedManifest(graph);
    const pkgDir = packageDir(root, graph.id);
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'graph.json'), JSON.stringify(manifest), 'utf8');
    registryEntries[graph.id] = {
      id: graph.id,
      version: manifest.version,
      kind: manifest.kind,
      ...(manifest.title !== undefined ? { title: manifest.title } : {}),
      ...(manifest.description !== undefined ? { description: manifest.description } : {}),
      activationHints: (manifest.activationHints as string[] | undefined) ?? [],
      effects: (manifest.effects as string[] | undefined) ?? [],
      requires: (manifest.requires as unknown[] | undefined) ?? [],
      path: packageRelativePath(graph.id),
      registeredAt: DEFAULT_REGISTERED_AT,
    };
  }
  const registryPath = path.join(root, '.ripplegraph', 'registry.json');
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, JSON.stringify({ version: 1, graphs: registryEntries }), 'utf8');

  return root;
}
