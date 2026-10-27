import { describe, it, expect } from 'vitest';
import { chequeActions, chequeAssetValue, legacyRemainder, canCashCheque, nearbyCashMovements, canMaintainCheque, type Cheque, type ChequeEvent, type ReceiptPayment } from './chequeRules';
describe('Cheque lifecycle and accounting', () => {
 const wallet = {id:'wallet',receivable_id:'mirror',status:'Em carteira',account_id:null,credited_transaction_id:null,payable_id:null,recipient:null,supplier:null,third_party_pending:false} as Cheque;
 it('allows maintenance of an untouched wallet cheque', () => { expect(canMaintainCheque(wallet,[],[])).toBe(true); });
 it('blocks maintenance after deposit even after returning to wallet', () => { expect(canMaintainCheque(wallet,[{cheque_id:'wallet',from_status:'Em carteira',to_status:'Depositado',transaction_id:null,payable_id:null} as ChequeEvent],[])).toBe(false); });
 it('blocks maintenance when a cash credit is linked', () => { expect(canMaintainCheque({...wallet,credited_transaction_id:'credit'},[],[])).toBe(false); });
 it('blocks maintenance when supplier debt is linked', () => { expect(canMaintainCheque({...wallet,payable_id:'debt'},[],[])).toBe(false); });
 it('blocks maintenance after a receivable payment', () => { expect(canMaintainCheque(wallet,[],[{receivable_id:'mirror'} as ReceiptPayment])).toBe(false); });
 it('blocks maintenance outside Em carteira', () => { expect(canMaintainCheque({...wallet,status:'Compensado'},[],[])).toBe(false); });
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
 it('allows quick cash only for wallet and deposited cheques', () => {
  expect(['Em carteira','Depositado','Repassado','Compensado','Devolvido'].filter(canCashCheque)).toEqual(['Em carteira','Depositado']);
 });
 it('finds same account/type/value within three days without mixing other movements', () => {
  const base = {id:'1',date:'2026-10-19',description:'Cheque',type:'Entrada' as const,category:'Geradores',value:10,month:'10/2026',conta_id:'a'};
  const list = [base,{...base,id:'2',date:'2026-10-18'},{...base,id:'3',conta_id:'b'},{...base,id:'4',value:11},{...base,id:'5',type:'Saída' as const}];
  expect(nearbyCashMovements(list,10,'Entrada','a','2026-10-22').map(t=>t.id)).toEqual(['1']);
 });
});
