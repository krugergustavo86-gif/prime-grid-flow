import { describe, expect, it } from 'vitest';
import { canCorrectLegacyBalance } from './legacyBalanceRules';
describe('Legacy balance correction', () => {
 it('accepts the new balance alone, without a reason or extra confirmation', () => { expect(canCorrectLegacyBalance('145498.77')).toBe(true); });
 it('accepts a zero outstanding balance', () => { expect(canCorrectLegacyBalance('0')).toBe(true); });
 it('rejects a negative outstanding balance', () => { expect(canCorrectLegacyBalance('-1')).toBe(false); });
 it('rejects missing or nonfinite amounts', () => { for (const value of ['', 'Infinity', 'NaN']) expect(canCorrectLegacyBalance(value)).toBe(false); });
 it('rejects fractions smaller than a cent', () => { expect(canCorrectLegacyBalance('1.234')).toBe(false); });
});