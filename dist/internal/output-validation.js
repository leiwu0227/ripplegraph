export function validateOutput(schema, output) {
    const errors = [];
    validateValue(schema, output, '', errors);
    return errors;
}
function validateValue(schema, value, path, errors) {
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
        const record = value;
        for (const key of schema.required ?? []) {
            if (!(key in record))
                errors.push({ path: path ? `${path}.${key}` : key, message: 'required' });
        }
        for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
            if (key in record)
                validateValue(childSchema, record[key], path ? `${path}.${key}` : key, errors);
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
