// The single source of truth for what validateOutput actually honors. Both the
// load-time manifest refinement (schema.ts) and the run-time callable assertion
// (output-validation.ts) derive from this set, so the asserted keywords can never
// drift from the validator's real support.
export const SUPPORTED_SCHEMA_KEYWORDS = new Set([
    'type',
    'required',
    'properties',
    'enum',
    'const',
    'oneOf',
    'items',
    'additionalProperties',
]);
export function collectUnsupportedSchemaKeywords(schema, path = []) {
    const issues = [];
    for (const key of Object.keys(schema)) {
        if (!SUPPORTED_SCHEMA_KEYWORDS.has(key)) {
            issues.push({ path, message: `unsupported schema keyword: ${key}` });
        }
    }
    if ('type' in schema && !['object', 'string', 'number', 'boolean', 'array'].includes(String(schema.type))) {
        issues.push(unsupportedValue([...path, 'type']));
    }
    if ('required' in schema && (!Array.isArray(schema.required) || schema.required.some((key) => typeof key !== 'string'))) {
        issues.push(unsupportedValue([...path, 'required']));
    }
    if ('properties' in schema && !isSchemaRecord(schema.properties)) {
        issues.push(unsupportedValue([...path, 'properties']));
    }
    else {
        for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
            issues.push(...collectUnsupportedSchemaKeywords(childSchema, [...path, 'properties', key]));
        }
    }
    if ('enum' in schema && !Array.isArray(schema.enum)) {
        issues.push(unsupportedValue([...path, 'enum']));
    }
    if ('additionalProperties' in schema && schema.additionalProperties !== false) {
        issues.push(unsupportedValue([...path, 'additionalProperties']));
    }
    if ('items' in schema && !isSchemaObject(schema.items)) {
        issues.push(unsupportedValue([...path, 'items']));
    }
    if (isSchemaObject(schema.items)) {
        issues.push(...collectUnsupportedSchemaKeywords(schema.items, [...path, 'items']));
    }
    if ('oneOf' in schema && (!Array.isArray(schema.oneOf) || schema.oneOf.some((childSchema) => !isSchemaObject(childSchema)))) {
        issues.push(unsupportedValue([...path, 'oneOf']));
    }
    else if (Array.isArray(schema.oneOf)) {
        schema.oneOf.forEach((childSchema, index) => {
            issues.push(...collectUnsupportedSchemaKeywords(childSchema, [...path, 'oneOf', index]));
        });
    }
    return issues;
}
function unsupportedValue(path) {
    return { path, message: 'unsupported schema keyword value' };
}
function isSchemaObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function isSchemaRecord(value) {
    return isSchemaObject(value) && Object.values(value).every(isSchemaObject);
}
