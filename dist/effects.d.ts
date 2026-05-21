export interface EffectPolicy {
    allowedEffects: string[];
}
export interface EffectCheck {
    allowed: boolean;
    requiredEffects: string[];
    missingEffects: string[];
}
export declare function checkEffects(requiredEffects: string[], policy?: EffectPolicy): EffectCheck;
export declare function assertEffectsAllowed(requiredEffects: string[], policy?: EffectPolicy, context?: string): void;
