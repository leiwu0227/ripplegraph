export interface ParsedArgs {
    command: string;
    positional: string[];
    flags: Record<string, string | boolean>;
}
export declare function parseArgs(argv: string[]): ParsedArgs;
export declare function stringFlag(flags: ParsedArgs['flags'], name: string): string | undefined;
export declare function workflowRoot(flags: ParsedArgs['flags']): string;
export declare function required(value: string | undefined, message: string): string;
export declare function requiredFlag(flags: ParsedArgs['flags'], name: string): string;
export declare function parseJson(raw: string | undefined, missingMessage: string, invalidPrefix: string): unknown;
export declare function parseJsonFromFileOrValue(filePath: string | undefined, raw: string | undefined, missingMessage: string, invalidPrefix: string): unknown;
export declare function emitLine(text: string): void;
export declare function emitJson(payload: unknown): void;
export declare function jsonErrorPayload(error: unknown): {
    status: 'error';
    code: string;
    message: string;
};
export declare function errorText(error: unknown): string;
