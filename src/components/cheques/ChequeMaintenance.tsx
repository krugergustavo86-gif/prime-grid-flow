import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/utils/formatters';
import type { Cheque } from '@/utils/chequeRules';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export function ChequeMaintenance({ cheque, edit, remove }: {
 cheque: Cheque; edit: (c: Cheque, data: Json) => Promise<boolean>; remove: (c: Cheque, reason: string) => Promise<boolean>;
}) {
 const [mode, setMode] = useState<'edit' | 'delete' | null>(null);
 const [busy, setBusy] = useState(false);
 const [reason, setReason] = useState('');
 const [draft, setDraft] = useState({ number: cheque.number, bank: cheque.bank, issuer: cheque.issuer, delivered_by: cheque.delivered_by, value: String(cheque.value), received_date: cheque.received_date, due_date: cheque.due_date, notes: cheque.notes });
 const open = (next: 'edit' | 'delete') => {
  setDraft({ number: cheque.number, bank: cheque.bank, issuer: cheque.issuer, delivered_by: cheque.delivered_by, value: String(cheque.value), received_date: cheque.received_date, due_date: cheque.due_date, notes: cheque.notes });
  setReason(''); setMode(next);
 };
 const submit = async () => {
  if (busy || !mode) return;
  setBusy(true);
  try {
   const ok = mode === 'edit' ? await edit(cheque, { ...draft, value: Number(draft.value) }) : await remove(cheque, reason);
   if (ok) { toast.success(mode === 'edit' ? 'Cheque atualizado, sem movimentar o caixa' : 'Cheque excluído, sem movimentar o caixa'); setMode(null); }
  } finally { setBusy(false); }
 };
 return <>
  <Button variant="outline" size="sm" onClick={() => open('edit')} aria-label={`Editar cheque ${cheque.number}`}><Pencil className="mr-1 h-4 w-4"/>Editar</Button>
  <Button variant="outline" size="sm" onClick={() => open('delete')} aria-label={`Excluir cheque ${cheque.number}`}><Trash2 className="mr-1 h-4 w-4"/>Excluir</Button>
  <Dialog open={mode !== null} onOpenChange={o => { if (!o && !busy) setMode(null); }}>
   <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{mode === 'edit' ? 'Editar' : 'Excluir'} cheque {cheque.number}</DialogTitle></DialogHeader>
    {mode === 'edit' ? <>
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{([['number','Número do cheque'],['bank','Banco'],['issuer','Emitente'],['delivered_by','Quem entregou'],['value','Valor (R$)'],['received_date','Data de recebimento'],['due_date','Vencimento']] as const).map(([key,label]) => <div key={key}><Label htmlFor={`edit-${cheque.id}-${key}`}>{label} *</Label><Input id={`edit-${cheque.id}-${key}`} aria-label={label} type={key.includes('date') ? 'date' : key === 'value' ? 'number' : 'text'} step={key === 'value' ? '0.01' : undefined} value={draft[key]} onChange={e => setDraft({...draft,[key]:e.target.value})}/></div>)}</div>
     <div><Label>Observações</Label><Textarea aria-label="Observações" value={draft.notes} onChange={e => setDraft({...draft,notes:e.target.value})}/></div>
     {cheque.legacy_id && <p className="text-sm text-muted-foreground">Origem: saldo legado. Alterar o valor ajustará o legado pela diferença, sem movimentar o caixa.</p>}
    </> : <>
     <p>Excluir cheque {cheque.number} de {formatCurrency(cheque.value)}, entregue por {cheque.delivered_by}?</p>
     <p className="text-sm text-muted-foreground">{cheque.legacy_id ? `${formatCurrency(cheque.value)} voltará ao saldo legado. ` : ''}O caixa não será alterado. O registro da exclusão ficará em Atividades.</p>
     <div><Label>Motivo da exclusão *</Label><Textarea aria-label="Motivo da exclusão" value={reason} onChange={e => setReason(e.target.value)}/></div>
    </>}
    <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setMode(null)}>Cancelar</Button><Button variant={mode === 'delete' ? 'destructive' : 'default'} disabled={busy || (mode === 'delete' && !reason.trim())} onClick={() => void submit()}>{busy ? 'Salvando…' : mode === 'delete' ? 'Confirmar exclusão' : 'Salvar alterações'}</Button></DialogFooter>
   </DialogContent>
  </Dialog>
 </>;
}