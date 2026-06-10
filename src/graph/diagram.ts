import {
  RipplegraphError,
  type CallableGraphManifest,
  type GraphPackageManifest,
  type Node,
  type WorkflowGraphManifest,
} from '../schema.js';
import { stableValue } from '../internal/json-utils.js';

type ExecutableGraphManifest = WorkflowGraphManifest | CallableGraphManifest;

export type DiagramFormat = 'mermaid' | 'dot';

export function renderGraphDiagram(manifest: GraphPackageManifest, format: DiagramFormat = 'mermaid'): string {
  if (format !== 'mermaid' && format !== 'dot') {
    throw new RipplegraphError('E_INVALID_DIAGRAM_FORMAT', `unsupported graph diagram format: ${format}`);
  }
  if (manifest.kind === 'dispatcher') {
    const note = `${graphLabel(manifest)}: metadata-only dispatcher package, no nodes to diagram`;
    return format === 'mermaid' ? `%% ${note}\n` : `// ${note}\n`;
  }
  return format === 'mermaid' ? renderMermaid(manifest) : renderDot(manifest);
}

function renderMermaid(manifest: ExecutableGraphManifest): string {
  const lines = [`%% ${graphLabel(manifest)}`, 'flowchart LR'];
  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    lines.push(`  ${diagramNodeId(nodeId)}["${mermaidLabel(nodeLabel(manifest, nodeId, node))}"]`);
  }
  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    for (const edge of node.edges) {
      const label = edge.when ? `|${mermaidLabel(formatWhen(edge.when))}|` : '';
      lines.push(`  ${diagramNodeId(nodeId)} -->${label} ${diagramNodeId(edge.to)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function renderDot(manifest: ExecutableGraphManifest): string {
  const lines = [`digraph "${dotLabel(manifest.id)}" {`, '  rankdir=LR;', `  label="${dotLabel(graphLabel(manifest))}";`];
  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    lines.push(`  "${diagramNodeId(nodeId)}" [label="${dotLabel(nodeLabel(manifest, nodeId, node))}"];`);
  }
  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    for (const edge of node.edges) {
      const label = edge.when ? ` [label="${dotLabel(formatWhen(edge.when))}"]` : '';
      lines.push(`  "${diagramNodeId(nodeId)}" -> "${diagramNodeId(edge.to)}"${label};`);
    }
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

function graphLabel(manifest: GraphPackageManifest): string {
  return `${manifest.id} (${manifest.kind}) v${manifest.version}`;
}

function nodeLabel(manifest: ExecutableGraphManifest, nodeId: string, node: Node): string {
  const tags = [
    nodeId === manifest.entry ? 'entry' : undefined,
    node.gate ? 'gate' : undefined,
    node.terminal ? 'terminal' : undefined,
    ...(node.sideChannelActions ?? []).map((action) => `side: ${action.id}`),
  ].filter((tag): tag is string => tag !== undefined);
  return tags.length > 0 ? `${nodeId}\n${tags.join('\n')}` : nodeId;
}

function formatWhen(when: Record<string, unknown>): string {
  return Object.entries(when)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(', ');
}

function formatValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(stableValue(value));
}

function diagramNodeId(nodeId: string): string {
  const safe = nodeId.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(safe) ? safe : `n_${safe}`;
}

function mermaidLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '#quot;').replace(/\n/g, '<br/>');
}

function dotLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
