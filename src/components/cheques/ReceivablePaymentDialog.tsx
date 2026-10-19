import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { refreshFinancialViews, useCheques } from '@/hooks/useCheques';
import { formatCurrency, formatDateBR } from '@/utils/formatters';
import { localFinancialDate } from '@/utils/chequeRules';
import type { Receivable, Transaction } from '@/types';
import { toast } from 'sonner';
import { FinancialMovementFields, type MovementChoice } from './FinancialMovementFields';
export function ReceivablePaymentDialog({receivable,mode,transactions,onClose}:{receivable:Receivable;mode:'pay'|'undo';transactions:Transaction[];onClose:()=>void}) {
 const {payments,loading}=useCheques();
 const [amount,setAmount]=useState(String(Math.max(0,receivable.value-receivable.paidValue))),[selected,setSelected]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false);
 const [movement,setMovement]=useState<MovementChoice>({mode:'link',accountId:'',transactionId:'',date:localFinancialDate(),category:''});
 const eligible=payments.filter(p=>p.receivable_id===receivable.id&&!p.reversed),payment=eligible.find(p=>p.id===selected);
 const original=transactions.find(t=>t.id===payment?.transaction_id);
 const execute=async()=>{
  if(!confirmed)return;
  if(mode==='undo'&&!payment)return;
  if(movement.mode==='link'&&!movement.transactionId||movement.mode==='create'&&(!movement.accountId&& !original?.conta_id||mode==='pay'&&!movement.category)){toast.error('Selecione lançamento ou conta e categoria');return;}
  setBusy(true);try{
   const r=mode==='pay'?await supabase.rpc('pay_receivable',{_id:receivable.id,_amount:Number(amount),_date:movement.date,_account:movement.accountId,_transaction:movement.transactionId||undefined,_create:movement.mode==='create',_category:movement.category}):await supabase.rpc('undo_receivable_payment',{_id:payment?.id||'',_date:movement.date,_transaction:movement.transactionId||undefined,_create:movement.mode==='create',_reason:reason});
   if(r.error){toast.error(r.error.message);return;}refreshFinancialViews();toast.success(mode==='pay'?'Baixa registrada com vínculo':'Baixa desfeita e estorno vinculado');onClose();
  }finally{setBusy(false);}
 };
 return <Dialog open onOpenChange={o=>{if(!o&&!busy)onClose();}}><DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{mode==='pay'?'Registrar pagamento':'Desfazer recebimento'}</DialogTitle></DialogHeader><p className="font-medium">{receivable.description}</p>{mode==='pay'?<div><Label>Valor do pagamento (R$)</Label><Input aria-label="Valor do pagamento" type="number" min="0.01" max={receivable.value-receivable.paidValue} step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setMovement({...movement,transactionId:''});}}/><p className="text-sm text-muted-foreground">Restante: {formatCurrency(receivable.value-receivable.paidValue)}</p></div>:<div><Label>Baixa a desfazer</Label><Select value={selected} onValueChange={id=>{setSelected(id);setMovement({...movement,transactionId:''});}}><SelectTrigger><SelectValue placeholder="Selecionar baixa vinculada"/></SelectTrigger><SelectContent>{eligible.map(p=><SelectItem key={p.id} value={p.id}>{formatDateBR(p.created_at.slice(0,10))} · {formatCurrency(p.amount)}</SelectItem>)}</SelectContent></Select>{!loading&&!eligible.length&&<p className="text-sm text-destructive">Recebimento antigo sem vínculo: precisa de conferência antes de qualquer reversão.</p>}</div>}{(mode==='pay'||payment)&&<FinancialMovementFields value={movement} onChange={setMovement} transactions={transactions} amount={mode==='pay'?Number(amount):Number(payment?.amount||0)} type={mode==='pay'?'Entrada':'Saída'} accountId={mode==='undo'?original?.conta_id:undefined} hideCategory={mode==='undo'}/>} {mode==='undo'&&<div><Label>Motivo *</Label><Textarea value={reason} onChange={e=>setReason(e.target.value)}/></div>}<label className="flex gap-2 items-start text-sm"><Checkbox checked={confirmed} onCheckedChange={v=>setConfirmed(v===true)}/><span>{movement.mode==='link'?'Conferi o movimento existente e autorizo o vínculo.':'Conferi que o movimento não existe e autorizo a criação.'} {mode==='undo'?'A baixa será revertida, preservando o lançamento original.':''}</span></label><DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy||!confirmed||mode==='undo'&&(!payment||!reason.trim())} onClick={()=>void execute()}>{busy?'Registrando…':'Confirmar'}</Button></DialogFooter></DialogContent></Dialog>;
}
