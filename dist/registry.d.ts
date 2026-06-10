import { z } from 'zod';
import { type GraphPackage } from './graph-package.js';
import { type CallableGraphManifest, type DispatcherGraphManifest, type GraphPackageManifest, type WorkflowGraphManifest } from './schema.js';
export declare const registryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    kind: z.ZodEnum<["dispatcher", "workflow", "callable"]>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requires: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        describe: z.ZodString;
        unmetRedirect: z.ZodOptional<z.ZodString>;
        unmetMessage: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }, {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }>, "many">>;
    effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    path: z.ZodString;
    registeredAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    path: string;
    kind: "workflow" | "callable" | "dispatcher";
    id: string;
    effects: string[];
    requires: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[];
    activationHints: string[];
    version: string;
    registeredAt: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    path: string;
    kind: "workflow" | "callable" | "dispatcher";
    id: string;
    version: string;
    registeredAt: string;
    description?: string | undefined;
    effects?: string[] | undefined;
    requires?: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>;
export declare const registrySchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    graphs: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
        kind: z.ZodEnum<["dispatcher", "workflow", "callable"]>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requires: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            describe: z.ZodString;
            unmetRedirect: z.ZodOptional<z.ZodString>;
            unmetMessage: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }, {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }>, "many">>;
        effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        path: z.ZodString;
        registeredAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        path: string;
        kind: "workflow" | "callable" | "dispatcher";
        id: string;
        effects: string[];
        requires: {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }[];
        activationHints: string[];
        version: string;
        registeredAt: string;
        description?: string | undefined;
        title?: string | undefined;
    }, {
        path: string;
        kind: "workflow" | "callable" | "dispatcher";
        id: string;
        version: string;
        registeredAt: string;
        description?: string | undefined;
        effects?: string[] | undefined;
        requires?: {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }[] | undefined;
        title?: string | undefined;
        activationHints?: string[] | undefined;
    }>>>;
}, "strict", z.ZodTypeAny, {
    version: 1;
    graphs: Record<string, {
        path: string;
        kind: "workflow" | "callable" | "dispatcher";
        id: string;
        effects: string[];
        requires: {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }[];
        activationHints: string[];
        version: string;
        registeredAt: string;
        description?: string | undefined;
        title?: string | undefined;
    }>;
}, {
    version: 1;
    graphs?: Record<string, {
        path: string;
        kind: "workflow" | "callable" | "dispatcher";
        id: string;
        version: string;
        registeredAt: string;
        description?: string | undefined;
        effects?: string[] | undefined;
        requires?: {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }[] | undefined;
        title?: string | undefined;
        activationHints?: string[] | undefined;
    }> | undefined;
}>;
export type RegistryEntry = z.infer<typeof registryEntrySchema>;
export type GraphRegistry = z.infer<typeof registrySchema>;
export interface RegisterGraphPackageOptions {
    workflowRoot: string;
    packageRoot: string;
    force?: boolean;
    now?: string;
}
export type ManifestForKind<K extends RegistryEntry['kind'] | undefined> = K extends 'dispatcher' ? DispatcherGraphManifest : K extends 'workflow' ? WorkflowGraphManifest : K extends 'callable' ? CallableGraphManifest : GraphPackageManifest;
export interface ResolveRegisteredGraphPackageOptions<K extends RegistryEntry['kind'] | undefined = RegistryEntry['kind'] | undefined> {
    workflowRoot: string;
    graphId: string;
    kind?: K;
}
export declare function readRegistry(workflowRoot: string): GraphRegistry;
export declare function writeRegistry(workflowRoot: string, registry: GraphRegistry): void;
export declare function listRegisteredGraphs(workflowRoot: string): RegistryEntry[];
export declare function registerGraphPackage(options: RegisterGraphPackageOptions): RegistryEntry;
export declare function resolveRegisteredGraphPackage<K extends RegistryEntry['kind'] | undefined = undefined>(options: ResolveRegisteredGraphPackageOptions<K>): {
    entry: RegistryEntry;
    graphPackage: GraphPackage<ManifestForKind<K>>;
};
