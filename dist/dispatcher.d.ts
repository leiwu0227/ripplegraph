import { type RunList, type StateOk } from './coach.js';
import { type RegistryEntry } from './registry.js';
import { type JsonSchema } from './schema.js';
export interface DispatchOptions {
    workflowRoot: string;
}
export interface DispatchRequestOptions extends DispatchOptions {
    request: string;
}
export interface DispatchActionOptions extends DispatchOptions {
    action: unknown;
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
} | StateOk;
export declare function getDispatchRequest(options: DispatchRequestOptions): DispatchRequestState;
export declare function applyDispatchAction(options: DispatchActionOptions): DispatchActionResult;
