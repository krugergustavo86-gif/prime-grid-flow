import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContasBancarias } from '@/hooks/useContasBancarias';
import { getCategoriesByType } from '@/utils/categories';
import { formatCurrency, formatDateBR } from '@/utils/formatters';
import type { Transaction } from '@/types';
import { nearbyCashMovements } from '@/utils/chequeRules';
export interface MovementChoice { mode: 'link'|'create'; transactionId: string; accountId: string; date: string; category: string; }
export function FinancialMovementFields({value,onChange,transactions,amount,type,accountId,hideCategory=false}: {value:MovementChoice;onChange:(v:MovementChoice)=>void;transactions:Transaction[];amount:number;type:'Entrada'|'Saída';accountId?:string|null;hideCategory?:boolean}) {
 const accounts=useContasBancarias();
 const candidates=transactions.filter(t=>t.type===type&&Math.round(t.value*100)===Math.round(amount*100)&&t.conta_id&&(!accountId||t.conta_id===accountId)).sort((a,b)=>b.date.localeCompare(a.date));
 const nearby=nearbyCashMovements(transactions,amount,type,accountId||value.accountId,value.date);
 return <div className="space-y-3">
  <div><Label>Movimento de caixa</Label><Select value={value.mode} onValueChange={v=>onChange({...value,mode:v as MovementChoice['mode'],transactionId:''})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="link">Vincular lançamento existente</SelectItem><SelectItem value="create">Criar um lançamento com confirmação</SelectItem></SelectContent></Select></div>
  {value.mode==='link'?<div><Label>Lançamento de {formatCurrency(amount)}</Label><Select value={value.transactionId} onValueChange={id=>{const t=candidates.find(t=>t.id===id);if(t)onChange({...value,transactionId:id,accountId:t.conta_id||'',date:t.date,category:t.category});}}><SelectTrigger><SelectValue placeholder="Selecionar lançamento"/></SelectTrigger><SelectContent>{candidates.map(t=><SelectItem key={t.id} value={t.id}>{formatDateBR(t.date)} · {t.description} · {accounts.find(a=>a.id===t.conta_id)?.nome||'Conta'}</SelectItem>)}</SelectContent></Select>{candidates.length===0&&<p className="text-sm text-muted-foreground">Nenhum lançamento com esse tipo, valor e conta.</p>}</div>:<>
   <div><Label>Conta</Label><Select value={accountId||value.accountId} disabled={!!accountId} onValueChange={id=>onChange({...value,accountId:id})}><SelectTrigger><SelectValue placeholder="Selecionar conta"/></SelectTrigger><SelectContent>{accounts.map(a=><SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
   {!hideCategory&&<div><Label>Categoria</Label><Select value={value.category} onValueChange={v=>onChange({...value,category:v})}><SelectTrigger><SelectValue placeholder="Selecionar categoria"/></SelectTrigger><SelectContent>{getCategoriesByType(type).map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>}
  </>}
  <div><Label>Data do movimento</Label><Input type="date" value={value.date} disabled={value.mode==='link'&&!!value.transactionId} onChange={e=>onChange({...value,date:e.target.value})}/></div>
  {value.mode==='create'&&nearby.length>0&&<div role="alert" className="border border-warning-foreground/30 bg-warning/20 p-3 text-sm"><p>Já existe movimento do mesmo valor nesta conta em até 3 dias. Confira e vincule o existente; criar outro está bloqueado.</p>{nearby.map(t=><p key={t.id}>{formatDateBR(t.date)} · {t.description} · {formatCurrency(t.value)}</p>)}</div>}
 </div>;
}
