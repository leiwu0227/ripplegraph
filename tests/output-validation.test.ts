import { describe, expect, it } from 'vitest';
import { assertSupportedCallableSchema, validateOutput } from '../src/internal/output-validation.js';

describe('output validation', () => {
  it('validates callable contract keywords with object and array paths', () => {
    const schema = {
      type: 'object',
      required: ['kind', 'items'],
      additionalProperties: false,
      properties: {
        kind: { const: 'batch' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['mode'],
            additionalProperties: false,
            properties: {
              mode: {
                oneOf: [{ const: 'auto' }, { const: 'manual' }],
              },
              count: { type: 'number' },
            },
          },
        },
      },
    };

    expect(
      validateOutput(schema, {
        kind: 'batch',
        items: [{ mode: 'auto', count: 2 }],
      }),
    ).toEqual([]);

    expect(
      validateOutput(schema, {
        kind: 'other',
        items: [{ mode: 'unknown', count: 'two', extra: true }],
        extraRoot: true,
      }),
    ).toEqual([
      { path: 'kind', message: 'expected const batch' },
      { path: 'items[0].mode', message: 'expected exactly one matching schema' },
      { path: 'items[0].count', message: 'expected number' },
      { path: 'items[0].extra', message: 'unexpected property' },
      { path: 'extraRoot', message: 'unexpected property' },
    ]);
  });

  it('rejects unsupported callable schema keywords before runtime use', () => {
    const unsupportedSchemas = [
      {
        type: 'object',
        properties: {
          value: { type: 'string', pattern: '^ok$' },
        },
      },
      { oneOf: { type: 'string' } },
      { oneOf: [{ type: 'string' }, true] },
      { type: 'array', items: [{ type: 'string' }] },
      { enum: 'approved' },
    ];

    for (const schema of unsupportedSchemas) {
      let error: unknown;
      try {
        assertSupportedCallableSchema(schema);
      } catch (caught) {
        error = caught;
      }

      expect(error).toMatchObject({ code: 'E_UNSUPPORTED_SCHEMA_KEYWORD' });
    }
  });

  it('keeps existing required property and enum path behavior compatible', () => {
    expect(
      validateOutput(
        {
          type: 'object',
          required: ['decision'],
          properties: {
            decision: { enum: ['proceed', 'stop'] },
          },
        },
        { decision: 'pause' },
      ),
    ).toEqual([{ path: 'decision', message: 'expected one of proceed, stop' }]);
  });
});
