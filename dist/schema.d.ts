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
export declare const gateSchema: z.ZodObject<{
    type: z.ZodLiteral<"external_decision">;
    decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
}, "strict", z.ZodTypeAny, {
    type: "external_decision";
    decisionSchema: JsonSchema;
}, {
    type: "external_decision";
    decisionSchema: JsonSchema;
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
export declare const nodeSchema: z.ZodObject<{
    purpose: z.ZodString;
    instructions: z.ZodOptional<z.ZodString>;
    exec: z.ZodDefault<z.ZodEnum<["inline", "spawn", "script"]>>;
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    gate: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"external_decision">;
        decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
    }, "strict", z.ZodTypeAny, {
        type: "external_decision";
        decisionSchema: JsonSchema;
    }, {
        type: "external_decision";
        decisionSchema: JsonSchema;
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
}, "strict", z.ZodTypeAny, {
    purpose: string;
    exec: "inline" | "spawn" | "script";
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
    } | undefined;
}, {
    purpose: string;
    instructions?: string | undefined;
    exec?: "inline" | "spawn" | "script" | undefined;
    outputSchema?: JsonSchema | undefined;
    gate?: {
        type: "external_decision";
        decisionSchema: JsonSchema;
    } | undefined;
    edges?: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[] | undefined;
    terminal?: boolean | undefined;
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
    nodes: z.ZodRecord<z.ZodString, z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodEnum<["inline", "spawn", "script"]>>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        gate: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"external_decision">;
            decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
        }, "strict", z.ZodTypeAny, {
            type: "external_decision";
            decisionSchema: JsonSchema;
        }, {
            type: "external_decision";
            decisionSchema: JsonSchema;
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
    }, "strict", z.ZodTypeAny, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
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
        } | undefined;
    }, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    outputSchema: JsonSchema;
    kind: "dispatcher" | "workflow" | "callable";
    activationHints: string[];
    inputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
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
        } | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
}, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    outputSchema?: JsonSchema | undefined;
    kind?: "dispatcher" | "workflow" | "callable" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    activationHints?: string[] | undefined;
    inputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
}>, {
    outputSchema: JsonSchema;
    kind: "dispatcher" | "workflow" | "callable";
    activationHints: string[];
    inputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
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
        } | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
}, {
    entry: string;
    nodes: Record<string, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    outputSchema?: JsonSchema | undefined;
    kind?: "dispatcher" | "workflow" | "callable" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    activationHints?: string[] | undefined;
    inputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
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
    nodes: z.ZodRecord<z.ZodString, z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodEnum<["inline", "spawn", "script"]>>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        gate: z.ZodOptional<z.ZodObject<{
            type: z.ZodLiteral<"external_decision">;
            decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
        }, "strict", z.ZodTypeAny, {
            type: "external_decision";
            decisionSchema: JsonSchema;
        }, {
            type: "external_decision";
            decisionSchema: JsonSchema;
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
    }, "strict", z.ZodTypeAny, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
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
        } | undefined;
    }, {
        purpose: string;
        instructions?: string | undefined;
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
} & {
    id: z.ZodString;
    version: z.ZodString;
}, "strict", z.ZodTypeAny, {
    outputSchema: JsonSchema;
    kind: "dispatcher" | "workflow" | "callable";
    activationHints: string[];
    inputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
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
        } | undefined;
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
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    id: string;
    version: string;
    outputSchema?: JsonSchema | undefined;
    kind?: "dispatcher" | "workflow" | "callable" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    activationHints?: string[] | undefined;
    inputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
}>, {
    outputSchema: JsonSchema;
    kind: "dispatcher" | "workflow" | "callable";
    activationHints: string[];
    inputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        exec: "inline" | "spawn" | "script";
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
        } | undefined;
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
        exec?: "inline" | "spawn" | "script" | undefined;
        outputSchema?: JsonSchema | undefined;
        gate?: {
            type: "external_decision";
            decisionSchema: JsonSchema;
        } | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    id: string;
    version: string;
    outputSchema?: JsonSchema | undefined;
    kind?: "dispatcher" | "workflow" | "callable" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    activationHints?: string[] | undefined;
    inputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
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
        nodes: z.ZodRecord<z.ZodString, z.ZodObject<{
            purpose: z.ZodString;
            instructions: z.ZodOptional<z.ZodString>;
            exec: z.ZodDefault<z.ZodEnum<["inline", "spawn", "script"]>>;
            outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            gate: z.ZodOptional<z.ZodObject<{
                type: z.ZodLiteral<"external_decision">;
                decisionSchema: z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>;
            }, "strict", z.ZodTypeAny, {
                type: "external_decision";
                decisionSchema: JsonSchema;
            }, {
                type: "external_decision";
                decisionSchema: JsonSchema;
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
        }, "strict", z.ZodTypeAny, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
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
            } | undefined;
        }, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        outputSchema: JsonSchema;
        kind: "dispatcher" | "workflow" | "callable";
        activationHints: string[];
        inputSchema: JsonSchema;
        effects: string[];
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
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
            } | undefined;
        }>;
        title?: string | undefined;
        description?: string | undefined;
    }, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>;
        outputSchema?: JsonSchema | undefined;
        kind?: "dispatcher" | "workflow" | "callable" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
        inputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
    }>, {
        outputSchema: JsonSchema;
        kind: "dispatcher" | "workflow" | "callable";
        activationHints: string[];
        inputSchema: JsonSchema;
        effects: string[];
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
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
            } | undefined;
        }>;
        title?: string | undefined;
        description?: string | undefined;
    }, {
        entry: string;
        nodes: Record<string, {
            purpose: string;
            instructions?: string | undefined;
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>;
        outputSchema?: JsonSchema | undefined;
        kind?: "dispatcher" | "workflow" | "callable" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
        inputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    version: string;
    graphs: Record<string, {
        outputSchema: JsonSchema;
        kind: "dispatcher" | "workflow" | "callable";
        activationHints: string[];
        inputSchema: JsonSchema;
        effects: string[];
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
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
            } | undefined;
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
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>;
        outputSchema?: JsonSchema | undefined;
        kind?: "dispatcher" | "workflow" | "callable" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
        inputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
    entryGraph?: string | undefined;
}>, {
    id: string;
    version: string;
    graphs: Record<string, {
        outputSchema: JsonSchema;
        kind: "dispatcher" | "workflow" | "callable";
        activationHints: string[];
        inputSchema: JsonSchema;
        effects: string[];
        entry: string;
        nodes: Record<string, {
            purpose: string;
            exec: "inline" | "spawn" | "script";
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
            } | undefined;
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
            exec?: "inline" | "spawn" | "script" | undefined;
            outputSchema?: JsonSchema | undefined;
            gate?: {
                type: "external_decision";
                decisionSchema: JsonSchema;
            } | undefined;
            edges?: {
                to: string;
                when?: Record<string, unknown> | undefined;
            }[] | undefined;
            terminal?: boolean | undefined;
        }>;
        outputSchema?: JsonSchema | undefined;
        kind?: "dispatcher" | "workflow" | "callable" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        activationHints?: string[] | undefined;
        inputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
    }>;
    title?: string | undefined;
    description?: string | undefined;
    entryGraph?: string | undefined;
}>;
export declare const runStatusSchema: z.ZodEnum<["active", "suspended", "completed", "abandoned"]>;
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
    outputs?: Record<string, unknown> | undefined;
    gateDecisions?: Record<string, unknown> | undefined;
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
export type Workflow = z.infer<typeof workflowSchema>;
export type GraphPackageManifest = z.infer<typeof graphPackageManifestSchema>;
export type Graph = z.infer<typeof graphSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type Gate = z.infer<typeof gateSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type Position = z.infer<typeof positionSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type Current = z.infer<typeof currentSchema>;
export type TransitionLogEntry = z.infer<typeof transitionLogEntrySchema>;
