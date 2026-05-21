import { RipplegraphError } from './schema.js';
function unique(values) {
    return [...new Set(values)];
}
export function checkEffects(requiredEffects, policy) {
    const required = unique(requiredEffects);
    const allowed = new Set(unique(policy?.allowedEffects ?? []));
    const missing = required.filter((effect) => !allowed.has(effect));
    return {
        allowed: missing.length === 0,
        requiredEffects: required,
        missingEffects: missing,
    };
}
export function assertEffectsAllowed(requiredEffects, policy, context = 'graph') {
    const check = checkEffects(requiredEffects, policy);
    if (check.allowed)
        return;
    throw new RipplegraphError('E_EFFECT_NOT_ALLOWED', `${context} requires effects not allowed by policy: ${check.missingEffects.join(', ')}`);
}
