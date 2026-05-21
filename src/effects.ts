import { RipplegraphError } from './schema.js';

export interface EffectPolicy {
  allowedEffects: string[];
}

export interface EffectCheck {
  allowed: boolean;
  requiredEffects: string[];
  missingEffects: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function checkEffects(requiredEffects: string[], policy?: EffectPolicy): EffectCheck {
  const required = unique(requiredEffects);
  const allowed = new Set(unique(policy?.allowedEffects ?? []));
  const missing = required.filter((effect) => !allowed.has(effect));
  return {
    allowed: missing.length === 0,
    requiredEffects: required,
    missingEffects: missing,
  };
}

export function assertEffectsAllowed(requiredEffects: string[], policy?: EffectPolicy, context = 'graph'): void {
  const check = checkEffects(requiredEffects, policy);
  if (check.allowed) return;
  throw new RipplegraphError(
    'E_EFFECT_NOT_ALLOWED',
    `${context} requires effects not allowed by policy: ${check.missingEffects.join(', ')}`,
  );
}
