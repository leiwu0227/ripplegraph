import { z } from 'zod';
import { type GraphPackage } from './graph-package.js';
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
    kind: "dispatcher" | "workflow" | "callable";
    id: string;
    effects: string[];
    activationHints: string[];
    requires: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[];
    version: string;
    registeredAt: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    path: string;
    kind: "dispatcher" | "workflow" | "callable";
    id: string;
    version: string;
    registeredAt: string;
    description?: string | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
    requires?: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[] | undefined;
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
        kind: "dispatcher" | "workflow" | "callable";
        id: string;
        effects: string[];
        activationHints: string[];
        requires: {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }[];
        version: string;
        registeredAt: string;
        description?: string | undefined;
        title?: string | undefined;
    }, {
        path: string;
        kind: "dispatcher" | "workflow" | "callable";
        id: string;
        version: string;
        registeredAt: string;
        description?: string | undefined;
        effects?: string[] | undefined;
        title?: string | undefined;
        activationHints?: string[] | undefined;
        requires?: {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }[] | undefined;
    }>>>;
}, "strict", z.ZodTypeAny, {
    version: 1;
    graphs: Record<string, {
        path: string;
        kind: "dispatcher" | "workflow" | "callable";
        id: string;
        effects: string[];
        activationHints: string[];
        requires: {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }[];
        version: string;
        registeredAt: string;
        description?: string | undefined;
        title?: string | undefined;
    }>;
}, {
    version: 1;
    graphs?: Record<string, {
        path: string;
        kind: "dispatcher" | "workflow" | "callable";
        id: string;
        version: string;
        registeredAt: string;
        description?: string | undefined;
        effects?: string[] | undefined;
        title?: string | undefined;
        activationHints?: string[] | undefined;
        requires?: {
            id: string;
            describe: string;
            unmetRedirect?: string | undefined;
            unmetMessage?: string | undefined;
        }[] | undefined;
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
