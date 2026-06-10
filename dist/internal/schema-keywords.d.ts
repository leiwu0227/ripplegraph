import type { JsonSchema } from '../schema.js';
export declare const SUPPORTED_SCHEMA_KEYWORDS: Set<string>;
export interface SchemaKeywordIssue {
    path: Array<string | number>;
    message: string;
}
export declare function collectUnsupportedSchemaKeywords(schema: JsonSchema, path?: Array<string | number>): SchemaKeywordIssue[];
