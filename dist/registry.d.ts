import { z } from 'zod';
import { type GraphPackage } from './graph-package.js';
export declare const registryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    kind: z.ZodEnum<["dispatcher", "workflow", "callable"]>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    path: z.ZodString;
    registeredAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    path: string;
    kind: "dispatcher" | "workflow" | "callable";
    effects: string[];
    activationHints: string[];
    id: string;
    version: string;
    registeredAt: string;
    title?: string | undefined;
    description?: string | undefined;
}, {
    path: string;
    kind: "dispatcher" | "workflow" | "callable";
    id: string;
    version: string;
    registeredAt: string;
    effects?: string[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
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
        effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        path: z.ZodString;
        registeredAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        path: string;
        kind: "dispatcher" | "workflow" | "callable";
        effects: string[];
        activationHints: string[];
        id: string;
        version: string;
        registeredAt: string;
        title?: string | undefined;
        description?: string | undefined;
    }, {
        path: string;
        kind: "dispatcher" | "workflow" | "callable";
        id: string;
        version: string;
        registeredAt: string;
        effects?: string[] | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
    }>>>;
}, "strict", z.ZodTypeAny, {
    version: 1;
    graphs: Record<string, {
        path: string;
        kind: "dispatcher" | "workflow" | "callable";
        effects: string[];
        activationHints: string[];
        id: string;
        version: string;
        registeredAt: string;
        title?: string | undefined;
        description?: string | undefined;
    }>;
}, {
    version: 1;
    graphs?: Record<string, {
        path: string;
        kind: "dispatcher" | "workflow" | "callable";
        id: string;
        version: string;
        registeredAt: string;
        effects?: string[] | undefined;
        title?: string | undefined;
        description?: string | undefined;
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
export interface ResolveRegisteredGraphPackageOptions {
    workflowRoot: string;
    graphId: string;
    kind?: RegistryEntry['kind'];
}
export declare function readRegistry(workflowRoot: string): GraphRegistry;
export declare function writeRegistry(workflowRoot: string, registry: GraphRegistry): void;
export declare function listRegisteredGraphs(workflowRoot: string): RegistryEntry[];
export declare function registerGraphPackage(options: RegisterGraphPackageOptions): RegistryEntry;
export declare function resolveRegisteredGraphPackage(options: ResolveRegisteredGraphPackageOptions): {
    entry: RegistryEntry;
    graphPackage: GraphPackage;
};
