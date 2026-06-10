import { type GraphPackageManifest } from './schema.js';
export interface GraphPackage<M extends GraphPackageManifest = GraphPackageManifest> {
    path: string;
    manifestPath: string;
    manifest: M;
}
export declare function graphPackagePath(packageRoot: string): string;
export declare function loadGraphPackage(packageRoot: string): GraphPackage;
