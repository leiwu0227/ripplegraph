import { describe, expect, it } from 'vitest';
import { assertEffectsAllowed, checkEffects, RipplegraphError } from '../src/index.js';

describe('effect policy', () => {
  it('checks declared effects against explicit allow-list policy', () => {
    expect(checkEffects([], undefined)).toEqual({
      allowed: true,
      requiredEffects: [],
      missingEffects: [],
    });
    expect(checkEffects(['read_repo', 'write_files', 'read_repo'], { allowedEffects: ['read_repo', 'read_repo'] })).toEqual({
      allowed: false,
      requiredEffects: ['read_repo', 'write_files'],
      missingEffects: ['write_files'],
    });
    expect(checkEffects(['write_files', 'read_repo'], { allowedEffects: ['read_repo', 'write_files'] })).toMatchObject({
      allowed: true,
      missingEffects: [],
    });

    expect(() => assertEffectsAllowed(['network'], undefined, 'graph summarize-ticket')).toThrow(RipplegraphError);
    expect(() => assertEffectsAllowed(['network'], undefined, 'graph summarize-ticket')).toThrow(
      'graph summarize-ticket requires effects not allowed by policy: network',
    );
  });
});
