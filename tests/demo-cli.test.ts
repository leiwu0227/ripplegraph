import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { makeDemoWorkflowRoot, makeGatedWorkflowRoot } from './helpers/workflows.js';

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

  it('renders gated nodes with decide guidance and advances decisions', () => {
    const root = makeGatedWorkflowRoot();
    try {
      expect(run(['start', 'review', '--run', 'approval-a', '--workflow-root', root]).stdout).toContain(
        'External decision required',
      );
      const status = run(['status', '--workflow-root', root]).stdout;
      expect(status).toContain('decision: approved | rejected');
      expect(status).toContain('ripplegraph-demo advance');
      expect(run(['submit', '{"decision":"approved"}', '--workflow-root', root]).status).toBe(1);
      expect(run(['decide', '{"decision":"approved","reason":"ok"}', '--workflow-root', root]).stdout).toContain(
        'Run completed: approval-a',
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('initializes a project with hidden workflow files and next-step guidance', () => {
    const root = makeTempRoot();
    try {
      const result = run(['init', root]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`ripplegraph-demo status --workflow-root ${root}`);
      expect(fs.existsSync(path.join(root, '.ripplegraph', 'workflow.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'AGENT.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'work-items', 'inbox.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'engineering-playbook.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'repo-brief.md'))).toBe(true);
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
      const workItemPath = path.join(root, 'work-items', 'inbox.json');
      fs.mkdirSync(path.dirname(runPath), { recursive: true });
      fs.writeFileSync(currentPath, '{"focusedRunId":"demo-run"}', 'utf8');
      fs.writeFileSync(runPath, '{"status":"active"}', 'utf8');
      fs.writeFileSync(path.join(root, 'AGENT.md'), 'custom guide', 'utf8');
      fs.mkdirSync(path.dirname(workItemPath), { recursive: true });
      fs.writeFileSync(workItemPath, 'custom work item', 'utf8');

      const result = run(['init', root, '--force']);
      expect(result.status).toBe(0);
      expect(fs.readFileSync(currentPath, 'utf8')).toBe('{"focusedRunId":"demo-run"}');
      expect(fs.readFileSync(runPath, 'utf8')).toBe('{"status":"active"}');
      expect(fs.readFileSync(path.join(root, 'AGENT.md'), 'utf8')).not.toBe('custom guide');
      expect(fs.readFileSync(workItemPath, 'utf8')).not.toBe('custom work item');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('renders an active run and submits output with concise guidance', () => {
    const root = makeDemoWorkflowRoot();
    try {
      expect(run(['start', 'change-intake', '--run', 'change-a', '--workflow-root', root]).stdout).toContain('Current run: change-a');
      const status = run(['status', '--workflow-root', root]).stdout;
      expect(status).toContain('Node: classify-change');
      expect(status).toContain('changeType: bugfix | feature | refactor | question');
      expect(status).toContain('ripplegraph-demo advance');
      const explain = run(['explain', '--workflow-root', root]).stdout;
      expect(explain).toContain('Orientation:');
      expect(explain).toContain('Next allowed command:');
      const branch = run(['advance', '{"changeType":"refactor","risk":"medium","rationale":"duplicated CLI routing helpers"}', '--workflow-root', root]).stdout;
      expect(branch).toContain('Node: review-routing');
      expect(branch).toContain('Orientation:');
      expect(branch).toContain('You are at change-intake/review-routing: Human review gate for the routing decision.');
      expect(branch).toContain('If unsure:');
      expect(branch).toContain('ripplegraph-demo explain');
      expect(branch).toContain('Next allowed command:');
      expect(branch).toContain('ripplegraph-demo advance');
      expect(branch).toContain('Recent context:');
      expect(branch).toContain('classify-change: Completed node');
      expect(branch).toContain('output: {"changeType":"refactor","risk":"medium","rationale":"duplicated CLI routing helpers"}');
      expect(branch).toContain('Available routes:');
      expect(branch).toContain('-> simplify-design: Plan a behavior-preserving simplification when {"decision":"approved-refactor"}');
      expect(branch).toContain('External decision required');
      expect(branch).toContain('approved-bugfix | approved-feature | approved-refactor | approved-question | rejected');
      expect(run(['submit', '{"decision":"approved-refactor"}', '--workflow-root', root]).status).toBe(1);
      const rejected = run(['decide', '{"decision":"rejected","reason":"needs a clearer category"}', '--workflow-root', root]).stdout;
      expect(rejected).toContain('Node: classify-change');
      run(['advance', '{"changeType":"refactor","risk":"medium","rationale":"duplicated CLI routing helpers"}', '--workflow-root', root]);
      const approved = run(['advance', '{"decision":"approved-refactor","reason":"refactor route is correct"}', '--workflow-root', root]).stdout;
      expect(approved).toContain('Node: simplify-design');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('renders available graphs, resumable runs, and run summaries', () => {
    const root = makeDemoWorkflowRoot();
    try {
      const noFocus = run(['status', '--workflow-root', root]).stdout;
      expect(noFocus).toContain('No focused run.');
      expect(noFocus).toContain('change-intake');
      expect(noFocus).toContain('architecture-sweep');

      run(['start', 'architecture-sweep', '--run', 'sweep-a', '--workflow-root', root]);
      run(['pause', 'pause architecture sweep', '--workflow-root', root]);
      const status = run(['status', '--workflow-root', root]).stdout;
      expect(status).toContain('sweep-a  suspended  architecture-sweep  select-cleanup');
      expect(status).toContain('ripplegraph-demo resume sweep-a');

      const runs = run(['runs', '--workflow-root', root]).stdout;
      expect(runs).toContain('Focused run: none');
      expect(runs).toContain('sweep-a  suspended  architecture-sweep  select-cleanup');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
