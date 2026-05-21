import { type GraphPackageManifest } from './schema.js';
export interface GraphPackage {
    path: string;
    manifestPath: string;
    manifest: GraphPackageManifest;
}
export declare function graphPackagePath(packageRoot: string): string;
export declare function loadGraphPackage(packageRoot: string): GraphPackage;
