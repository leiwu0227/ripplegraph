import { z } from 'zod';
export declare class RipplegraphError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export declare const idSchema: z.ZodString;
export interface JsonSchema {
    type?: 'object' | 'string' | 'number' | 'boolean' | 'array';
    required?: string[];
    properties?: Record<string, JsonSchema>;
    enum?: unknown[];
    [key: string]: unknown;
}
export declare const decisionSourceSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    kind: z.ZodLiteral<"human">;
    label: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    kind: "human";
    label?: string | undefined;
}, {
    kind: "human";
    label?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"tool">;
    tool: z.ZodString;
    label: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    kind: "tool";
    tool: string;
    label?: string | undefined;
}, {
    kind: "tool";
    tool: string;
    label?: string | undefined;
}>, z.ZodObject<{
    kind: z.ZodLiteral<"system">;
    label: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    kind: "system";
    label?: string | undefined;
}, {
    kind: "system";
    label?: string | undefined;
}>]>;
export declare const gateSchema: z.ZodObject<{
    type: z.ZodLiteral<"external_decision">;
    decisionSource: z.ZodOptional<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"human">;
        label: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        kind: "human";
        label?: string | undefined;
    }, {
        kind: "human";
        label?: string | undefined;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"tool">;
        tool: z.ZodString;
        label: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        kind: "tool";
        tool: string;
        label?: string | undefined;
    }, {
        kind: "tool";
        tool: string;
        label?: string | undefined;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"system">;
        label: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        kind: "system";
        label?: string | undefined;
    }, {
        kind: "system";
        label?: string | undefined;
    }>]>>;
    decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
}, "strict", z.ZodTypeAny, {
    type: "external_decision";
    decisionSchema: JsonSchema;
    decisionSource?: {
        kind: "human";
        label?: string | undefined;
    } | {
        kind: "tool";
        tool: string;
        label?: string | undefined;
    } | {
        kind: "system";
        label?: string | undefined;
    } | undefined;
}, {
    type: "external_decision";
    decisionSchema: JsonSchema;
    decisionSource?: {
        kind: "human";
        label?: string | undefined;
    } | {
        kind: "tool";
        tool: string;
        label?: string | undefined;
    } | {
        kind: "system";
        label?: string | undefined;
    } | undefined;
}>;
export declare const workflowRefSchema: z.ZodObject<{
    graphId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    graphId: string;
}, {
    graphId: string;
}>;
export declare const edgeSchema: z.ZodObject<{
    to: z.ZodString;
    when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strict", z.ZodTypeAny, {
    to: string;
    when?: Record<string, unknown> | undefined;
}, {
    to: string;
    when?: Record<string, unknown> | undefined;
}>;
export declare const nodeSchema: z.ZodEffects<z.ZodObject<{
    purpose: z.ZodString;
    instructions: z.ZodOptional<z.ZodString>;
    exec: z.ZodDefault<z.ZodLiteral<"inline">>;
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    gate: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"external_decision">;
        decisionSource: z.ZodOptional<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
            kind: z.ZodLiteral<"human">;
            label: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            kind: "human";
            label?: string | undefined;
        }, {
            kind: "human";
            label?: string | undefined;
        }>, z.ZodObject<{
            kind: z.ZodLiteral<"tool">;
            tool: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            kind: "tool";
            tool: string;
            label?: string | undefined;
        }, {
            kind: "tool";
            tool: string;
            label?: string | undefined;
        }>, z.ZodObject<{
            kind: z.ZodLiteral<"system">;
            label: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            kind: "system";
            label?: string | undefined;
        }, {
            kind: "system";
            label?: string | undefined;
        }>]>>;
        decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
    }, "strict", z.ZodTypeAny, {
        type: "external_decision";
        decisionSchema: JsonSchema;
        decisionSource?: {
            kind: "human";
            label?: string | undefined;
        } | {
            kind: "tool";
            tool: string;
            label?: string | undefined;
        } | {
            kind: "system";
            label?: string | undefined;
        } | undefined;
    }, {
        type: "external_decision";
        decisionSchema: JsonSchema;
        decisionSource?: {
            kind: "human";
            label?: string | undefined;
        } | {
            kind: "tool";
            tool: string;
            label?: string | undefined;
        } | {
            kind: "system";
            label?: string | undefined;
        } | undefined;
    }>>;
    workflowRef: z.ZodOptional<z.ZodObject<{
        graphId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        graphId: string;
    }, {
        graphId: string;
    }>>;
    edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
        to: z.ZodString;
        when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strict", z.ZodTypeAny, {
        to: string;
        when?: Record<string, unknown> | undefined;
    }, {
        to: string;
        when?: Record<string, unknown> | undefined;
    }>, "many">>;
    terminal: z.ZodDefault<z.ZodBoolean>;
    effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strict", z.ZodTypeAny, {
    purpose: string;
    exec: "inline";
    outputSchema: JsonSchema;
    edges: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[];
    terminal: boolean;
    instructions?: string | undefined;
    gate?: {
        type: "external_decision";
        decisionSchema: JsonSchema;
        decisionSource?: {
            kind: "human";
            label?: string | undefined;
        } | {
            kind: "tool";
            tool: string;
            label?: string | undefined;
        } | {
            kind: "system";
            label?: string | undefined;
        } | undefined;
    } | undefined;
    workflowRef?: {
        graphId: string;
    } | undefined;
    effects?: string[] | undefined;
}, {
    purpose: string;
    instructions?: string | undefined;
    exec?: "inline" | undefined;
    outputSchema?: JsonSchema | undefined;
    gate?: {
        type: "external_decision";
        decisionSchema: JsonSchema;
        decisionSource?: {
            kind: "human";
            label?: string | undefined;
        } | {
            kind: "tool";
            tool: string;
            label?: string | undefined;
        } | {
            kind: "system";
            label?: string | undefined;
        } | undefined;
    } | undefined;
    workflowRef?: {
        graphId: string;
    } | undefined;
    edges?: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[] | undefined;
    terminal?: boolean | undefined;
    effects?: string[] | undefined;
}>, {
    purpose: string;
    exec: "inline";
    outputSchema: JsonSchema;
    edges: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[];
    terminal: boolean;
    instructions?: string | undefined;
    gate?: {
        type: "external_decision";
        decisionSchema: JsonSchema;
        decisionSource?: {
            kind: "human";
            label?: string | undefined;
        } | {
            kind: "tool";
            tool: string;
            label?: string | undefined;
        } | {
            kind: "system";
            label?: string | undefined;
        } | undefined;
    } | undefined;
    workflowRef?: {
        graphId: string;
    } | undefined;
    effects?: string[] | undefined;
}, {
    purpose: string;
    instructions?: string | undefined;
    exec?: "inline" | undefined;
    outputSchema?: JsonSchema | undefined;
    gate?: {
        type: "external_decision";
        decisionSchema: JsonSchema;
        decisionSource?: {
            kind: "human";
            label?: string | undefined;
        } | {
            kind: "tool";
            tool: string;
            label?: string | undefined;
        } | {
            kind: "system";
            label?: string | undefined;
        } | undefined;
    } | undefined;
    workflowRef?: {
        graphId: string;
    } | undefined;
    edges?: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[] | undefined;
    terminal?: boolean | undefined;
    effects?: string[] | undefined;
}>;
export declare const graphSchema: z.ZodEffects<z.ZodObject<{
    kind: z.ZodDefault<z.ZodEnum<["dispatcher", "workflow", "callable"]>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    inputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodLiteral<"inline">>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        gate: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"external_decision">;
            decisionSource: z.ZodOptional<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
                kind: z.ZodLiteral<"human">;
                label: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "human";
                label?: string | undefined;
            }, {
                kind: "human";
                label?: string | undefined;
            }>, z.ZodObject<{
                kind: z.ZodLiteral<"tool">;
                tool: z.ZodString;
                label: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            }, {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            }>, z.ZodObject<{
                kind: z.ZodLiteral<"system">;
                label: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "system";
                label?: string | undefined;
            }, {
                kind: "system";
                label?: string | undefined;
            }>]>>;
            decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
        }, "strict", z.ZodTypeAny, {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        }, {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        }>>;
        workflowRef: z.ZodOptional<z.ZodObject<{
            graphId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            graphId: string;
        }, {
            graphId: string;
        }>>;
        edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
            to: z.ZodString;
            when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strict", z.ZodTypeAny, {
            to: string;
            when?: Record<string, unknown> | undefined;
        }, {
            to: string;
            when?: Record<string, unknown> | undefined;
        }>, "many">>;
        terminal: z.ZodDefault<z.ZodBoolean>;
        effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        purpose: string;
        exec: "inline";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        effects?: string[] | undefined;
    }, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
        effects?: string[] | undefined;
    }>, {
        purpose: string;
        exec: "inline";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        effects?: string[] | undefined;
    }, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
        effects?: string[] | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    kind: "dispatcher" | "workflow" | "callable";
    outputSchema: JsonSchema;
    effects: string[];
    activationHints: string[];
    inputSchema: JsonSchema;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        effects?: string[] | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
}, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
        effects?: string[] | undefined;
    }>;
    kind?: "dispatcher" | "workflow" | "callable" | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    activationHints?: string[] | undefined;
    inputSchema?: JsonSchema | undefined;
}>, {
    kind: "dispatcher" | "workflow" | "callable";
    outputSchema: JsonSchema;
    effects: string[];
    activationHints: string[];
    inputSchema: JsonSchema;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        effects?: string[] | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
}, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
        effects?: string[] | undefined;
    }>;
    kind?: "dispatcher" | "workflow" | "callable" | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    activationHints?: string[] | undefined;
    inputSchema?: JsonSchema | undefined;
}>;
export declare const graphPackageManifestSchema: z.ZodEffects<z.ZodObject<{
    kind: z.ZodDefault<z.ZodEnum<["dispatcher", "workflow", "callable"]>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    inputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodLiteral<"inline">>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        gate: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"external_decision">;
            decisionSource: z.ZodOptional<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
                kind: z.ZodLiteral<"human">;
                label: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "human";
                label?: string | undefined;
            }, {
                kind: "human";
                label?: string | undefined;
            }>, z.ZodObject<{
                kind: z.ZodLiteral<"tool">;
                tool: z.ZodString;
                label: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            }, {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            }>, z.ZodObject<{
                kind: z.ZodLiteral<"system">;
                label: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "system";
                label?: string | undefined;
            }, {
                kind: "system";
                label?: string | undefined;
            }>]>>;
            decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
        }, "strict", z.ZodTypeAny, {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        }, {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        }>>;
        workflowRef: z.ZodOptional<z.ZodObject<{
            graphId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            graphId: string;
        }, {
            graphId: string;
        }>>;
        edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
            to: z.ZodString;
            when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strict", z.ZodTypeAny, {
            to: string;
            when?: Record<string, unknown> | undefined;
        }, {
            to: string;
            when?: Record<string, unknown> | undefined;
        }>, "many">>;
        terminal: z.ZodDefault<z.ZodBoolean>;
        effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        purpose: string;
        exec: "inline";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        effects?: string[] | undefined;
    }, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
        effects?: string[] | undefined;
    }>, {
        purpose: string;
        exec: "inline";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        effects?: string[] | undefined;
    }, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
        effects?: string[] | undefined;
    }>>;
} & {
    id: z.ZodString;
    version: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "dispatcher" | "workflow" | "callable";
    outputSchema: JsonSchema;
    effects: string[];
    activationHints: string[];
    inputSchema: JsonSchema;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        effects?: string[] | undefined;
    }>;
    id: string;
    version: string;
    title?: string | undefined;
    description?: string | undefined;
}, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
        effects?: string[] | undefined;
    }>;
    id: string;
    version: string;
    kind?: "dispatcher" | "workflow" | "callable" | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    activationHints?: string[] | undefined;
    inputSchema?: JsonSchema | undefined;
}>, {
    kind: "dispatcher" | "workflow" | "callable";
    outputSchema: JsonSchema;
    effects: string[];
    activationHints: string[];
    inputSchema: JsonSchema;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline";
        outputSchema: JsonSchema;
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        instructions?: string | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        effects?: string[] | undefined;
    }>;
    id: string;
    version: string;
    title?: string | undefined;
    description?: string | undefined;
}, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
            decisionSource?: {
                kind: "human";
                label?: string | undefined;
            } | {
                kind: "tool";
                tool: string;
                label?: string | undefined;
            } | {
                kind: "system";
                label?: string | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
        effects?: string[] | undefined;
    }>;
    id: string;
    version: string;
    kind?: "dispatcher" | "workflow" | "callable" | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    description?: string | undefined;
    activationHints?: string[] | undefined;
    inputSchema?: JsonSchema | undefined;
}>;
export declare const workflowSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    entryGraph: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    graphs: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        kind: z.ZodDefault<z.ZodEnum<["dispatcher", "workflow", "callable"]>>;
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        inputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        entry: z.ZodString;
        nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
            purpose: z.ZodString;
            instructions: z.ZodOptional<z.ZodString>;
            exec: z.ZodDefault<z.ZodLiteral<"inline">>;
            outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            gate: z.ZodOptional<z.ZodObject<{
                type: z.ZodLiteral<"external_decision">;
                decisionSource: z.ZodOptional<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
                    kind: z.ZodLiteral<"human">;
                    label: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "human";
                    label?: string | undefined;
                }, {
                    kind: "human";
                    label?: string | undefined;
                }>, z.ZodObject<{
                    kind: z.ZodLiteral<"tool">;
                    tool: z.ZodString;
                    label: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                }, {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                }>, z.ZodObject<{
                    kind: z.ZodLiteral<"system">;
                    label: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "system";
                    label?: string | undefined;
                }, {
                    kind: "system";
                    label?: string | undefined;
                }>]>>;
                decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
            }, "strict", z.ZodTypeAny, {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            }, {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            }>>;
            workflowRef: z.ZodOptional<z.ZodObject<{
                graphId: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                graphId: string;
            }, {
                graphId: string;
            }>>;
            edges: z.ZodDefault<z.ZodArray<z.ZodObject<{
                to: z.ZodString;
                when: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "strict", z.ZodTypeAny, {
                to: string;
                when?: Record<string, unknown> | undefined;
            }, {
                to: string;
                when?: Record<string, unknown> | undefined;
            }>, "many">>;
            terminal: z.ZodDefault<z.ZodBoolean>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strict", z.ZodTypeAny, {
            purpose: string;
            exec: "inline";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            effects?: string[] | undefined;
        }, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
            effects?: string[] | undefined;
        }>, {
            purpose: string;
            exec: "inline";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            effects?: string[] | undefined;
        }, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
            effects?: string[] | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        kind: "dispatcher" | "workflow" | "callable";
        outputSchema: JsonSchema;
        effects: string[];
        activationHints: string[];
        inputSchema: JsonSchema;
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            effects?: string[] | undefined;
        }>;
        title?: string | undefined;
        description?: string | undefined;
    }, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
            effects?: string[] | undefined;
        }>;
        kind?: "dispatcher" | "workflow" | "callable" | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
        inputSchema?: JsonSchema | undefined;
    }>, {
        kind: "dispatcher" | "workflow" | "callable";
        outputSchema: JsonSchema;
        effects: string[];
        activationHints: string[];
        inputSchema: JsonSchema;
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            effects?: string[] | undefined;
        }>;
        title?: string | undefined;
        description?: string | undefined;
    }, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
            effects?: string[] | undefined;
        }>;
        kind?: "dispatcher" | "workflow" | "callable" | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
        inputSchema?: JsonSchema | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    version: string;
    graphs: Record<string, {
        kind: "dispatcher" | "workflow" | "callable";
        outputSchema: JsonSchema;
        effects: string[];
        activationHints: string[];
        inputSchema: JsonSchema;
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            effects?: string[] | undefined;
        }>;
        title?: string | undefined;
        description?: string | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
    entryGraph?: string | undefined;
}, {
    id: string;
    version: string;
    graphs: Record<string, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
            effects?: string[] | undefined;
        }>;
        kind?: "dispatcher" | "workflow" | "callable" | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
        inputSchema?: JsonSchema | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
    entryGraph?: string | undefined;
}>, {
    id: string;
    version: string;
    graphs: Record<string, {
        kind: "dispatcher" | "workflow" | "callable";
        outputSchema: JsonSchema;
        effects: string[];
        activationHints: string[];
        inputSchema: JsonSchema;
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline";
            outputSchema: JsonSchema;
            edges: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[];
            terminal: boolean;
            instructions?: string | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            effects?: string[] | undefined;
        }>;
        title?: string | undefined;
        description?: string | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
    entryGraph?: string | undefined;
}, {
    id: string;
    version: string;
    graphs: Record<string, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
                decisionSource?: {
                    kind: "human";
                    label?: string | undefined;
                } | {
                    kind: "tool";
                    tool: string;
                    label?: string | undefined;
                } | {
                    kind: "system";
                    label?: string | undefined;
                } | undefined;
            } | undefined;
            workflowRef?: {
                graphId: string;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
            effects?: string[] | undefined;
        }>;
        kind?: "dispatcher" | "workflow" | "callable" | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
        inputSchema?: JsonSchema | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
    entryGraph?: string | undefined;
}>;
export declare const runStatusSchema: z.ZodEnum<["active", "suspended", "completed", "abandoned"]>;
export declare const callStatusSchema: z.ZodEnum<["active", "completed", "failed"]>;
export declare const positionSchema: z.ZodObject<{
    graph: z.ZodString;
    node: z.ZodString;
}, "strict", z.ZodTypeAny, {
    node: string;
    graph: string;
}, {
    node: string;
    graph: string;
}>;
export declare const graphSourceSchema: z.ZodObject<{
    kind: z.ZodLiteral<"package">;
    graphId: z.ZodString;
    graphVersion: z.ZodString;
    packagePath: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "package";
    graphId: string;
    graphVersion: string;
    packagePath: string;
}, {
    kind: "package";
    graphId: string;
    graphVersion: string;
    packagePath: string;
}>;
export declare const checkpointStackFrameSchema: z.ZodObject<{
    parent: z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
        graphSource: z.ZodOptional<z.ZodObject<{
            kind: z.ZodLiteral<"package">;
            graphId: z.ZodString;
            graphVersion: z.ZodString;
            packagePath: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        }, {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        }>>;
        scope: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        node: string;
        graph: string;
        scope: string;
        graphSource?: {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        } | undefined;
    }, {
        node: string;
        graph: string;
        scope: string;
        graphSource?: {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        } | undefined;
    }>;
    child: z.ZodObject<{
        kind: z.ZodLiteral<"package">;
        graphId: z.ZodString;
        graphVersion: z.ZodString;
        packagePath: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        kind: "package";
        graphId: string;
        graphVersion: string;
        packagePath: string;
    }, {
        kind: "package";
        graphId: string;
        graphVersion: string;
        packagePath: string;
    }>;
    scope: z.ZodString;
    enteredAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    scope: string;
    parent: {
        node: string;
        graph: string;
        scope: string;
        graphSource?: {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        } | undefined;
    };
    child: {
        kind: "package";
        graphId: string;
        graphVersion: string;
        packagePath: string;
    };
    enteredAt: string;
}, {
    scope: string;
    parent: {
        node: string;
        graph: string;
        scope: string;
        graphSource?: {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        } | undefined;
    };
    child: {
        kind: "package";
        graphId: string;
        graphVersion: string;
        packagePath: string;
    };
    enteredAt: string;
}>;
export declare const checkpointSchema: z.ZodObject<{
    runId: z.ZodString;
    status: z.ZodEnum<["active", "suspended", "completed", "abandoned"]>;
    rootGraph: z.ZodString;
    workflow: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        id: string;
        version: string;
    }, {
        id: string;
        version: string;
    }>;
    position: z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        node: string;
        graph: string;
    }, {
        node: string;
        graph: string;
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    outputs: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    gateDecisions: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    graphSource: z.ZodOptional<z.ZodObject<{
        kind: z.ZodLiteral<"package">;
        graphId: z.ZodString;
        graphVersion: z.ZodString;
        packagePath: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        kind: "package";
        graphId: string;
        graphVersion: string;
        packagePath: string;
    }, {
        kind: "package";
        graphId: string;
        graphVersion: string;
        packagePath: string;
    }>>;
    stack: z.ZodDefault<z.ZodArray<z.ZodObject<{
        parent: z.ZodObject<{
            graph: z.ZodString;
            node: z.ZodString;
            graphSource: z.ZodOptional<z.ZodObject<{
                kind: z.ZodLiteral<"package">;
                graphId: z.ZodString;
                graphVersion: z.ZodString;
                packagePath: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                kind: "package";
                graphId: string;
                graphVersion: string;
                packagePath: string;
            }, {
                kind: "package";
                graphId: string;
                graphVersion: string;
                packagePath: string;
            }>>;
            scope: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            node: string;
            graph: string;
            scope: string;
            graphSource?: {
                kind: "package";
                graphId: string;
                graphVersion: string;
                packagePath: string;
            } | undefined;
        }, {
            node: string;
            graph: string;
            scope: string;
            graphSource?: {
                kind: "package";
                graphId: string;
                graphVersion: string;
                packagePath: string;
            } | undefined;
        }>;
        child: z.ZodObject<{
            kind: z.ZodLiteral<"package">;
            graphId: z.ZodString;
            graphVersion: z.ZodString;
            packagePath: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        }, {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        }>;
        scope: z.ZodString;
        enteredAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        scope: string;
        parent: {
            node: string;
            graph: string;
            scope: string;
            graphSource?: {
                kind: "package";
                graphId: string;
                graphVersion: string;
                packagePath: string;
            } | undefined;
        };
        child: {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        };
        enteredAt: string;
    }, {
        scope: string;
        parent: {
            node: string;
            graph: string;
            scope: string;
            graphSource?: {
                kind: "package";
                graphId: string;
                graphVersion: string;
                packagePath: string;
            } | undefined;
        };
        child: {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        };
        enteredAt: string;
    }>, "many">>;
    resumeNote: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    status: "active" | "suspended" | "completed" | "abandoned";
    workflow: {
        id: string;
        version: string;
    };
    runId: string;
    rootGraph: string;
    position: {
        node: string;
        graph: string;
    };
    createdAt: string;
    updatedAt: string;
    outputs: Record<string, unknown>;
    gateDecisions: Record<string, unknown>;
    stack: {
        scope: string;
        parent: {
            node: string;
            graph: string;
            scope: string;
            graphSource?: {
                kind: "package";
                graphId: string;
                graphVersion: string;
                packagePath: string;
            } | undefined;
        };
        child: {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        };
        enteredAt: string;
    }[];
    graphSource?: {
        kind: "package";
        graphId: string;
        graphVersion: string;
        packagePath: string;
    } | undefined;
    resumeNote?: string | undefined;
}, {
    status: "active" | "suspended" | "completed" | "abandoned";
    workflow: {
        id: string;
        version: string;
    };
    runId: string;
    rootGraph: string;
    position: {
        node: string;
        graph: string;
    };
    createdAt: string;
    updatedAt: string;
    graphSource?: {
        kind: "package";
        graphId: string;
        graphVersion: string;
        packagePath: string;
    } | undefined;
    outputs?: Record<string, unknown> | undefined;
    gateDecisions?: Record<string, unknown> | undefined;
    stack?: {
        scope: string;
        parent: {
            node: string;
            graph: string;
            scope: string;
            graphSource?: {
                kind: "package";
                graphId: string;
                graphVersion: string;
                packagePath: string;
            } | undefined;
        };
        child: {
            kind: "package";
            graphId: string;
            graphVersion: string;
            packagePath: string;
        };
        enteredAt: string;
    }[] | undefined;
    resumeNote?: string | undefined;
}>;
export declare const currentSchema: z.ZodObject<{
    focusedRunId: z.ZodNullable<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    focusedRunId: string | null;
}, {
    focusedRunId: string | null;
}>;
export declare const transitionLogEntrySchema: z.ZodObject<{
    ts: z.ZodString;
    op: z.ZodEnum<["start", "step", "decide", "suspend", "resume", "abandon"]>;
    runId: z.ZodString;
    from: z.ZodNullable<z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        node: string;
        graph: string;
    }, {
        node: string;
        graph: string;
    }>>;
    to: z.ZodNullable<z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        node: string;
        graph: string;
    }, {
        node: string;
        graph: string;
    }>>;
    actor: z.ZodString;
    input: z.ZodNullable<z.ZodUnknown>;
    output: z.ZodNullable<z.ZodUnknown>;
    validation: z.ZodObject<{
        ok: z.ZodBoolean;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        ok: z.ZodBoolean;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        ok: z.ZodBoolean;
    }, z.ZodTypeAny, "passthrough">>;
    gateDecision: z.ZodNullable<z.ZodUnknown>;
    reason: z.ZodNullable<z.ZodString>;
    error: z.ZodNullable<z.ZodUnknown>;
}, "strict", z.ZodTypeAny, {
    validation: {
        ok: boolean;
    } & {
        [k: string]: unknown;
    };
    to: {
        node: string;
        graph: string;
    } | null;
    runId: string;
    ts: string;
    op: "start" | "step" | "decide" | "suspend" | "resume" | "abandon";
    from: {
        node: string;
        graph: string;
    } | null;
    actor: string;
    reason: string | null;
    input?: unknown;
    output?: unknown;
    gateDecision?: unknown;
    error?: unknown;
}, {
    validation: {
        ok: boolean;
    } & {
        [k: string]: unknown;
    };
    to: {
        node: string;
        graph: string;
    } | null;
    runId: string;
    ts: string;
    op: "start" | "step" | "decide" | "suspend" | "resume" | "abandon";
    from: {
        node: string;
        graph: string;
    } | null;
    actor: string;
    reason: string | null;
    input?: unknown;
    output?: unknown;
    gateDecision?: unknown;
    error?: unknown;
}>;
export declare const callableCheckpointSchema: z.ZodObject<{
    callId: z.ZodString;
    status: z.ZodEnum<["active", "completed", "failed"]>;
    graphId: z.ZodString;
    graphVersion: z.ZodString;
    packagePath: z.ZodString;
    position: z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        node: string;
        graph: string;
    }, {
        node: string;
        graph: string;
    }>;
    input: z.ZodUnknown;
    outputs: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    finalOutput: z.ZodOptional<z.ZodUnknown>;
    outputArtifact: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    status: "active" | "completed" | "failed";
    graphId: string;
    graphVersion: string;
    packagePath: string;
    position: {
        node: string;
        graph: string;
    };
    createdAt: string;
    updatedAt: string;
    outputs: Record<string, unknown>;
    callId: string;
    input?: unknown;
    finalOutput?: unknown;
    outputArtifact?: string | undefined;
}, {
    status: "active" | "completed" | "failed";
    graphId: string;
    graphVersion: string;
    packagePath: string;
    position: {
        node: string;
        graph: string;
    };
    createdAt: string;
    updatedAt: string;
    callId: string;
    outputs?: Record<string, unknown> | undefined;
    input?: unknown;
    finalOutput?: unknown;
    outputArtifact?: string | undefined;
}>;
export declare const callableTransitionLogEntrySchema: z.ZodObject<{
    ts: z.ZodString;
    op: z.ZodEnum<["start", "step", "complete", "fail"]>;
    callId: z.ZodString;
    from: z.ZodNullable<z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        node: string;
        graph: string;
    }, {
        node: string;
        graph: string;
    }>>;
    to: z.ZodNullable<z.ZodObject<{
        graph: z.ZodString;
        node: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        node: string;
        graph: string;
    }, {
        node: string;
        graph: string;
    }>>;
    input: z.ZodNullable<z.ZodUnknown>;
    output: z.ZodNullable<z.ZodUnknown>;
    validation: z.ZodObject<{
        ok: z.ZodBoolean;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        ok: z.ZodBoolean;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        ok: z.ZodBoolean;
    }, z.ZodTypeAny, "passthrough">>;
    error: z.ZodNullable<z.ZodUnknown>;
}, "strict", z.ZodTypeAny, {
    validation: {
        ok: boolean;
    } & {
        [k: string]: unknown;
    };
    to: {
        node: string;
        graph: string;
    } | null;
    ts: string;
    op: "start" | "step" | "complete" | "fail";
    from: {
        node: string;
        graph: string;
    } | null;
    callId: string;
    input?: unknown;
    output?: unknown;
    error?: unknown;
}, {
    validation: {
        ok: boolean;
    } & {
        [k: string]: unknown;
    };
    to: {
        node: string;
        graph: string;
    } | null;
    ts: string;
    op: "start" | "step" | "complete" | "fail";
    from: {
        node: string;
        graph: string;
    } | null;
    callId: string;
    input?: unknown;
    output?: unknown;
    error?: unknown;
}>;
export type Workflow = z.infer<typeof workflowSchema>;
export type GraphPackageManifest = z.infer<typeof graphPackageManifestSchema>;
export type Graph = z.infer<typeof graphSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type Gate = z.infer<typeof gateSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type Position = z.infer<typeof positionSchema>;
export type GraphSource = z.infer<typeof graphSourceSchema>;
export type CheckpointStackFrame = z.infer<typeof checkpointStackFrameSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type Current = z.infer<typeof currentSchema>;
export type TransitionLogEntry = z.infer<typeof transitionLogEntrySchema>;
export type CallStatus = z.infer<typeof callStatusSchema>;
export type CallableCheckpoint = z.infer<typeof callableCheckpointSchema>;
export type CallableTransitionLogEntry = z.infer<typeof callableTransitionLogEntrySchema>;
