import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/utils/formatters';
import { canCorrectLegacyBalance } from '@/utils/legacyBalanceRules';
import type { Receivable } from '@/types';
import { toast } from 'sonner';

export function LegacyBalanceEditor({ legacy, edit }: { legacy: Receivable; edit: (id: string, expected: number, value: number, reason: string, confirmed: boolean) => Promise<boolean> }) {
 const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
 const [value, setValue] = useState(''), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false), [expected, setExpected] = useState(0);
 const valid = canCorrectLegacyBalance(value, reason, confirmed) && Number(value) !== expected;
 const submit = async () => {
  if (busy || !valid) return;
  setBusy(true);
  try {
   if (await edit(legacy.id, expected, Number(value), reason.trim(), confirmed)) {
    toast.success('Saldo legado atualizado, sem movimentar o caixa'); setOpen(false);
   }
  } finally { setBusy(false); }
 };
 return <>
  <Button variant="outline" onClick={() => { const balance = legacy.value - legacy.paidValue; setExpected(balance); setValue(String(balance)); setReason(''); setConfirmed(false); setOpen(true); }}><Pencil className="mr-2 h-4 w-4"/>Editar saldo legado</Button>
  <Dialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}>
   <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>Editar saldo legado</DialogTitle></DialogHeader>
    <p className="text-sm">{legacy.description} · Saldo atual: <strong>{formatCurrency(expected)}</strong></p>
    <div><Label htmlFor="legacy-correction-value">Novo saldo (R$) *</Label><Input id="legacy-correction-value" type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} disabled={busy}/></div>
    <div><Label htmlFor="legacy-correction-reason">Motivo da correção *</Label><Textarea id="legacy-correction-reason" value={reason} onChange={e => setReason(e.target.value)} disabled={busy}/></div>
    <p className="text-sm text-muted-foreground">Esta correção altera somente o saldo antigo e os totais de recebíveis. Não altera cheques individuais nem lança valores no caixa. Para registrar um recebimento, use “Baixar do saldo legado”.</p>
    <label className="flex items-start gap-2 text-sm"><Checkbox aria-label="Confirmar correção do saldo legado" checked={confirmed} disabled={busy} onCheckedChange={v => setConfirmed(v === true)}/><span>Confirmo o novo saldo e autorizo a correção registrada em Atividades, sem movimentar o caixa.</span></label>
    <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={busy || !valid} onClick={() => void submit()}>{busy ? 'Salvando…' : 'Confirmar correção'}</Button></DialogFooter>
   </DialogContent>
  </Dialog>
 </>;
}