import { describe, it, expect } from 'vitest';
import { chequeActions, chequeAssetValue, legacyRemainder } from './chequeRules';
describe('Cheque lifecycle and accounting', () => {
 it('allows deposit or pass only from wallet', () => { expect(chequeActions('Em carteira')).toEqual(['deposit','pass']); });
 it('allows clearance or return after deposit', () => { expect(chequeActions('Depositado')).toEqual(['clear','return']); });
 it('allows clearance or return after passing', () => { expect(chequeActions('Repassado')).toEqual(['clear','return']); });
 it('retains asset while deposited without adding cash', () => { expect(chequeAssetValue({status:'Depositado',value:1000,third_party_pending:false})).toBe(1000); });
 it('removes asset on pass', () => { expect(chequeAssetValue({status:'Repassado',value:1000,third_party_pending:true})).toBe(0); });
 it('removes asset on clearance', () => { expect(chequeAssetValue({status:'Compensado',value:1000,third_party_pending:false})).toBe(0); });
 it('restores asset when a returned cheque is back with us', () => { expect(chequeAssetValue({status:'Devolvido',value:1000,third_party_pending:false})).toBe(1000); });
 it('does not count a returned cheque still with a third party as available', () => { expect(chequeAssetValue({status:'Devolvido',value:1000,third_party_pending:true})).toBe(0); });
 it('individualizes the actual 145500 legacy without doubling patrimony', () => { expect(legacyRemainder(145500,10000)).toBe(135500); expect(legacyRemainder(145500,10000)+10000).toBe(145500); });
 it('rejects allocation above the actual legacy balance', () => { expect(() => legacyRemainder(145500,145500.01)).toThrow(); });
});
