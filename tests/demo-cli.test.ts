import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
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

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ripplegraph-demo-init-'));
}

describe('ripplegraph-demo cli', () => {
  it('keeps packaged and example workflows aligned', () => {
    const templateWorkflow = JSON.parse(fs.readFileSync(path.join(repoRoot, 'templates', 'minimal', 'workflow.json'), 'utf8'));
    const exampleWorkflow = JSON.parse(fs.readFileSync(path.join(repoRoot, 'examples', 'minimal', 'workflow.json'), 'utf8'));
    expect(exampleWorkflow).toEqual(templateWorkflow);
  });

  it('initializes a project with hidden workflow files and next-step guidance', () => {
    const root = makeTempRoot();
    try {
      const result = run(['init', root]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`ripplegraph-demo status --workflow-root ${root}`);
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'workflow.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'AGENT.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'tickets', 'inbox.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'support-playbook.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'workflow.json'))).toBe(false);
      expect(run(['status', '--workflow-root', root]).stdout).toContain('No focused run.');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite demo files without force', () => {
    const root = makeTempRoot();
    try {
      expect(run(['init', root]).status).toBe(0);
      const result = run(['init', root]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(path.join(root, '.ripplegraph', 'workflow.json'));
      expect(result.stderr).toContain('--force');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('refreshes protected demo files with force without deleting runtime state', () => {
    const root = makeTempRoot();
    try {
      expect(run(['init', root]).status).toBe(0);
      const currentPath = path.join(root, '.ripplegraph', 'current.json');
      const runPath = path.join(root, '.ripplegraph', 'runs', 'demo-run', 'checkpoint.json');
      const ticketPath = path.join(root, 'tickets', 'inbox.json');
      fs.mkdirSync(path.dirname(runPath), { recursive: true });
      fs.writeFileSync(currentPath, '{"focusedRunId":"demo-run"}', 'utf8');
      fs.writeFileSync(runPath, '{"status":"active"}', 'utf8');
      fs.writeFileSync(path.join(root, 'AGENT.md'), 'custom guide', 'utf8');
      fs.writeFileSync(ticketPath, 'custom ticket', 'utf8');

      const result = run(['init', root, '--force']);
      expect(result.status).toBe(0);
      expect(fs.readFileSync(currentPath, 'utf8')).toBe('{"focusedRunId":"demo-run"}');
      expect(fs.readFileSync(runPath, 'utf8')).toBe('{"status":"active"}');
      expect(fs.readFileSync(path.join(root, 'AGENT.md'), 'utf8')).not.toBe('custom guide');
      expect(fs.readFileSync(ticketPath, 'utf8')).not.toBe('custom ticket');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
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
