import { RipplegraphError, type JsonSchema } from '../schema.js';
import { collectUnsupportedSchemaKeywords } from './schema-keywords.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

export function validateOutput(schema: JsonSchema, output: unknown): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  validateValue(schema, output, '', errors);
  return errors;
}

// Run-time defense-in-depth: manifests are keyword-asserted at load by the manifest
// schema, but a registered package edited on disk after registration re-enters through
// here on call start / checkpointed reload.
export function assertSupportedSchema(schema: JsonSchema, path = '$'): void {
  const issue = collectUnsupportedSchemaKeywords(schema)[0];
  if (issue) {
    const where = [path, ...issue.path].join('.');
    throw new RipplegraphError('E_UNSUPPORTED_SCHEMA_KEYWORD', `${issue.message} at ${where}`);
  }
}

function validateValue(schema: JsonSchema, value: unknown, path: string, errors: ValidationIssue[]): void {
  if (schema.type && !matchesType(schema.type, value)) {
    errors.push({ path, message: `expected ${schema.type}` });
    return;
  }
  if ('const' in schema && !jsonEqual(schema.const, value)) {
    errors.push({ path, message: `expected const ${formatExpected(schema.const)}` });
  }
  if (schema.enum && !schema.enum.some((item) => item === value)) {
    errors.push({ path, message: `expected one of ${schema.enum.join(', ')}` });
  }
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((childSchema) => {
      if (!childSchema || typeof childSchema !== 'object' || Array.isArray(childSchema)) return false;
      return validateOutput(childSchema as JsonSchema, value).length === 0;
    });
    if (matches.length !== 1) errors.push({ path, message: 'expected exactly one matching schema' });
  }
  if (schema.type === 'array' || schema.items) {
    if (!Array.isArray(value)) {
      errors.push({ path, message: 'expected array' });
      return;
    }
    if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
      value.forEach((item, index) => validateValue(schema.items as JsonSchema, item, appendArrayPath(path, index), errors));
    }
  }
  if (schema.type === 'object' || schema.properties || schema.required || schema.additionalProperties === false) {
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
    if (schema.additionalProperties === false) {
      const knownKeys = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(record)) {
        if (!knownKeys.has(key)) errors.push({ path: path ? `${path}.${key}` : key, message: 'unexpected property' });
      }
    }
  }
}

function matchesType(type: JsonSchema['type'], value: unknown): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}

function appendArrayPath(path: string, index: number): string {
  return `${path}[${index}]`;
}

function formatExpected(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
