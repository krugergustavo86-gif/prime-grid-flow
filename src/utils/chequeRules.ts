import type { Tables } from '@/integrations/supabase/types';
export type Cheque = Tables<'cheques'>;
export type ChequeEvent = Tables<'cheque_events'>;
export type ReceiptPayment = Tables<'receivable_payments'>;
export type ChequeAction = 'deposit' | 'pass' | 'clear' | 'return' | 'recover';
export const ACTION_LABELS: Record<ChequeAction, string> = { deposit: 'Depositar', pass: 'Repassar', clear: 'Confirmar compensação', return: 'Registrar devolução', recover: 'Retornar à carteira' };
export function chequeActions(status: string): ChequeAction[] {
  switch (status) {
    case 'Em carteira': return ['deposit', 'pass'];
    case 'Depositado': case 'Repassado': return ['clear', 'return'];
    case 'Compensado': return ['return'];
    case 'Devolvido': return ['recover'];
    default: return [];
  }
}
export function chequeAssetValue(c: Pick<Cheque, 'status' | 'third_party_pending' | 'value'>): number {
  return ['Repassado', 'Compensado'].includes(c.status) || (c.status === 'Devolvido' && c.third_party_pending) ? 0 : Number(c.value);
}
export function legacyRemainder(remaining: number, amount: number): number {
  const cents = Math.round(remaining * 100), allocation = Math.round(amount * 100);
  if (allocation <= 0 || allocation > cents) throw new Error('Valor excede o saldo legado');
  return (cents - allocation) / 100;
}
export function localFinancialDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
