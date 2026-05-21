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
export declare function getDispatchRequest(options: DispatchRequestOptions): DispatchRequestState;
export declare function applyDispatchAction(options: DispatchActionOptions): DispatchActionResult;
