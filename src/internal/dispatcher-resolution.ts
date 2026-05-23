import { listRegisteredGraphs, type RegistryEntry } from '../registry.js';
import { loadWorkflow } from '../storage.js';
import { RipplegraphError } from '../schema.js';

export function resolveDispatcherEntry(workflowRoot: string): RegistryEntry {
  const dispatchers = listRegisteredGraphs(workflowRoot).filter((entry) => entry.kind === 'dispatcher');
  if (dispatchers.length === 0) {
    throw new RipplegraphError('E_MISSING_DISPATCHER', 'no registered dispatcher graph found');
  }
  if (dispatchers.length > 1) {
    throw new RipplegraphError(
      'E_AMBIGUOUS_DISPATCHER',
      `multiple registered dispatcher graphs: ${dispatchers.map((entry) => entry.id).join(', ')}`,
    );
  }
  const dispatcher = dispatchers[0]!;
  const manifest = loadWorkflow(workflowRoot);
  if (manifest.entryGraph && manifest.entryGraph !== dispatcher.id) {
    throw new RipplegraphError(
      'E_ENTRY_GRAPH_MISMATCH',
      `workspace entryGraph ${manifest.entryGraph} does not match registered dispatcher ${dispatcher.id}`,
    );
  }
  return dispatcher;
}
