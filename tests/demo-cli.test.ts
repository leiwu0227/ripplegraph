import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { makeDemoWorkflowRoot } from './helpers/workflows.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const cli = path.join(repoRoot, 'src', 'demo-cli.ts');

function run(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [tsxCli, cli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('ripplegraph-demo cli', () => {
  it('keeps packaged and example workflows aligned', () => {
    const templateWorkflow = JSON.parse(fs.readFileSync(path.join(repoRoot, 'templates', 'minimal', 'workflow.json'), 'utf8'));
    const exampleWorkflow = JSON.parse(fs.readFileSync(path.join(repoRoot, 'examples', 'minimal', 'workflow.json'), 'utf8'));
    expect(exampleWorkflow).toEqual(templateWorkflow);
  });

  it('renders an active run and submits output with concise guidance', () => {
    const root = makeDemoWorkflowRoot();
    try {
      expect(run(['start', 'daily', '--run', 'daily-a', '--workflow-root', root]).stdout).toContain('Current run: daily-a');
      const status = run(['status', '--workflow-root', root]).stdout;
      expect(status).toContain('Node: review');
      expect(status).toContain('decision: proceed | stop');
      expect(status).toContain('ripplegraph-demo submit');
      expect(run(['submit', '{"decision":"stop"}', '--workflow-root', root]).stdout).toContain('Run completed: daily-a');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('renders available graphs, resumable runs, and run summaries', () => {
    const root = makeDemoWorkflowRoot();
    try {
      const noFocus = run(['status', '--workflow-root', root]).stdout;
      expect(noFocus).toContain('No focused run.');
      expect(noFocus).toContain('daily');
      expect(noFocus).toContain('mockcopy');

      run(['start', 'mockcopy', '--run', 'mock-a', '--workflow-root', root]);
      run(['pause', 'pause mockcopy', '--workflow-root', root]);
      const status = run(['status', '--workflow-root', root]).stdout;
      expect(status).toContain('mock-a  suspended  mockcopy  plan');
      expect(status).toContain('ripplegraph-demo resume mock-a');

      const runs = run(['runs', '--workflow-root', root]).stdout;
      expect(runs).toContain('Focused run: none');
      expect(runs).toContain('mock-a  suspended  mockcopy  plan');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
