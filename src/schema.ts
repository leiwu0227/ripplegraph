import { z } from 'zod';

export class RipplegraphError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'RipplegraphError';
  }
}

export const idSchema = z.string().min(1).regex(/^[A-Za-z0-9_.-]+$/);

const jsonSchemaSchema: z.ZodType<JsonSchema> = z.lazy(() =>
  z
    .object({
      type: z.enum(['object', 'string', 'number', 'boolean', 'array']).optional(),
      required: z.array(z.string()).optional(),
      properties: z.record(jsonSchemaSchema).optional(),
      enum: z.array(z.unknown()).optional(),
    })
    .passthrough(),
);

export interface JsonSchema {
  type?: 'object' | 'string' | 'number' | 'boolean' | 'array';
  required?: string[];
  properties?: Record<string, JsonSchema>;
  enum?: unknown[];
  [key: string]: unknown;
}

export const decisionSourceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('human'),
      label: z.string().min(1).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('tool'),
      tool: idSchema,
      label: z.string().min(1).optional(),
    })
    .strict(),
]);

export const interactionKindSchema = z.enum(['choice', 'free_text', 'confirm', 'form']);

export const interactionChoiceSchema = z
  .object({
    label: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
    description: z.string().min(1).optional(),
  })
  .strict();

export const interactionFollowUpSchema = z
  .object({
    when: z.string().min(1),
    id: idSchema,
    kind: interactionKindSchema,
    source: idSchema.optional(),
  })
  .strict();

export const interactionSchema = z
  .object({
    id: idSchema,
    kind: interactionKindSchema,
    prompt: z.string().min(1),
    renderVia: idSchema.optional(),
    choices: z.array(interactionChoiceSchema).optional(),
    schema: jsonSchemaSchema.optional(),
    followUp: interactionFollowUpSchema.optional(),
  })
  .strict()
  .superRefine((interaction, ctx) => {
    if ((interaction.kind === 'choice' || interaction.kind === 'confirm') && (interaction.choices?.length ?? 0) === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['choices'],
        message: `${interaction.kind} interactions require at least one choice`,
      });
    }
    if (interaction.kind === 'form' && interaction.schema?.type !== 'object') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schema'],
        message: 'form interactions require an object schema',
      });
    }
  });

export const interruptSchema = z
  .object({
    requiresUserTurn: z.literal(true),
    reason: z.string().min(1).optional(),
  })
  .strict();

export const validatorContractSchema = z
  .object({
    id: idSchema,
    purpose: z.string().min(1).optional(),
    inputSchema: jsonSchemaSchema.optional(),
    outputSchema: jsonSchemaSchema.optional(),
  })
  .strict();

export const toolContractSchema = z
  .object({
    id: idSchema,
    command: z.string().min(1),
    purpose: z.string().min(1).optional(),
    effects: z.array(idSchema).optional(),
    inputSchema: jsonSchemaSchema.optional(),
    outputSchema: jsonSchemaSchema.optional(),
    validator: idSchema.optional(),
  })
  .strict();

export const sideChannelActionSchema = z
  .object({
    id: idSchema,
    purpose: z.string().min(1),
    commandRef: idSchema.optional(),
    effects: z.array(idSchema).optional(),
    outputSchema: jsonSchemaSchema.optional(),
    validator: idSchema.optional(),
  })
  .strict();

export const gateSchema = z
  .object({
    type: z.literal('external_decision'),
    decisionSource: decisionSourceSchema.optional(),
    interaction: interactionSchema.optional(),
    decisionSchema: jsonSchemaSchema,
  })
  .strict();

export const workflowRefSchema = z
  .object({
    graphId: idSchema,
    inputMap: z.record(z.string().min(1)).optional(),
    outputMap: z.record(z.string().min(1)).optional(),
  })
  .strict();

export const startRequirementSchema = z
  .object({
    id: idSchema,
    describe: z.string().min(1),
    unmetRedirect: idSchema.optional(),
    unmetMessage: z.string().min(1).optional(),
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
    exec: z.literal('inline').default('inline'),
    outputSchema: jsonSchemaSchema.default({ type: 'object' }),
    interaction: interactionSchema.optional(),
    interrupt: interruptSchema.optional(),
    gate: gateSchema.optional(),
    workflowRef: workflowRefSchema.optional(),
    sideChannelActions: z.array(sideChannelActionSchema).optional(),
    toolContract: toolContractSchema.optional(),
    validators: z.array(validatorContractSchema).optional(),
    operatorContext: z.record(z.string(), z.unknown()).optional(),
    edges: z.array(edgeSchema).default([]),
    terminal: z.boolean().default(false),
    // undefined inherits graph.effects; [] overrides to require nothing; non-empty array overrides with that set.
    effects: z.array(idSchema).optional(),
  })
  .strict()
  .superRefine((node, ctx) => {
    if (node.workflowRef && node.gate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['workflowRef'],
        message: 'workflowRef nodes cannot also define gate',
      });
    }
  });

const graphFieldsSchema = z
  .object({
    kind: z.enum(['dispatcher', 'workflow', 'callable']).default('workflow'),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    activationHints: z.array(z.string().min(1)).default([]),
    requires: z.array(startRequirementSchema).default([]),
    inputSchema: jsonSchemaSchema.default({ type: 'object' }),
    outputSchema: jsonSchemaSchema.default({ type: 'object' }),
    effects: z.array(idSchema).default([]),
    entry: idSchema,
    nodes: z.record(idSchema, nodeSchema),
  })
  .strict();

function validateGraphReferences(graph: z.infer<typeof graphFieldsSchema>, ctx: z.RefinementCtx): void {
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
}

export const graphSchema = graphFieldsSchema.superRefine(validateGraphReferences);

export const graphPackageManifestSchema = graphFieldsSchema
  .extend({
    id: idSchema,
    version: z.string().min(1),
  })
  .superRefine((manifest, ctx) => {
    validateGraphReferences(manifest, ctx);
  });

export const workflowSchema = z
  .object({
    id: idSchema,
    version: z.string().min(1),
    entryGraph: idSchema.optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
  })
  .strict();

export const runStatusSchema = z.enum(['active', 'suspended', 'completed', 'abandoned']);
export const callStatusSchema = z.enum(['active', 'completed', 'failed']);

export const positionSchema = z
  .object({
    graph: idSchema,
    node: idSchema,
  })
  .strict();

export const graphSourceSchema = z
  .object({
    kind: z.literal('package'),
    graphId: idSchema,
    graphVersion: z.string().min(1),
    packagePath: z.string().min(1),
  })
  .strict();

export const checkpointStackFrameSchema = z
  .object({
    parent: z
      .object({
        graph: idSchema,
        node: idSchema,
        graphSource: graphSourceSchema.optional(),
        scope: z.string(),
      })
      .strict(),
    child: graphSourceSchema,
    scope: idSchema,
    enteredAt: z.string().min(1),
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
    graphSource: graphSourceSchema.optional(),
    stack: z.array(checkpointStackFrameSchema).default([]),
    frameCounter: z.number().int().nonnegative().default(0),
    resumeNote: z.string().optional(),
  })
  .strict()
  .superRefine((checkpoint, ctx) => {
    const expected = checkpoint.stack.at(-1)?.child.graphId ?? checkpoint.graphSource?.graphId ?? checkpoint.rootGraph;
    if (checkpoint.position.graph !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['position', 'graph'],
        message: `position.graph (${checkpoint.position.graph}) must match active graph (${expected})`,
      });
    }
  });

export const currentSchema = z
  .object({
    focusedRunId: idSchema.nullable(),
  })
  .strict();

export const transitionLogEntrySchema = z
  .object({
    ts: z.string().min(1),
    op: z.enum(['start', 'step', 'decide', 'suspend', 'resume', 'abandon', 'side_channel', 'reconcile']),
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

export const callableCheckpointSchema = z
  .object({
    callId: idSchema,
    status: callStatusSchema,
    graphId: idSchema,
    graphVersion: z.string().min(1),
    packagePath: z.string().min(1),
    position: positionSchema,
    input: z.unknown(),
    outputs: z.record(z.string(), z.unknown()).default({}),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    finalOutput: z.unknown().optional(),
    outputArtifact: z.string().optional(),
  })
  .strict();

export const callableTransitionLogEntrySchema = z
  .object({
    ts: z.string().min(1),
    op: z.enum(['start', 'step', 'complete', 'fail']),
    callId: idSchema,
    from: positionSchema.nullable(),
    to: positionSchema.nullable(),
    input: z.unknown().nullable(),
    output: z.unknown().nullable(),
    validation: z.object({ ok: z.boolean() }).passthrough(),
    error: z.unknown().nullable(),
  })
  .strict();

export type Workflow = z.infer<typeof workflowSchema>;
export type GraphPackageManifest = z.infer<typeof graphPackageManifestSchema>;
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
