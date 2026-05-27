import { type GraphPackageManifest } from '../schema.js';
export type DiagramFormat = 'mermaid' | 'dot';
export declare function renderGraphDiagram(manifest: GraphPackageManifest, format?: DiagramFormat): string;
