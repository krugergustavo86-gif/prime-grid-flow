import { describe, expect, it } from 'vitest';
import { canCorrectLegacyBalance } from './legacyBalanceRules';
describe('Legacy balance correction', () => {
 it('requires an explicit confirmation', () => { expect(canCorrectLegacyBalance('145498.77','Correção',false)).toBe(false); });
 it('requires a nonempty reason', () => { expect(canCorrectLegacyBalance('145498.77','  ',true)).toBe(false); });
 it('accepts a zero outstanding balance', () => { expect(canCorrectLegacyBalance('0','Correção',true)).toBe(true); });
 it('rejects a negative outstanding balance', () => { expect(canCorrectLegacyBalance('-1','Correção',true)).toBe(false); });
 it('rejects missing or nonfinite amounts', () => { for (const value of ['', 'Infinity', 'NaN']) expect(canCorrectLegacyBalance(value,'Correção',true)).toBe(false); });
 it('accepts a monetary correction with two decimal places', () => { expect(canCorrectLegacyBalance('145498.77','Correção',true)).toBe(true); });
 it('rejects fractions smaller than a cent', () => { expect(canCorrectLegacyBalance('1.234','Correção',true)).toBe(false); });
});