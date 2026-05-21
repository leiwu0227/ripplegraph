import { RipplegraphError } from '../schema.js';
export function validateOutput(schema, output) {
    const errors = [];
    validateValue(schema, output, '', errors);
    return errors;
}
const SUPPORTED_SCHEMA_KEYWORDS = new Set([
    'type',
    'required',
    'properties',
    'enum',
    'const',
    'oneOf',
    'items',
    'additionalProperties',
]);
export function assertSupportedCallableSchema(schema, path = '$') {
    for (const key of Object.keys(schema)) {
        if (!SUPPORTED_SCHEMA_KEYWORDS.has(key)) {
            throw new RipplegraphError('E_UNSUPPORTED_SCHEMA_KEYWORD', `unsupported schema keyword at ${path}: ${key}`);
        }
    }
    if ('additionalProperties' in schema && schema.additionalProperties !== false) {
        throw new RipplegraphError('E_UNSUPPORTED_SCHEMA_KEYWORD', `unsupported schema keyword value at ${path}.additionalProperties: only false is supported`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
        assertSupportedCallableSchema(childSchema, `${path}.properties.${key}`);
    }
    if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
        assertSupportedCallableSchema(schema.items, `${path}.items`);
    }
    if (Array.isArray(schema.oneOf)) {
        schema.oneOf.forEach((childSchema, index) => {
            if (childSchema && typeof childSchema === 'object' && !Array.isArray(childSchema)) {
                assertSupportedCallableSchema(childSchema, `${path}.oneOf[${index}]`);
            }
        });
    }
}
function validateValue(schema, value, path, errors) {
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
            if (!childSchema || typeof childSchema !== 'object' || Array.isArray(childSchema))
                return false;
            return validateOutput(childSchema, value).length === 0;
        });
        if (matches.length !== 1)
            errors.push({ path, message: 'expected exactly one matching schema' });
    }
    if (schema.type === 'array' || schema.items) {
        if (!Array.isArray(value)) {
            errors.push({ path, message: 'expected array' });
            return;
        }
        if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
            value.forEach((item, index) => validateValue(schema.items, item, appendArrayPath(path, index), errors));
        }
    }
    if (schema.type === 'object' || schema.properties || schema.required || schema.additionalProperties === false) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            errors.push({ path, message: 'expected object' });
            return;
        }
        const record = value;
        for (const key of schema.required ?? []) {
            if (!(key in record))
                errors.push({ path: path ? `${path}.${key}` : key, message: 'required' });
        }
        for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
            if (key in record)
                validateValue(childSchema, record[key], path ? `${path}.${key}` : key, errors);
        }
        if (schema.additionalProperties === false) {
            const knownKeys = new Set(Object.keys(schema.properties ?? {}));
            for (const key of Object.keys(record)) {
                if (!knownKeys.has(key))
                    errors.push({ path: path ? `${path}.${key}` : key, message: 'unexpected property' });
            }
        }
    }
}
function matchesType(type, value) {
    if (type === 'array')
        return Array.isArray(value);
    if (type === 'object')
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    return typeof value === type;
}
function appendArrayPath(path, index) {
    return `${path}[${index}]`;
}
function formatExpected(value) {
    if (typeof value === 'string')
        return value;
    return JSON.stringify(value);
}
function jsonEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}
