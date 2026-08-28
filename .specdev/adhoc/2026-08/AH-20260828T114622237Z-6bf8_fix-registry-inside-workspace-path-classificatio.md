# Adhoc AH-20260828T114622237Z-6bf8

- Scope: fix registry inside-workspace path classification for leading-dot directory names and add regression coverage
- Title: fix registry path classification
- Started: 2026-08-28T11:46:22.237Z
- Completed: 2026-08-28T11:48:55.972Z
- Starting working tree: Clean.

## Outcome

Corrected registry path classification so only actual parent traversal is external, added leading-dot descendant regression coverage, and synchronized tracked dist output; syntax, extracted classifier cases, and exact change-boundary checks pass, while Vitest/typecheck remain unavailable because dependencies are absent.

## Delivery path facts

### Requested adopted paths

None.

### Committed paths

- `.specdev/adhoc/2026-08/AH-20260828T114622237Z-6bf8_fix-registry-inside-workspace-path-classificatio.md`
- `dist/registry.js`
- `src/registry.ts`
- `tests/registry.test.ts`

### Rejected paths

None.

### Remaining owned paths

None.

## Verification summary

No manual verification summary was supplied.

## Verification attempt history

- **syntax: passed.** `sh -c node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js` (129 ms, working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711)
  - Working directory: `/Users/leiwu/code/ripplepulse/lib/ripplegraph`
  - Exit status: 0
  - Output:

    (no output)
- **path-classifier: passed.** `node --input-type=module -e 
import fs from "node:fs";
import path from "node:path";
const source = fs.readFileSync("dist/registry.js", "utf8");
const match = source.match(/function normalizeRegisteredPath[\s\S]*?\n\}/);
if (!match) throw new Error("normalizeRegisteredPath not found");
const normalize = new Function("path", match[0] + "\nreturn normalizeRegisteredPath;")(path);
const root = path.resolve("/virtual/workspace");
const external = path.resolve(root, "..", "shared", "support").replaceAll(path.sep, "/");
const cases = [
  ["normal descendant", path.join(root, "graphs", "support"), "graphs/support"],
  ["two-dot prefix", path.join(root, "..packages", "support"), "..packages/support"],
  ["three-dot segment", path.join(root, "...", "support"), ".../support"],
  ["external sibling", path.join(root, "..", "shared", "support"), external],
];
for (const [name, target, expected] of cases) {
  const actual = normalize(root, target);
  if (actual !== expected) throw new Error(name + ": " + actual + " !== " + expected);
}
console.log("classifier cases: passed");
` (51 ms, working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711)
  - Working directory: `/Users/leiwu/code/ripplepulse/lib/ripplegraph`
  - Exit status: 0
  - Output:

    stdout: classifier cases: passed
- **change-boundary: passed.** `sh -c git diff --check && actual=$(git diff --name-only | sort | tr "\n" " ") && test "$actual" = "dist/registry.js src/registry.ts tests/registry.test.ts "` (24 ms, working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711)
  - Working directory: `/Users/leiwu/code/ripplepulse/lib/ripplegraph`
  - Exit status: 0
  - Output:

    (no output)
- **syntax: passed.** `sh -c node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js` (127 ms, working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711)
  - Working directory: `/Users/leiwu/code/ripplepulse/lib/ripplegraph`
  - Exit status: 0
  - Output:

    (no output)
- **change-boundary: passed.** `sh -c git diff --check && actual=$(git diff --name-only | sort | tr "\n" " ") && test "$actual" = "dist/registry.js src/registry.ts tests/registry.test.ts "` (24 ms, working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711)
  - Working directory: `/Users/leiwu/code/ripplepulse/lib/ripplegraph`
  - Exit status: 0
  - Output:

    (no output)

## Current acceptance evidence

- **path-classifier: passed.** `node --input-type=module -e 
import fs from "node:fs";
import path from "node:path";
const source = fs.readFileSync("dist/registry.js", "utf8");
const match = source.match(/function normalizeRegisteredPath[\s\S]*?\n\}/);
if (!match) throw new Error("normalizeRegisteredPath not found");
const normalize = new Function("path", match[0] + "\nreturn normalizeRegisteredPath;")(path);
const root = path.resolve("/virtual/workspace");
const external = path.resolve(root, "..", "shared", "support").replaceAll(path.sep, "/");
const cases = [
  ["normal descendant", path.join(root, "graphs", "support"), "graphs/support"],
  ["two-dot prefix", path.join(root, "..packages", "support"), "..packages/support"],
  ["three-dot segment", path.join(root, "...", "support"), ".../support"],
  ["external sibling", path.join(root, "..", "shared", "support"), external],
];
for (const [name, target, expected] of cases) {
  const actual = normalize(root, target);
  if (actual !== expected) throw new Error(name + ": " + actual + " !== " + expected);
}
console.log("classifier cases: passed");
` (51 ms, working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711)
- **syntax: passed.** `sh -c node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js` (127 ms, working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711)
  - Working directory: `/Users/leiwu/code/ripplepulse/lib/ripplegraph`
  - Exit status: 0
  - Output:

    (no output)
- **change-boundary: passed.** `sh -c git diff --check && actual=$(git diff --name-only | sort | tr "\n" " ") && test "$actual" = "dist/registry.js src/registry.ts tests/registry.test.ts "` (24 ms, working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711)
  - Working directory: `/Users/leiwu/code/ripplepulse/lib/ripplegraph`
  - Exit status: 0
  - Output:

    (no output)

## Structured verification

    {
      "version": 1,
      "path_facts": {
        "requested": [],
        "committed": [
          ".specdev/adhoc/2026-08/AH-20260828T114622237Z-6bf8_fix-registry-inside-workspace-path-classificatio.md",
          "dist/registry.js",
          "src/registry.ts",
          "tests/registry.test.ts"
        ],
        "rejected": [],
        "remaining": []
      },
      "attempt_history": [
        {
          "version": 1,
          "id": "V-001",
          "label": "syntax",
          "annotation": null,
          "command": "sh -c node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js",
          "argv": [
            "sh",
            "-c",
            "node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js"
          ],
          "working_directory": "/Users/leiwu/code/ripplepulse/lib/ripplegraph",
          "started_at": "2026-08-28T11:47:51.443Z",
          "completed_at": "2026-08-28T11:47:51.573Z",
          "duration_ms": 129,
          "exit_status": 0,
          "status": "passed",
          "tested_revision": "working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711",
          "output": {
            "text": "",
            "truncated": false,
            "captured_bytes": 0
          }
        },
        {
          "version": 1,
          "id": "V-002",
          "label": "path-classifier",
          "annotation": null,
          "command": "node --input-type=module -e \nimport fs from \"node:fs\";\nimport path from \"node:path\";\nconst source = fs.readFileSync(\"dist/registry.js\", \"utf8\");\nconst match = source.match(/function normalizeRegisteredPath[\\s\\S]*?\\n\\}/);\nif (!match) throw new Error(\"normalizeRegisteredPath not found\");\nconst normalize = new Function(\"path\", match[0] + \"\\nreturn normalizeRegisteredPath;\")(path);\nconst root = path.resolve(\"/virtual/workspace\");\nconst external = path.resolve(root, \"..\", \"shared\", \"support\").replaceAll(path.sep, \"/\");\nconst cases = [\n  [\"normal descendant\", path.join(root, \"graphs\", \"support\"), \"graphs/support\"],\n  [\"two-dot prefix\", path.join(root, \"..packages\", \"support\"), \"..packages/support\"],\n  [\"three-dot segment\", path.join(root, \"...\", \"support\"), \".../support\"],\n  [\"external sibling\", path.join(root, \"..\", \"shared\", \"support\"), external],\n];\nfor (const [name, target, expected] of cases) {\n  const actual = normalize(root, target);\n  if (actual !== expected) throw new Error(name + \": \" + actual + \" !== \" + expected);\n}\nconsole.log(\"classifier cases: passed\");\n",
          "argv": [
            "node",
            "--input-type=module",
            "-e",
            "\nimport fs from \"node:fs\";\nimport path from \"node:path\";\nconst source = fs.readFileSync(\"dist/registry.js\", \"utf8\");\nconst match = source.match(/function normalizeRegisteredPath[\\s\\S]*?\\n\\}/);\nif (!match) throw new Error(\"normalizeRegisteredPath not found\");\nconst normalize = new Function(\"path\", match[0] + \"\\nreturn normalizeRegisteredPath;\")(path);\nconst root = path.resolve(\"/virtual/workspace\");\nconst external = path.resolve(root, \"..\", \"shared\", \"support\").replaceAll(path.sep, \"/\");\nconst cases = [\n  [\"normal descendant\", path.join(root, \"graphs\", \"support\"), \"graphs/support\"],\n  [\"two-dot prefix\", path.join(root, \"..packages\", \"support\"), \"..packages/support\"],\n  [\"three-dot segment\", path.join(root, \"...\", \"support\"), \".../support\"],\n  [\"external sibling\", path.join(root, \"..\", \"shared\", \"support\"), external],\n];\nfor (const [name, target, expected] of cases) {\n  const actual = normalize(root, target);\n  if (actual !== expected) throw new Error(name + \": \" + actual + \" !== \" + expected);\n}\nconsole.log(\"classifier cases: passed\");\n"
          ],
          "working_directory": "/Users/leiwu/code/ripplepulse/lib/ripplegraph",
          "started_at": "2026-08-28T11:48:07.689Z",
          "completed_at": "2026-08-28T11:48:07.740Z",
          "duration_ms": 51,
          "exit_status": 0,
          "status": "passed",
          "tested_revision": "working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711",
          "output": {
            "text": "stdout: classifier cases: passed",
            "truncated": false,
            "captured_bytes": 25
          }
        },
        {
          "version": 1,
          "id": "V-003",
          "label": "change-boundary",
          "annotation": null,
          "command": "sh -c git diff --check && actual=$(git diff --name-only | sort | tr \"\\n\" \" \") && test \"$actual\" = \"dist/registry.js src/registry.ts tests/registry.test.ts \"",
          "argv": [
            "sh",
            "-c",
            "git diff --check && actual=$(git diff --name-only | sort | tr \"\\n\" \" \") && test \"$actual\" = \"dist/registry.js src/registry.ts tests/registry.test.ts \""
          ],
          "working_directory": "/Users/leiwu/code/ripplepulse/lib/ripplegraph",
          "started_at": "2026-08-28T11:48:18.280Z",
          "completed_at": "2026-08-28T11:48:18.304Z",
          "duration_ms": 24,
          "exit_status": 0,
          "status": "passed",
          "tested_revision": "working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711",
          "output": {
            "text": "",
            "truncated": false,
            "captured_bytes": 0
          }
        },
        {
          "version": 1,
          "id": "V-004",
          "label": "syntax",
          "annotation": null,
          "command": "sh -c node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js",
          "argv": [
            "sh",
            "-c",
            "node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js"
          ],
          "working_directory": "/Users/leiwu/code/ripplepulse/lib/ripplegraph",
          "started_at": "2026-08-28T11:48:39.691Z",
          "completed_at": "2026-08-28T11:48:39.819Z",
          "duration_ms": 127,
          "exit_status": 0,
          "status": "passed",
          "tested_revision": "working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711",
          "output": {
            "text": "",
            "truncated": false,
            "captured_bytes": 0
          }
        },
        {
          "version": 1,
          "id": "V-005",
          "label": "change-boundary",
          "annotation": null,
          "command": "sh -c git diff --check && actual=$(git diff --name-only | sort | tr \"\\n\" \" \") && test \"$actual\" = \"dist/registry.js src/registry.ts tests/registry.test.ts \"",
          "argv": [
            "sh",
            "-c",
            "git diff --check && actual=$(git diff --name-only | sort | tr \"\\n\" \" \") && test \"$actual\" = \"dist/registry.js src/registry.ts tests/registry.test.ts \""
          ],
          "working_directory": "/Users/leiwu/code/ripplepulse/lib/ripplegraph",
          "started_at": "2026-08-28T11:48:39.966Z",
          "completed_at": "2026-08-28T11:48:39.991Z",
          "duration_ms": 24,
          "exit_status": 0,
          "status": "passed",
          "tested_revision": "working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711",
          "output": {
            "text": "",
            "truncated": false,
            "captured_bytes": 0
          }
        }
      ],
      "acceptance_evidence": [
        {
          "version": 1,
          "id": "V-002",
          "label": "path-classifier",
          "annotation": null,
          "command": "node --input-type=module -e \nimport fs from \"node:fs\";\nimport path from \"node:path\";\nconst source = fs.readFileSync(\"dist/registry.js\", \"utf8\");\nconst match = source.match(/function normalizeRegisteredPath[\\s\\S]*?\\n\\}/);\nif (!match) throw new Error(\"normalizeRegisteredPath not found\");\nconst normalize = new Function(\"path\", match[0] + \"\\nreturn normalizeRegisteredPath;\")(path);\nconst root = path.resolve(\"/virtual/workspace\");\nconst external = path.resolve(root, \"..\", \"shared\", \"support\").replaceAll(path.sep, \"/\");\nconst cases = [\n  [\"normal descendant\", path.join(root, \"graphs\", \"support\"), \"graphs/support\"],\n  [\"two-dot prefix\", path.join(root, \"..packages\", \"support\"), \"..packages/support\"],\n  [\"three-dot segment\", path.join(root, \"...\", \"support\"), \".../support\"],\n  [\"external sibling\", path.join(root, \"..\", \"shared\", \"support\"), external],\n];\nfor (const [name, target, expected] of cases) {\n  const actual = normalize(root, target);\n  if (actual !== expected) throw new Error(name + \": \" + actual + \" !== \" + expected);\n}\nconsole.log(\"classifier cases: passed\");\n",
          "argv": [
            "node",
            "--input-type=module",
            "-e",
            "\nimport fs from \"node:fs\";\nimport path from \"node:path\";\nconst source = fs.readFileSync(\"dist/registry.js\", \"utf8\");\nconst match = source.match(/function normalizeRegisteredPath[\\s\\S]*?\\n\\}/);\nif (!match) throw new Error(\"normalizeRegisteredPath not found\");\nconst normalize = new Function(\"path\", match[0] + \"\\nreturn normalizeRegisteredPath;\")(path);\nconst root = path.resolve(\"/virtual/workspace\");\nconst external = path.resolve(root, \"..\", \"shared\", \"support\").replaceAll(path.sep, \"/\");\nconst cases = [\n  [\"normal descendant\", path.join(root, \"graphs\", \"support\"), \"graphs/support\"],\n  [\"two-dot prefix\", path.join(root, \"..packages\", \"support\"), \"..packages/support\"],\n  [\"three-dot segment\", path.join(root, \"...\", \"support\"), \".../support\"],\n  [\"external sibling\", path.join(root, \"..\", \"shared\", \"support\"), external],\n];\nfor (const [name, target, expected] of cases) {\n  const actual = normalize(root, target);\n  if (actual !== expected) throw new Error(name + \": \" + actual + \" !== \" + expected);\n}\nconsole.log(\"classifier cases: passed\");\n"
          ],
          "working_directory": "/Users/leiwu/code/ripplepulse/lib/ripplegraph",
          "started_at": "2026-08-28T11:48:07.689Z",
          "completed_at": "2026-08-28T11:48:07.740Z",
          "duration_ms": 51,
          "exit_status": 0,
          "status": "passed",
          "tested_revision": "working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711",
          "output": {
            "text": "stdout: classifier cases: passed",
            "truncated": false,
            "captured_bytes": 25
          }
        },
        {
          "version": 1,
          "id": "V-004",
          "label": "syntax",
          "annotation": null,
          "command": "sh -c node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js",
          "argv": [
            "sh",
            "-c",
            "node --experimental-strip-types --check src/registry.ts && node --experimental-strip-types --check tests/registry.test.ts && node --check dist/registry.js"
          ],
          "working_directory": "/Users/leiwu/code/ripplepulse/lib/ripplegraph",
          "started_at": "2026-08-28T11:48:39.691Z",
          "completed_at": "2026-08-28T11:48:39.819Z",
          "duration_ms": 127,
          "exit_status": 0,
          "status": "passed",
          "tested_revision": "working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711",
          "output": {
            "text": "",
            "truncated": false,
            "captured_bytes": 0
          }
        },
        {
          "version": 1,
          "id": "V-005",
          "label": "change-boundary",
          "annotation": null,
          "command": "sh -c git diff --check && actual=$(git diff --name-only | sort | tr \"\\n\" \" \") && test \"$actual\" = \"dist/registry.js src/registry.ts tests/registry.test.ts \"",
          "argv": [
            "sh",
            "-c",
            "git diff --check && actual=$(git diff --name-only | sort | tr \"\\n\" \" \") && test \"$actual\" = \"dist/registry.js src/registry.ts tests/registry.test.ts \""
          ],
          "working_directory": "/Users/leiwu/code/ripplepulse/lib/ripplegraph",
          "started_at": "2026-08-28T11:48:39.966Z",
          "completed_at": "2026-08-28T11:48:39.991Z",
          "duration_ms": 24,
          "exit_status": 0,
          "status": "passed",
          "tested_revision": "working-tree@0e8bc6d819870f5e11bf59d125d85d914248f711",
          "output": {
            "text": "",
            "truncated": false,
            "captured_bytes": 0
          }
        }
      ]
    }
