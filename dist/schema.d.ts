import { z } from 'zod';
export declare class RipplegraphError extends Error {
    readonly code: string;
    readonly details?: unknown | undefined;
    constructor(code: string, message: string, details?: unknown | undefined);
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
}>]>;
export declare const interactionKindSchema: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
export declare const interactionChoiceSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    value: string | number | boolean;
    label: string;
    description?: string | undefined;
}, {
    value: string | number | boolean;
    label: string;
    description?: string | undefined;
}>;
export declare const interactionFollowUpSchema: z.ZodObject<{
    when: z.ZodString;
    id: z.ZodString;
    kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
    source: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    kind: "choice" | "free_text" | "confirm" | "form";
    when: string;
    id: string;
    source?: string | undefined;
}, {
    kind: "choice" | "free_text" | "confirm" | "form";
    when: string;
    id: string;
    source?: string | undefined;
}>;
export declare const interactionSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
    prompt: z.ZodString;
    renderVia: z.ZodOptional<z.ZodString>;
    choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        description: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        value: string | number | boolean;
        label: string;
        description?: string | undefined;
    }, {
        value: string | number | boolean;
        label: string;
        description?: string | undefined;
    }>, "many">>;
    schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    followUp: z.ZodOptional<z.ZodObject<{
        when: z.ZodString;
        id: z.ZodString;
        kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
        source: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        kind: "choice" | "free_text" | "confirm" | "form";
        when: string;
        id: string;
        source?: string | undefined;
    }, {
        kind: "choice" | "free_text" | "confirm" | "form";
        when: string;
        id: string;
        source?: string | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    kind: "choice" | "free_text" | "confirm" | "form";
    id: string;
    prompt: string;
    renderVia?: string | undefined;
    choices?: {
        value: string | number | boolean;
        label: string;
        description?: string | undefined;
    }[] | undefined;
    schema?: JsonSchema | undefined;
    followUp?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        when: string;
        id: string;
        source?: string | undefined;
    } | undefined;
}, {
    kind: "choice" | "free_text" | "confirm" | "form";
    id: string;
    prompt: string;
    renderVia?: string | undefined;
    choices?: {
        value: string | number | boolean;
        label: string;
        description?: string | undefined;
    }[] | undefined;
    schema?: JsonSchema | undefined;
    followUp?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        when: string;
        id: string;
        source?: string | undefined;
    } | undefined;
}>, {
    kind: "choice" | "free_text" | "confirm" | "form";
    id: string;
    prompt: string;
    renderVia?: string | undefined;
    choices?: {
        value: string | number | boolean;
        label: string;
        description?: string | undefined;
    }[] | undefined;
    schema?: JsonSchema | undefined;
    followUp?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        when: string;
        id: string;
        source?: string | undefined;
    } | undefined;
}, {
    kind: "choice" | "free_text" | "confirm" | "form";
    id: string;
    prompt: string;
    renderVia?: string | undefined;
    choices?: {
        value: string | number | boolean;
        label: string;
        description?: string | undefined;
    }[] | undefined;
    schema?: JsonSchema | undefined;
    followUp?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        when: string;
        id: string;
        source?: string | undefined;
    } | undefined;
}>;
export declare const interruptSchema: z.ZodObject<{
    requiresUserTurn: z.ZodLiteral<true>;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    requiresUserTurn: true;
    reason?: string | undefined;
}, {
    requiresUserTurn: true;
    reason?: string | undefined;
}>;
export declare const validatorContractSchema: z.ZodObject<{
    id: z.ZodString;
    purpose: z.ZodOptional<z.ZodString>;
    inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
}, "strict", z.ZodTypeAny, {
    id: string;
    purpose?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
}, {
    id: string;
    purpose?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
}>;
export declare const toolContractSchema: z.ZodObject<{
    id: z.ZodString;
    command: z.ZodString;
    purpose: z.ZodOptional<z.ZodString>;
    effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    validator: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    id: string;
    command: string;
    purpose?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    validator?: string | undefined;
}, {
    id: string;
    command: string;
    purpose?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    validator?: string | undefined;
}>;
export declare const sideChannelActionSchema: z.ZodObject<{
    id: z.ZodString;
    purpose: z.ZodString;
    commandRef: z.ZodOptional<z.ZodString>;
    effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    validator: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    id: string;
    purpose: string;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    validator?: string | undefined;
    commandRef?: string | undefined;
}, {
    id: string;
    purpose: string;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    validator?: string | undefined;
    commandRef?: string | undefined;
}>;
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
    }>]>>;
    interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
        prompt: z.ZodString;
        renderVia: z.ZodOptional<z.ZodString>;
        choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            description: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }, {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }>, "many">>;
        schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        followUp: z.ZodOptional<z.ZodObject<{
            when: z.ZodString;
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            source: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    }, {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    }>, {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    }, {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    }>>;
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
    } | undefined;
    interaction?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
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
    } | undefined;
    interaction?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    } | undefined;
}>;
export declare const workflowRefSchema: z.ZodObject<{
    graphId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    graphId: string;
}, {
    graphId: string;
}>;
export declare const startRequirementSchema: z.ZodObject<{
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
    interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
        prompt: z.ZodString;
        renderVia: z.ZodOptional<z.ZodString>;
        choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            description: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }, {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }>, "many">>;
        schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        followUp: z.ZodOptional<z.ZodObject<{
            when: z.ZodString;
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            source: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    }, {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    }>, {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    }, {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    }>>;
    interrupt: z.ZodOptional<z.ZodObject<{
        requiresUserTurn: z.ZodLiteral<true>;
        reason: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        requiresUserTurn: true;
        reason?: string | undefined;
    }, {
        requiresUserTurn: true;
        reason?: string | undefined;
    }>>;
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
        }>]>>;
        interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            prompt: z.ZodString;
            renderVia: z.ZodOptional<z.ZodString>;
            choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                description: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }>, "many">>;
            schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            followUp: z.ZodOptional<z.ZodObject<{
                when: z.ZodString;
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                source: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>>;
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
        } | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
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
        } | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
    }>>;
    workflowRef: z.ZodOptional<z.ZodObject<{
        graphId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        graphId: string;
    }, {
        graphId: string;
    }>>;
    sideChannelActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        purpose: z.ZodString;
        commandRef: z.ZodOptional<z.ZodString>;
        effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        validator: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
        commandRef?: string | undefined;
    }, {
        id: string;
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
        commandRef?: string | undefined;
    }>, "many">>;
    toolContract: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        command: z.ZodString;
        purpose: z.ZodOptional<z.ZodString>;
        effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        validator: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        command: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
    }, {
        id: string;
        command: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
    }>>;
    validators: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        purpose: z.ZodOptional<z.ZodString>;
        inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
    }, {
        id: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
    }>, "many">>;
    operatorContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
    outputSchema: JsonSchema;
    exec: "inline";
    edges: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[];
    terminal: boolean;
    effects?: string[] | undefined;
    interaction?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    } | undefined;
    instructions?: string | undefined;
    interrupt?: {
        requiresUserTurn: true;
        reason?: string | undefined;
    } | undefined;
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
        } | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    workflowRef?: {
        graphId: string;
    } | undefined;
    sideChannelActions?: {
        id: string;
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
        commandRef?: string | undefined;
    }[] | undefined;
    toolContract?: {
        id: string;
        command: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
    } | undefined;
    validators?: {
        id: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
    }[] | undefined;
    operatorContext?: Record<string, unknown> | undefined;
}, {
    purpose: string;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    interaction?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    } | undefined;
    instructions?: string | undefined;
    exec?: "inline" | undefined;
    interrupt?: {
        requiresUserTurn: true;
        reason?: string | undefined;
    } | undefined;
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
        } | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    workflowRef?: {
        graphId: string;
    } | undefined;
    sideChannelActions?: {
        id: string;
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
        commandRef?: string | undefined;
    }[] | undefined;
    toolContract?: {
        id: string;
        command: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
    } | undefined;
    validators?: {
        id: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
    }[] | undefined;
    operatorContext?: Record<string, unknown> | undefined;
    edges?: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[] | undefined;
    terminal?: boolean | undefined;
}>, {
    purpose: string;
    outputSchema: JsonSchema;
    exec: "inline";
    edges: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[];
    terminal: boolean;
    effects?: string[] | undefined;
    interaction?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    } | undefined;
    instructions?: string | undefined;
    interrupt?: {
        requiresUserTurn: true;
        reason?: string | undefined;
    } | undefined;
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
        } | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    workflowRef?: {
        graphId: string;
    } | undefined;
    sideChannelActions?: {
        id: string;
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
        commandRef?: string | undefined;
    }[] | undefined;
    toolContract?: {
        id: string;
        command: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
    } | undefined;
    validators?: {
        id: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
    }[] | undefined;
    operatorContext?: Record<string, unknown> | undefined;
}, {
    purpose: string;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    interaction?: {
        kind: "choice" | "free_text" | "confirm" | "form";
        id: string;
        prompt: string;
        renderVia?: string | undefined;
        choices?: {
            value: string | number | boolean;
            label: string;
            description?: string | undefined;
        }[] | undefined;
        schema?: JsonSchema | undefined;
        followUp?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            when: string;
            id: string;
            source?: string | undefined;
        } | undefined;
    } | undefined;
    instructions?: string | undefined;
    exec?: "inline" | undefined;
    interrupt?: {
        requiresUserTurn: true;
        reason?: string | undefined;
    } | undefined;
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
        } | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    workflowRef?: {
        graphId: string;
    } | undefined;
    sideChannelActions?: {
        id: string;
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
        commandRef?: string | undefined;
    }[] | undefined;
    toolContract?: {
        id: string;
        command: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        validator?: string | undefined;
    } | undefined;
    validators?: {
        id: string;
        purpose?: string | undefined;
        inputSchema?: JsonSchema | undefined;
        outputSchema?: JsonSchema | undefined;
    }[] | undefined;
    operatorContext?: Record<string, unknown> | undefined;
    edges?: {
        to: string;
        when?: Record<string, unknown> | undefined;
    }[] | undefined;
    terminal?: boolean | undefined;
}>;
export declare const graphSchema: z.ZodEffects<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
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
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodLiteral<"inline">>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            prompt: z.ZodString;
            renderVia: z.ZodOptional<z.ZodString>;
            choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                description: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }>, "many">>;
            schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            followUp: z.ZodOptional<z.ZodObject<{
                when: z.ZodString;
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                source: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>>;
        interrupt: z.ZodOptional<z.ZodObject<{
            requiresUserTurn: z.ZodLiteral<true>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }>>;
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
            }>]>>;
            interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                prompt: z.ZodString;
                renderVia: z.ZodOptional<z.ZodString>;
                choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                    description: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }>, "many">>;
                schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
                followUp: z.ZodOptional<z.ZodObject<{
                    when: z.ZodString;
                    id: z.ZodString;
                    kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                    source: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }>>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>>;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        }>>;
        workflowRef: z.ZodOptional<z.ZodObject<{
            graphId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            graphId: string;
        }, {
            graphId: string;
        }>>;
        sideChannelActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodString;
            commandRef: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }>, "many">>;
        toolContract: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            command: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }>>;
        validators: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }>, "many">>;
        operatorContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    kind: z.ZodLiteral<"workflow">;
}, "strict", z.ZodTypeAny, {
    kind: "workflow";
    outputSchema: JsonSchema;
    effects: string[];
    requires: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "workflow";
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    description?: string | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    requires?: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>, z.ZodObject<{
    inputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodLiteral<"inline">>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            prompt: z.ZodString;
            renderVia: z.ZodOptional<z.ZodString>;
            choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                description: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }>, "many">>;
            schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            followUp: z.ZodOptional<z.ZodObject<{
                when: z.ZodString;
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                source: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>>;
        interrupt: z.ZodOptional<z.ZodObject<{
            requiresUserTurn: z.ZodLiteral<true>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }>>;
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
            }>]>>;
            interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                prompt: z.ZodString;
                renderVia: z.ZodOptional<z.ZodString>;
                choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                    description: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }>, "many">>;
                schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
                followUp: z.ZodOptional<z.ZodObject<{
                    when: z.ZodString;
                    id: z.ZodString;
                    kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                    source: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }>>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>>;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        }>>;
        workflowRef: z.ZodOptional<z.ZodObject<{
            graphId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            graphId: string;
        }, {
            graphId: string;
        }>>;
        sideChannelActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodString;
            commandRef: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }>, "many">>;
        toolContract: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            command: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }>>;
        validators: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }>, "many">>;
        operatorContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    kind: z.ZodLiteral<"callable">;
}, "strict", z.ZodTypeAny, {
    kind: "callable";
    inputSchema: JsonSchema;
    outputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "callable";
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    description?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>]>, {
    kind: "workflow";
    outputSchema: JsonSchema;
    effects: string[];
    requires: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    description?: string | undefined;
    title?: string | undefined;
} | {
    kind: "callable";
    inputSchema: JsonSchema;
    outputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "workflow";
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    description?: string | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    requires?: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
} | {
    kind: "callable";
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    description?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>;
export declare const dispatcherGraphManifestSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    id: z.ZodString;
    version: z.ZodString;
    kind: z.ZodLiteral<"dispatcher">;
}, "strict", z.ZodTypeAny, {
    kind: "dispatcher";
    id: string;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "dispatcher";
    id: string;
    version: string;
    description?: string | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>;
export declare const workflowGraphManifestSchema: z.ZodObject<{
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
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodLiteral<"inline">>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            prompt: z.ZodString;
            renderVia: z.ZodOptional<z.ZodString>;
            choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                description: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }>, "many">>;
            schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            followUp: z.ZodOptional<z.ZodObject<{
                when: z.ZodString;
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                source: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>>;
        interrupt: z.ZodOptional<z.ZodObject<{
            requiresUserTurn: z.ZodLiteral<true>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }>>;
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
            }>]>>;
            interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                prompt: z.ZodString;
                renderVia: z.ZodOptional<z.ZodString>;
                choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                    description: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }>, "many">>;
                schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
                followUp: z.ZodOptional<z.ZodObject<{
                    when: z.ZodString;
                    id: z.ZodString;
                    kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                    source: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }>>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>>;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        }>>;
        workflowRef: z.ZodOptional<z.ZodObject<{
            graphId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            graphId: string;
        }, {
            graphId: string;
        }>>;
        sideChannelActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodString;
            commandRef: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }>, "many">>;
        toolContract: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            command: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }>>;
        validators: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }>, "many">>;
        operatorContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    kind: z.ZodLiteral<"workflow">;
} & {
    id: z.ZodString;
    version: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "workflow";
    id: string;
    outputSchema: JsonSchema;
    effects: string[];
    requires: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "workflow";
    id: string;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    version: string;
    description?: string | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    requires?: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>;
export declare const callableGraphManifestSchema: z.ZodObject<{
    inputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodLiteral<"inline">>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            prompt: z.ZodString;
            renderVia: z.ZodOptional<z.ZodString>;
            choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                description: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }>, "many">>;
            schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            followUp: z.ZodOptional<z.ZodObject<{
                when: z.ZodString;
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                source: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>>;
        interrupt: z.ZodOptional<z.ZodObject<{
            requiresUserTurn: z.ZodLiteral<true>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }>>;
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
            }>]>>;
            interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                prompt: z.ZodString;
                renderVia: z.ZodOptional<z.ZodString>;
                choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                    description: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }>, "many">>;
                schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
                followUp: z.ZodOptional<z.ZodObject<{
                    when: z.ZodString;
                    id: z.ZodString;
                    kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                    source: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }>>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>>;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        }>>;
        workflowRef: z.ZodOptional<z.ZodObject<{
            graphId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            graphId: string;
        }, {
            graphId: string;
        }>>;
        sideChannelActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodString;
            commandRef: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }>, "many">>;
        toolContract: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            command: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }>>;
        validators: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }>, "many">>;
        operatorContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    kind: z.ZodLiteral<"callable">;
} & {
    id: z.ZodString;
    version: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "callable";
    id: string;
    inputSchema: JsonSchema;
    outputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "callable";
    id: string;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    version: string;
    description?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>;
export declare const graphPackageManifestSchema: z.ZodEffects<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    id: z.ZodString;
    version: z.ZodString;
    kind: z.ZodLiteral<"dispatcher">;
}, "strict", z.ZodTypeAny, {
    kind: "dispatcher";
    id: string;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "dispatcher";
    id: string;
    version: string;
    description?: string | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>, z.ZodObject<{
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
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodLiteral<"inline">>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            prompt: z.ZodString;
            renderVia: z.ZodOptional<z.ZodString>;
            choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                description: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }>, "many">>;
            schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            followUp: z.ZodOptional<z.ZodObject<{
                when: z.ZodString;
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                source: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>>;
        interrupt: z.ZodOptional<z.ZodObject<{
            requiresUserTurn: z.ZodLiteral<true>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }>>;
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
            }>]>>;
            interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                prompt: z.ZodString;
                renderVia: z.ZodOptional<z.ZodString>;
                choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                    description: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }>, "many">>;
                schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
                followUp: z.ZodOptional<z.ZodObject<{
                    when: z.ZodString;
                    id: z.ZodString;
                    kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                    source: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }>>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>>;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        }>>;
        workflowRef: z.ZodOptional<z.ZodObject<{
            graphId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            graphId: string;
        }, {
            graphId: string;
        }>>;
        sideChannelActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodString;
            commandRef: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }>, "many">>;
        toolContract: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            command: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }>>;
        validators: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }>, "many">>;
        operatorContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    kind: z.ZodLiteral<"workflow">;
} & {
    id: z.ZodString;
    version: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "workflow";
    id: string;
    outputSchema: JsonSchema;
    effects: string[];
    requires: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "workflow";
    id: string;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    version: string;
    description?: string | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    requires?: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>, z.ZodObject<{
    inputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    effects: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
    entry: z.ZodString;
    nodes: z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        purpose: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        exec: z.ZodDefault<z.ZodLiteral<"inline">>;
        outputSchema: z.ZodDefault<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
            prompt: z.ZodString;
            renderVia: z.ZodOptional<z.ZodString>;
            choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                description: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }, {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }>, "many">>;
            schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            followUp: z.ZodOptional<z.ZodObject<{
                when: z.ZodString;
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                source: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }, {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        }>>;
        interrupt: z.ZodOptional<z.ZodObject<{
            requiresUserTurn: z.ZodLiteral<true>;
            reason: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }, {
            requiresUserTurn: true;
            reason?: string | undefined;
        }>>;
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
            }>]>>;
            interaction: z.ZodOptional<z.ZodEffects<z.ZodObject<{
                id: z.ZodString;
                kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                prompt: z.ZodString;
                renderVia: z.ZodOptional<z.ZodString>;
                choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    label: z.ZodString;
                    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                    description: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }, {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }>, "many">>;
                schema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
                followUp: z.ZodOptional<z.ZodObject<{
                    when: z.ZodString;
                    id: z.ZodString;
                    kind: z.ZodEnum<["choice", "free_text", "confirm", "form"]>;
                    source: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }, {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                }>>;
            }, "strict", z.ZodTypeAny, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }, {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            }>>;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        }>>;
        workflowRef: z.ZodOptional<z.ZodObject<{
            graphId: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            graphId: string;
        }, {
            graphId: string;
        }>>;
        sideChannelActions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodString;
            commandRef: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }, {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }>, "many">>;
        toolContract: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            command: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            effects: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            validator: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }, {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        }>>;
        validators: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            purpose: z.ZodOptional<z.ZodString>;
            inputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
            outputSchema: z.ZodOptional<z.ZodType<JsonSchema, z.ZodTypeDef, JsonSchema>>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }, {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }>, "many">>;
        operatorContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
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
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    activationHints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    kind: z.ZodLiteral<"callable">;
} & {
    id: z.ZodString;
    version: z.ZodString;
}, "strict", z.ZodTypeAny, {
    kind: "callable";
    id: string;
    inputSchema: JsonSchema;
    outputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "callable";
    id: string;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    version: string;
    description?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>]>, {
    kind: "dispatcher";
    id: string;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
} | {
    kind: "workflow";
    id: string;
    outputSchema: JsonSchema;
    effects: string[];
    requires: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
} | {
    kind: "callable";
    id: string;
    inputSchema: JsonSchema;
    outputSchema: JsonSchema;
    effects: string[];
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema: JsonSchema;
        exec: "inline";
        edges: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[];
        terminal: boolean;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
    }>;
    activationHints: string[];
    version: string;
    description?: string | undefined;
    title?: string | undefined;
}, {
    kind: "dispatcher";
    id: string;
    version: string;
    description?: string | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
} | {
    kind: "workflow";
    id: string;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    version: string;
    description?: string | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    requires?: {
        id: string;
        describe: string;
        unmetRedirect?: string | undefined;
        unmetMessage?: string | undefined;
    }[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
} | {
    kind: "callable";
    id: string;
    entry: string;
    nodes: Record<string, {
        purpose: string;
        outputSchema?: JsonSchema | undefined;
        effects?: string[] | undefined;
        interaction?: {
            kind: "choice" | "free_text" | "confirm" | "form";
            id: string;
            prompt: string;
            renderVia?: string | undefined;
            choices?: {
                value: string | number | boolean;
                label: string;
                description?: string | undefined;
            }[] | undefined;
            schema?: JsonSchema | undefined;
            followUp?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                when: string;
                id: string;
                source?: string | undefined;
            } | undefined;
        } | undefined;
        instructions?: string | undefined;
        exec?: "inline" | undefined;
        interrupt?: {
            requiresUserTurn: true;
            reason?: string | undefined;
        } | undefined;
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
            } | undefined;
            interaction?: {
                kind: "choice" | "free_text" | "confirm" | "form";
                id: string;
                prompt: string;
                renderVia?: string | undefined;
                choices?: {
                    value: string | number | boolean;
                    label: string;
                    description?: string | undefined;
                }[] | undefined;
                schema?: JsonSchema | undefined;
                followUp?: {
                    kind: "choice" | "free_text" | "confirm" | "form";
                    when: string;
                    id: string;
                    source?: string | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
        workflowRef?: {
            graphId: string;
        } | undefined;
        sideChannelActions?: {
            id: string;
            purpose: string;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
            commandRef?: string | undefined;
        }[] | undefined;
        toolContract?: {
            id: string;
            command: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
            effects?: string[] | undefined;
            validator?: string | undefined;
        } | undefined;
        validators?: {
            id: string;
            purpose?: string | undefined;
            inputSchema?: JsonSchema | undefined;
            outputSchema?: JsonSchema | undefined;
        }[] | undefined;
        operatorContext?: Record<string, unknown> | undefined;
        edges?: {
            to: string;
            when?: Record<string, unknown> | undefined;
        }[] | undefined;
        terminal?: boolean | undefined;
    }>;
    version: string;
    description?: string | undefined;
    inputSchema?: JsonSchema | undefined;
    outputSchema?: JsonSchema | undefined;
    effects?: string[] | undefined;
    title?: string | undefined;
    activationHints?: string[] | undefined;
}>;
export declare const workflowSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodString;
    entryGraph: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    id: string;
    version: string;
    description?: string | undefined;
    title?: string | undefined;
    entryGraph?: string | undefined;
}, {
    id: string;
    version: string;
    description?: string | undefined;
    title?: string | undefined;
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
export declare const checkpointSchema: z.ZodEffects<z.ZodObject<{
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
    frameCounter: z.ZodDefault<z.ZodNumber>;
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
    frameCounter: number;
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
    frameCounter?: number | undefined;
    resumeNote?: string | undefined;
}>, {
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
    frameCounter: number;
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
    frameCounter?: number | undefined;
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
    op: z.ZodEnum<["start", "step", "decide", "suspend", "resume", "abandon", "side_channel", "reconcile"]>;
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
    reason: string | null;
    to: {
        node: string;
        graph: string;
    } | null;
    runId: string;
    ts: string;
    op: "start" | "step" | "decide" | "suspend" | "resume" | "abandon" | "side_channel" | "reconcile";
    from: {
        node: string;
        graph: string;
    } | null;
    actor: string;
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
    reason: string | null;
    to: {
        node: string;
        graph: string;
    } | null;
    runId: string;
    ts: string;
    op: "start" | "step" | "decide" | "suspend" | "resume" | "abandon" | "side_channel" | "reconcile";
    from: {
        node: string;
        graph: string;
    } | null;
    actor: string;
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
export type DispatcherGraphManifest = z.infer<typeof dispatcherGraphManifestSchema>;
export type WorkflowGraphManifest = z.infer<typeof workflowGraphManifestSchema>;
export type CallableGraphManifest = z.infer<typeof callableGraphManifestSchema>;
export type Graph = z.infer<typeof graphSchema>;
export type StartRequirement = z.infer<typeof startRequirementSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type Gate = z.infer<typeof gateSchema>;
export type Interaction = z.infer<typeof interactionSchema>;
export type Interrupt = z.infer<typeof interruptSchema>;
export type ToolContract = z.infer<typeof toolContractSchema>;
export type ValidatorContract = z.infer<typeof validatorContractSchema>;
export type SideChannelAction = z.infer<typeof sideChannelActionSchema>;
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
