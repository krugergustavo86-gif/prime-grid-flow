import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/utils/formatters';
import { canCorrectLegacyBalance } from '@/utils/legacyBalanceRules';
import type { Receivable } from '@/types';
import { toast } from 'sonner';

export function LegacyBalanceEditor({ legacy, edit, iconOnly = false }: { legacy: Receivable; edit: (id: string, expected: number, value: number) => Promise<boolean>; iconOnly?: boolean }) {
 const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
 const [value, setValue] = useState(''), [expected, setExpected] = useState(0);
 const valid = canCorrectLegacyBalance(value) && Number(value) !== expected;
 const submit = async () => {
  if (busy || !valid) return;
  setBusy(true);
  try {
   if (await edit(legacy.id, expected, Number(value))) {
    toast.success('Saldo legado atualizado, sem movimentar o caixa'); setOpen(false);
   }
  } finally { setBusy(false); }
 };
 return <>
  <Button variant={iconOnly ? 'ghost' : 'outline'} size={iconOnly ? 'icon' : 'default'} className={iconOnly ? 'h-8 w-8' : undefined} title="Editar saldo legado" aria-label={`Editar saldo legado: ${legacy.description}`} onClick={() => { const balance = legacy.value - legacy.paidValue; setExpected(balance); setValue(String(balance)); setOpen(true); }}><Pencil className={iconOnly ? 'h-3.5 w-3.5' : 'mr-2 h-4 w-4'}/>{!iconOnly && 'Editar saldo legado'}</Button>
  <Dialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}>
   <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>Editar saldo legado</DialogTitle></DialogHeader>
    <p className="text-sm">{legacy.description} · Saldo atual: <strong>{formatCurrency(expected)}</strong></p>
    <div><Label htmlFor="legacy-correction-value">Novo saldo (R$) *</Label><Input id="legacy-correction-value" type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} disabled={busy}/></div>
    <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={busy || !valid} onClick={() => void submit()}>{busy ? 'Salvando…' : 'Salvar'}</Button></DialogFooter>
   </DialogContent>
  </Dialog>
 </>;
}