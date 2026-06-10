import {
  advanceRun,
  decideGate,
  getState,
  listRuns,
  resumeRun,
  RipplegraphError,
  startRun,
  stepRun,
  suspendRun,
  type JsonSchema,
  type RunList,
  type StateOk,
  type StepRunResponse,
} from './index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitLine, errorText, parseArgs, parseJsonFromFileOrValue, required, stringFlag, workflowRoot, type ParsedArgs } from './internal/cli-helpers.js';
import { exampleOutput } from './internal/coach-responses.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const minimalTemplateDir = path.join(packageRoot, 'templates', 'minimal');

function parseOutput(args: ParsedArgs): unknown {
  const file = stringFlag(args.flags, 'file');
  return parseJsonFromFileOrValue(file, args.positional[0], 'missing JSON or --file', 'payload is not valid JSON');
}

function renderNoFocusedRun(state: ReturnType<typeof getState> & { status: 'no_focused_run' }, runs: RunList): string {
  const lines = ['No focused run.', '', 'Orientation:', `  ${state.orientation}`, '', 'If unsure:', '  ripplegraph-demo explain'];
  lines.push('', 'Available graphs:');
  for (const graph of state.availableGraphs) {
    const title = graph.title ? `  ${graph.title}` : '';
    lines.push(`  ${graph.id}  ${graph.kind}${title}`);
  }
  const resumable = runs.runs.filter((run) => run.status === 'suspended');
  lines.push('', 'Resumable runs:');
  if (resumable.length === 0) {
    lines.push('  (none)');
  } else {
    for (const run of resumable) lines.push(`  ${formatRun(run)}`);
  }
  lines.push('', 'Next:');
  lines.push(`  ripplegraph-demo start ${state.availableGraphs[0]?.id ?? '<graph-id>'} --run <run-id>`);
  for (const run of resumable.slice(0, 3)) lines.push(`  ripplegraph-demo resume ${run.id}`);
  return lines.join('\n');
}

function renderSuspendedState(state: StateOk): string {
  return [
    `Suspended run: ${state.run.id}`,
    `Graph: ${state.position.graph}`,
    `Node: ${state.position.node}`,
    '',
    'Next allowed command:',
    `  ripplegraph-demo resume ${state.run.id}`,
  ].join('\n');
}

function renderActiveState(state: StateOk): string {
  const lines = [
    `Current run: ${state.run.id}`,
    `Graph: ${state.position.graph}`,
    `Node: ${state.position.node}`,
    '',
    'Orientation:',
    `  ${state.orientation}`,
    '',
    'If unsure:',
    '  ripplegraph-demo explain',
    '',
    state.node.purpose,
  ];
  if (state.node.instructions) lines.push(state.node.instructions);
  lines.push(...renderNeighborhood(state));
  if (state.responseContract.command === 'decide') {
    lines.push('', 'External decision required:');
    lines.push(...renderOutputSchema(state.responseContract.schema));
    lines.push('', 'Next allowed command:', `  ripplegraph-demo advance '${exampleOutput(state.responseContract.schema)}'`);
    return lines.join('\n');
  }
  lines.push('', 'Required output:');
  lines.push(...renderOutputSchema(state.node.outputSchema));
  lines.push('', 'Next allowed command:', `  ripplegraph-demo advance '${exampleOutput(state.node.outputSchema)}'`);
  return lines.join('\n');
}

function renderNeighborhood(state: StateOk): string[] {
  const lines: string[] = [];
  if (state.context.previous.length > 0) {
    lines.push('', 'Recent context:');
    for (const previous of state.context.previous) {
      lines.push(`  ${previous.id}: ${previous.purpose}`);
      if (previous.output !== undefined) lines.push(`    output: ${compactJson(previous.output)}`);
    }
  }
  if (state.context.next.length > 0) {
    lines.push('', 'Available routes:');
    for (const next of state.context.next) {
      const condition = next.when ? ` when ${compactJson(next.when)}` : '';
      lines.push(`  -> ${next.id}: ${next.purpose}${condition}`);
    }
  }
  return lines;
}

function compactJson(value: unknown): string {
  const text = JSON.stringify(value);
  if (!text) return String(value);
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function renderOutputSchema(schema: JsonSchema): string[] {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(properties);
  if (entries.length === 0) return ['  {}'];
  return entries.map(([name, property]) => {
    const suffix = required.has(name) ? '' : ' (optional)';
    return `  ${name}: ${describeSchema(property)}${suffix}`;
  });
}

function describeSchema(schema: JsonSchema): string {
  if (schema.enum) return schema.enum.map(String).join(' | ');
  return schema.type ?? 'any';
}

function renderStep(response: StepRunResponse): string {
  if (response.status === 'completed') return `Run completed: ${response.run.id}\nNode: ${response.position.node}`;
  if (response.status === 'validation_error') {
    return [`Validation failed for run: ${response.run.id}`, ...response.errors.map((error) => `  ${error.path}: ${error.message}`)].join('\n');
  }
  return renderActiveState(response);
}

function renderRuns(runs: RunList): string {
  const lines = [`Focused run: ${runs.focusedRunId ?? 'none'}`, '', 'Runs:'];
  if (runs.runs.length === 0) {
    lines.push('  (none)');
  } else {
    for (const run of runs.runs) lines.push(`  ${formatRun(run)}`);
  }
  return lines.join('\n');
}

function formatRun(run: RunList['runs'][number]): string {
  return `${run.id}  ${run.status}  ${run.rootGraph}  ${run.position.node}`;
}

function listTemplateFiles(dir: string, baseDir = dir): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listTemplateFiles(filePath, baseDir);
      return [path.relative(baseDir, filePath)];
    })
    .sort();
}

function initDemoProject(targetPath: string, force: boolean): string {
  const root = path.resolve(targetPath);
  const templateFiles = listTemplateFiles(minimalTemplateDir);
  const protectedFiles = templateFiles.map((filePath) => path.join(root, filePath));
  const existingFile = protectedFiles.find((filePath) => fs.existsSync(filePath));
  if (existingFile && !force) {
    throw new RipplegraphError('E_ALREADY_EXISTS', `${existingFile} already exists; rerun with --force to replace demo files`);
  }

  for (const filePath of templateFiles) {
    const targetFile = path.join(root, filePath);
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.copyFileSync(path.join(minimalTemplateDir, filePath), targetFile);
  }

  return [
    `Initialized Ripplegraph demo at ${root}`,
    '',
    'Next:',
    `  ripplegraph-demo status --workflow-root ${root}`,
  ].join('\n');
}

const HELP = `ripplegraph-demo — reference agent-facing Ripplegraph CLI

Canonical commands:
  status [--workflow-root <path>]
  explain [--workflow-root <path>]
  advance <json> [--file <path>] [--workflow-root <path>]

Compatibility/debug commands:
  init <path> [--force]
  runs [--workflow-root <path>]
  start <graph-id> --run <run-id> [--workflow-root <path>]
  pause [note] [--workflow-root <path>]
  resume <run-id> [--workflow-root <path>]
  submit <json> [--file <path>] [--workflow-root <path>]
  decide <json> [--file <path>] [--workflow-root <path>]
`;

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (!args.command || args.command === 'help' || args.command === '--help' || args.flags['help']) {
    emitLine(HELP);
    return;
  }
  if (args.command === 'init') {
    emitLine(initDemoProject(required(args.positional[0], 'missing init path'), args.flags['force'] === true));
    return;
  }
  const root = workflowRoot(args.flags);
  switch (args.command) {
    case 'status': {
      const state = getState({ workflowRoot: root });
      emitLine(state.status === 'no_focused_run' ? renderNoFocusedRun(state, listRuns({ workflowRoot: root })) : renderActiveState(state));
      return;
    }
    case 'explain': {
      const state = getState({ workflowRoot: root });
      emitLine(state.status === 'no_focused_run' ? renderNoFocusedRun(state, listRuns({ workflowRoot: root })) : renderActiveState(state));
      return;
    }
    case 'runs':
      emitLine(renderRuns(listRuns({ workflowRoot: root })));
      return;
    case 'start':
      emitLine(
        renderActiveState(
          startRun({
            workflowRoot: root,
            graphId: required(args.positional[0], 'missing graph id'),
            runId: required(stringFlag(args.flags, 'run'), 'missing --run'),
            effectPolicy: { allowedEffects: ['read_repo'] },
          }),
        ),
      );
      return;
    case 'pause':
      emitLine(renderSuspendedState(suspendRun({ workflowRoot: root, note: args.positional.join(' ') || undefined })));
      return;
    case 'resume':
      emitLine(renderActiveState(resumeRun({ workflowRoot: root, runId: required(args.positional[0], 'missing run id') })));
      return;
    case 'advance':
      emitLine(renderStep(advanceRun({ workflowRoot: root, input: parseOutput(args) })));
      return;
    case 'submit':
      emitLine(renderStep(stepRun({ workflowRoot: root, output: parseOutput(args) })));
      return;
    case 'decide':
      emitLine(renderStep(decideGate({ workflowRoot: root, decision: parseOutput(args) })));
      return;
    default:
      throw new RipplegraphError('E_UNKNOWN_COMMAND', `unknown command: ${args.command}`);
  }
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${errorText(error)}\n`);
  process.exit(1);
});
