import type { JsonSchema } from '../schema.js';
export interface ValidationIssue {
    path: string;
    message: string;
}
export declare function validateOutput(schema: JsonSchema, output: unknown): ValidationIssue[];
