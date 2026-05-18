import type { JsonSchema } from '../schema.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

export function validateOutput(schema: JsonSchema, output: unknown): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  validateValue(schema, output, '', errors);
  return errors;
}

function validateValue(schema: JsonSchema, value: unknown, path: string, errors: ValidationIssue[]): void {
  if (schema.type && !matchesType(schema.type, value)) {
    errors.push({ path, message: `expected ${schema.type}` });
    return;
  }
  if (schema.enum && !schema.enum.some((item) => item === value)) {
    errors.push({ path, message: `expected one of ${schema.enum.join(', ')}` });
  }
  if (schema.type === 'object' || schema.properties || schema.required) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push({ path, message: 'expected object' });
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) errors.push({ path: path ? `${path}.${key}` : key, message: 'required' });
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in record) validateValue(childSchema, record[key], path ? `${path}.${key}` : key, errors);
    }
  }
}

function matchesType(type: JsonSchema['type'], value: unknown): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}
