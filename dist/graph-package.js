import fs from 'node:fs';
import path from 'node:path';
import { graphPackageManifestSchema, RipplegraphError } from './schema.js';
export function graphPackagePath(packageRoot) {
    return path.join(packageRoot, 'graph.json');
}
function formatIssues(issues) {
    return issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
}
function readJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    catch (error) {
        throw new RipplegraphError('E_BAD_JSON', `failed to read JSON at ${filePath}: ${error.message}`);
    }
}
export function loadGraphPackage(packageRoot) {
    if (!fs.existsSync(packageRoot) || !fs.statSync(packageRoot).isDirectory()) {
        throw new RipplegraphError('E_MISSING_GRAPH_PACKAGE', `graph package folder not found at ${packageRoot}`);
    }
    const manifestPath = graphPackagePath(packageRoot);
    if (!fs.existsSync(manifestPath)) {
        throw new RipplegraphError('E_MISSING_GRAPH_PACKAGE', `no graph.json found at ${packageRoot}`);
    }
    const result = graphPackageManifestSchema.safeParse(readJson(manifestPath));
    if (!result.success) {
        throw new RipplegraphError('E_INVALID_GRAPH_PACKAGE', formatIssues(result.error.issues));
    }
    return {
        path: packageRoot,
        manifestPath,
        manifest: result.data,
    };
}
