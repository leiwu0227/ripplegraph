import {
  abandonRun,
  decideGate,
  getState,
  resumeRun,
  RipplegraphError,
  startRun,
  stepRun,
  suspendRun,
  validateWorkflowRoot,
} from './index.js';
import { emitJson, jsonErrorPayload, parseArgs, parseJson, requiredFlag, stringFlag, workflowRoot } from './internal/cli-helpers.js';

const HELP = `ripplegraph — focused-run Coach runtime POC

Commands:
  validate --workflow-root <path>
  start --graph <graph-id> --run-id <id> [--workflow-root <path>]
  state [--workflow-root <path>]
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
    case 'validate':
      emitJson(validateWorkflowRoot(workflowRoot(flags)));
      return;
    case 'start':
      emitJson(
        startRun({
          workflowRoot: workflowRoot(flags),
          graph: requiredFlag(flags, 'graph'),
          runId: requiredFlag(flags, 'run-id'),
        }),
      );
      return;
    case 'state':
      emitJson(getState({ workflowRoot: workflowRoot(flags) }));
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

main(process.argv.slice(2)).catch((error) => {
  emitJson(jsonErrorPayload(error));
  process.exit(1);
});
