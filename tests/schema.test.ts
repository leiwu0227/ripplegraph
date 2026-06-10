import { describe, expect, it } from 'vitest';
import { graphPackageManifestSchema } from '../src/schema.js';

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'support-triage',
    version: '0.1.0',
    kind: 'workflow',
    entry: 'classify',
    nodes: {
      classify: {
        purpose: 'Classify the ticket',
        exec: 'inline',
        outputSchema: { type: 'object' },
        edges: [{ to: 'done' }],
      },
      done: { purpose: 'Complete', terminal: true },
    },
    ...overrides,
  };
}

describe('graph package manifest schema', () => {
  it('accepts a representative valid manifest with defaults applied', () => {
    const result = graphPackageManifestSchema.safeParse(manifest());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entry).toBe('classify');
      expect(result.data.effects).toEqual([]);
      expect(result.data.nodes.done?.terminal).toBe(true);
    }
  });

  it('rejects unknown entry and dangling edge references with issue paths', () => {
    const result = graphPackageManifestSchema.safeParse(
      manifest({
        entry: 'missing-entry',
        nodes: {
          classify: {
            purpose: 'Classify the ticket',
            exec: 'inline',
            outputSchema: { type: 'object' },
            edges: [{ to: 'nowhere' }],
          },
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
      expect(issues).toContainEqual({ path: 'entry', message: 'entry references unknown node: missing-entry' });
      expect(issues).toContainEqual({ path: 'nodes.classify.edges', message: 'edge references unknown node: nowhere' });
    }
  });
});
