import { z } from 'zod';
import { type StartCallableCallResponse } from './callable.js';
import { type RunList, type StateOk } from './coach.js';
import { type RegistryEntry } from './registry.js';
import { type JsonSchema } from './schema.js';
import { type EffectPolicy } from './effects.js';
export interface DispatchOptions {
    workflowRoot: string;
}
export interface DispatchRequestOptions extends DispatchOptions {
    request: string;
}
export interface DispatchActionOptions extends DispatchOptions {
    action: unknown;
    effectPolicy?: EffectPolicy;
}
export interface RegisteredGraphSummary {
    id: string;
    version: string;
    kind: RegistryEntry['kind'];
    title?: string;
    description?: string;
    activationHints: string[];
    effects: string[];
    path: string;
}
export interface DispatchRequestState {
    status: 'needs_action';
    dispatcher: RegisteredGraphSummary;
    request: string;
    orientation: string;
    availableGraphs: RegisteredGraphSummary[];
    actionSchema: JsonSchema;
    nextAllowedCommand: string;
    helpCommand: string;
}
export type DispatchActionResult = (RunList & {
    action: 'list_runs';
    availableGraphs: RegisteredGraphSummary[];
}) | {
    status: 'needs_user_input';
    question: string;
    choices?: string[];
} | StartCallableCallResponse | StateOk;
export declare const dispatcherActionSchema: z.ZodDiscriminatedUnion<"action", [z.ZodObject<{
    action: z.ZodLiteral<"start_run">;
    graphId: z.ZodString;
    runId: z.ZodOptional<z.ZodString>;
    input: z.ZodOptional<z.ZodUnknown>;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    graphId: string;
    action: "start_run";
    runId?: string | undefined;
    input?: unknown;
    reason?: string | undefined;
}, {
    graphId: string;
    action: "start_run";
    runId?: string | undefined;
    input?: unknown;
    reason?: string | undefined;
}>, z.ZodObject<{
    action: z.ZodEnum<["resume_run", "switch_run"]>;
    runId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    runId: string;
    action: "resume_run" | "switch_run";
    reason?: string | undefined;
}, {
    runId: string;
    action: "resume_run" | "switch_run";
    reason?: string | undefined;
}>, z.ZodObject<{
    action: z.ZodLiteral<"list_runs">;
}, "strict", z.ZodTypeAny, {
    action: "list_runs";
}, {
    action: "list_runs";
}>, z.ZodObject<{
    action: z.ZodLiteral<"ask_user">;
    question: z.ZodString;
    choices: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    action: "ask_user";
    question: string;
    choices?: string[] | undefined;
}, {
    action: "ask_user";
    question: string;
    choices?: string[] | undefined;
}>, z.ZodObject<{
    action: z.ZodLiteral<"call_graph">;
    graphId: z.ZodString;
    callId: z.ZodOptional<z.ZodString>;
    input: z.ZodOptional<z.ZodUnknown>;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    graphId: string;
    action: "call_graph";
    input?: unknown;
    reason?: string | undefined;
    callId?: string | undefined;
}, {
    graphId: string;
    action: "call_graph";
    input?: unknown;
    reason?: string | undefined;
    callId?: string | undefined;
}>]>;
export declare const dispatchActionSchema: JsonSchema;
export declare function getDispatchRequest(options: DispatchRequestOptions): DispatchRequestState;
export declare function applyDispatchAction(options: DispatchActionOptions): DispatchActionResult;
