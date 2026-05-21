import { type CallableCheckpoint, type JsonSchema, type Node, type Position } from './schema.js';
import { type ValidationIssue } from './internal/output-validation.js';
import { type EffectPolicy } from './effects.js';
export interface CallableRootOptions {
    workflowRoot: string;
}
export interface StartCallableCallOptions extends CallableRootOptions {
    graphId: string;
    callId?: string;
    input?: unknown;
    effectPolicy?: EffectPolicy;
}
export interface GetCallableCallOptions extends CallableRootOptions {
    callId: string;
}
export interface StepCallableCallOptions extends CallableRootOptions {
    callId: string;
    output: unknown;
}
export interface CallableCallSummary {
    id: string;
    status: CallableCheckpoint['status'];
    graphId: string;
    position: Position;
    updatedAt: string;
}
export interface CallableCallList {
    status: 'ok';
    calls: CallableCallSummary[];
}
export interface CallableState {
    status: 'active';
    call: {
        id: string;
        status: 'active';
        graphId: string;
        graphVersion: string;
    };
    position: Position;
    input: unknown;
    node: {
        id: string;
        purpose: string;
        instructions?: string;
        exec: Node['exec'];
        outputSchema: JsonSchema;
    };
    context: {
        previous: Array<{
            id: string;
            purpose: string;
            output?: unknown;
        }>;
    };
    responseContract: {
        command: 'call-step';
        acceptedFormats: ['json'];
        schema: JsonSchema;
    };
    nextAllowedCommand: string;
    helpCommand: string;
}
export interface CallableValidationErrorResponse {
    status: 'validation_error';
    call: {
        id: string;
        status?: CallableCheckpoint['status'];
        graphId: string;
    };
    position?: Position;
    errors: ValidationIssue[];
}
export interface CallableCompleted {
    status: 'completed';
    call: {
        id: string;
        status: 'completed';
        graphId: string;
        graphVersion: string;
    };
    position: Position;
    input: unknown;
    output: unknown;
    outputArtifact?: string;
}
export type StartCallableCallResponse = CallableState | CallableValidationErrorResponse;
export type CallableCallResponse = CallableState | CallableCompleted;
export type StepCallableCallResponse = CallableCallResponse | CallableValidationErrorResponse;
export declare function startCallableCall(opts: StartCallableCallOptions): StartCallableCallResponse;
export declare function getCallableCall(opts: GetCallableCallOptions): CallableCallResponse;
export declare function stepCallableCall(opts: StepCallableCallOptions): StepCallableCallResponse;
export declare function listCallableCalls(opts: CallableRootOptions): CallableCallList;
