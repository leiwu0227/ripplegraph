import { z } from 'zod';
export class RipplegraphError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'RipplegraphError';
    }
}
const idSchema = z.string().min(1).regex(/^[A-Za-z0-9_.-]+$/);
const jsonSchemaSchema = z.lazy(() => z
    .object({
    type: z.enum(['object', 'string', 'number', 'boolean', 'array']).optional(),
    required: z.array(z.string()).optional(),
    properties: z.record(jsonSchemaSchema).optional(),
    enum: z.array(z.unknown()).optional(),
})
    .passthrough());
export const gateSchema = z
    .object({
    type: z.literal('external_decision'),
    decisionSchema: jsonSchemaSchema,
})
    .strict();
export const edgeSchema = z
    .object({
    to: idSchema,
    when: z.record(z.string(), z.unknown()).optional(),
})
    .strict();
export const nodeSchema = z
    .object({
    purpose: z.string().min(1),
    instructions: z.string().min(1).optional(),
    exec: z.enum(['inline', 'spawn', 'script']).default('inline'),
    outputSchema: jsonSchemaSchema.default({ type: 'object' }),
    gate: gateSchema.optional(),
    edges: z.array(edgeSchema).default([]),
    terminal: z.boolean().default(false),
})
    .strict();
export const graphSchema = z
    .object({
    kind: z.enum(['dispatcher', 'workflow', 'callable']).default('workflow'),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    activationHints: z.array(z.string().min(1)).default([]),
    inputSchema: jsonSchemaSchema.default({ type: 'object' }),
    outputSchema: jsonSchemaSchema.default({ type: 'object' }),
    effects: z.array(idSchema).default([]),
    entry: idSchema,
    nodes: z.record(idSchema, nodeSchema),
})
    .strict()
    .superRefine((graph, ctx) => {
    if (!graph.nodes[graph.entry]) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['entry'],
            message: `entry references unknown node: ${graph.entry}`,
        });
    }
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
        for (const edge of node.edges) {
            if (!graph.nodes[edge.to]) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['nodes', nodeId, 'edges'],
                    message: `edge references unknown node: ${edge.to}`,
                });
            }
        }
    }
});
export const workflowSchema = z
    .object({
    id: idSchema,
    version: z.string().min(1),
    entryGraph: idSchema.optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    graphs: z.record(idSchema, graphSchema),
})
    .strict()
    .superRefine((workflow, ctx) => {
    if (workflow.entryGraph && !workflow.graphs[workflow.entryGraph]) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['entryGraph'],
            message: `entryGraph references unknown graph: ${workflow.entryGraph}`,
        });
    }
    if (workflow.entryGraph && workflow.graphs[workflow.entryGraph]?.kind !== 'dispatcher') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['entryGraph'],
            message: `entryGraph must reference a dispatcher graph: ${workflow.entryGraph}`,
        });
    }
});
export const runStatusSchema = z.enum(['active', 'suspended', 'completed', 'abandoned']);
export const positionSchema = z
    .object({
    graph: idSchema,
    node: idSchema,
})
    .strict();
export const checkpointSchema = z
    .object({
    runId: idSchema,
    status: runStatusSchema,
    rootGraph: idSchema,
    workflow: z.object({ id: idSchema, version: z.string().min(1) }).strict(),
    position: positionSchema,
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    outputs: z.record(z.string(), z.unknown()).default({}),
    gateDecisions: z.record(z.string(), z.unknown()).default({}),
    resumeNote: z.string().optional(),
})
    .strict();
export const currentSchema = z
    .object({
    focusedRunId: idSchema.nullable(),
})
    .strict();
export const transitionLogEntrySchema = z
    .object({
    ts: z.string().min(1),
    op: z.enum(['start', 'step', 'decide', 'suspend', 'resume', 'abandon']),
    runId: idSchema,
    from: positionSchema.nullable(),
    to: positionSchema.nullable(),
    actor: z.string().min(1),
    input: z.unknown().nullable(),
    output: z.unknown().nullable(),
    validation: z.object({ ok: z.boolean() }).passthrough(),
    gateDecision: z.unknown().nullable(),
    reason: z.string().nullable(),
    error: z.unknown().nullable(),
})
    .strict();
