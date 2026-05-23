import {
  abandonRun,
  advanceRun,
  applyDispatchAction,
  getCallableCall,
  decideGate,
  getDispatchRequest,
  getState,
  listCallableCalls,
  listRegisteredGraphs,
  loadGraphPackage,
  registerGraphPackage,
  resumeRun,
  RipplegraphError,
  startCallableCall,
  startRun,
  stepRun,
  stepCallableCall,
  suspendRun,
  validateWorkflowRoot,
  type GraphPackageManifest,
} from './index.js';
import {
  effectPolicyFromFlags,
  emitJson,
  jsonErrorPayload,
  parseArgs,
  parseJson,
  required,
  requiredFlag,
  stringFlag,
  workflowRoot,
} from './internal/cli-helpers.js';

const HELP = `ripplegraph — focused-run Coach runtime POC

Canonical commands:
  state [--workflow-root <path>]
  explain [--workflow-root <path>]
  advance --input <json> [--workflow-root <path>]
  dispatch --request <text> [--workflow-root <path>]
  dispatch --action <json> [--workflow-root <path>]
  call --graph <graph-id> --input <json> [--call-id <id>] [--workflow-root <path>]
  call-state --call-id <id> [--workflow-root <path>]
  call-step --call-id <id> --output <json> [--workflow-root <path>]
  call-list [--workflow-root <path>]

Compatibility/debug commands:
  validate --workflow-root <path>
  graph validate <path> [--workflow-root <path>]
  graph register <path> [--workflow-root <path>] [--force]
  graph list [--workflow-root <path>]
  start --graph <graph-id> --run-id <id> [--workflow-root <path>]
  step --output <json> [--workflow-root <path>]
  decide --decision <json> [--workflow-root <path>]
  suspend [--note <text>] [--workflow-root <path>]
  resume --run-id <id> [--workflow-root <path>]
  abandon [--reason <text>] [--workflow-root <path>]
`;

async function main(argv: string[]): Promise<void> {
  const { command, flags } = parseArgs(argv);
  if (!command || command === 'help' || command === '--help' || flags['help']) {
    process.stdout.write(HELP);
    return;
  }

  switch (command) {
    case 'graph':
      emitJson(handleGraphCommand(flags, parseArgs(argv).positional));
      return;
    case 'validate':
      emitJson(validateWorkflowRoot(workflowRoot(flags)));
      return;
    case 'start':
      emitJson(
        startRun({
          workflowRoot: workflowRoot(flags),
          graphId: requiredFlag(flags, 'graph'),
          runId: requiredFlag(flags, 'run-id'),
          effectPolicy: effectPolicyFromFlags(flags),
        }),
      );
      return;
    case 'state':
      emitJson(getState({ workflowRoot: workflowRoot(flags) }));
      return;
    case 'explain':
      emitJson(getState({ workflowRoot: workflowRoot(flags) }));
      return;
    case 'advance':
      emitJson(advanceRun({ workflowRoot: workflowRoot(flags), input: parseJson(stringFlag(flags, 'input'), 'missing --input', '--input is not valid JSON') }));
      return;
    case 'dispatch':
      emitJson(handleDispatchCommand(flags));
      return;
    case 'call':
      emitJson(
        startCallableCall({
          workflowRoot: workflowRoot(flags),
          graphId: requiredFlag(flags, 'graph'),
          callId: stringFlag(flags, 'call-id'),
          input: parseJson(stringFlag(flags, 'input'), 'missing --input', '--input is not valid JSON'),
          effectPolicy: effectPolicyFromFlags(flags),
        }),
      );
      return;
    case 'call-state':
      emitJson(getCallableCall({ workflowRoot: workflowRoot(flags), callId: requiredFlag(flags, 'call-id') }));
      return;
    case 'call-step':
      emitJson(
        stepCallableCall({
          workflowRoot: workflowRoot(flags),
          callId: requiredFlag(flags, 'call-id'),
          output: parseJson(stringFlag(flags, 'output'), 'missing --output', '--output is not valid JSON'),
        }),
      );
      return;
    case 'call-list':
      emitJson(listCallableCalls({ workflowRoot: workflowRoot(flags) }));
      return;
    case 'step':
      emitJson(stepRun({ workflowRoot: workflowRoot(flags), output: parseJson(stringFlag(flags, 'output'), 'missing --output', '--output is not valid JSON') }));
      return;
    case 'decide':
      emitJson(decideGate({ workflowRoot: workflowRoot(flags), decision: parseJson(stringFlag(flags, 'decision'), 'missing --decision', '--decision is not valid JSON') }));
      return;
    case 'suspend':
      emitJson(suspendRun({ workflowRoot: workflowRoot(flags), note: stringFlag(flags, 'note') }));
      return;
    case 'resume':
      emitJson(resumeRun({ workflowRoot: workflowRoot(flags), runId: requiredFlag(flags, 'run-id') }));
      return;
    case 'abandon':
      emitJson(abandonRun({ workflowRoot: workflowRoot(flags), reason: stringFlag(flags, 'reason') }));
      return;
    default:
      throw new RipplegraphError('E_UNKNOWN_COMMAND', `unknown command: ${command}`);
  }
}

function handleDispatchCommand(flags: ReturnType<typeof parseArgs>['flags']): unknown {
  const request = stringFlag(flags, 'request');
  const action = stringFlag(flags, 'action');
  if (request && action) {
    throw new RipplegraphError('E_INVALID_ARGS', '--request and --action are mutually exclusive');
  }
  if (request) {
    return getDispatchRequest({ workflowRoot: workflowRoot(flags), request });
  }
  if (action) {
    return applyDispatchAction({
      workflowRoot: workflowRoot(flags),
      action: parseJson(action, 'missing --action', '--action is not valid JSON'),
      effectPolicy: effectPolicyFromFlags(flags),
    });
  }
  throw new RipplegraphError('E_MISSING_ARG', 'missing --request or --action');
}

function packageSummary(manifest: GraphPackageManifest): Omit<GraphPackageManifest, 'nodes' | 'inputSchema' | 'outputSchema' | 'entry'> & { entry: string } {
  return {
    id: manifest.id,
    version: manifest.version,
    kind: manifest.kind,
    title: manifest.title,
    description: manifest.description,
    activationHints: manifest.activationHints,
    effects: manifest.effects,
    entry: manifest.entry,
  };
}

function handleGraphCommand(flags: ReturnType<typeof parseArgs>['flags'], positional: string[]): unknown {
  const [subcommand, packageRoot] = positional;
  switch (subcommand) {
    case 'validate': {
      const graphPackage = loadGraphPackage(required(packageRoot, 'missing graph package path'));
      return { status: 'ok', package: packageSummary(graphPackage.manifest), path: graphPackage.path };
    }
    case 'register':
      return {
        status: 'ok',
        entry: registerGraphPackage({
          workflowRoot: workflowRoot(flags),
          packageRoot: required(packageRoot, 'missing graph package path'),
          force: flags['force'] === true,
        }),
      };
    case 'list':
      return { status: 'ok', graphs: listRegisteredGraphs(workflowRoot(flags)) };
    default:
      throw new RipplegraphError('E_UNKNOWN_COMMAND', `unknown graph command: ${subcommand ?? '<missing>'}`);
  }
}

main(process.argv.slice(2)).catch((error) => {
  emitJson(jsonErrorPayload(error));
  process.exit(1);
});
