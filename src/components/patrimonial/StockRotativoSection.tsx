import { memo, useState } from "react";
import { useStock, StockItem } from "@/hooks/useStock";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, History, Package } from "lucide-react";
import { toast } from "sonner";

interface Props {
  readOnly?: boolean;
}

function StockModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (data: Omit<StockItem, "id">) => void; initial: StockItem | null }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [notes, setNotes] = useState("");

  // reset on open
  useState(() => {});
  if (open && initial && name === "" && quantity === "" && unitValue === "") {
    setName(initial.name);
    setQuantity(String(initial.quantity));
    setUnitValue(String(initial.unitValue));
    setNotes(initial.notes || "");
  }

  const reset = () => { setName(""); setQuantity(""); setUnitValue(""); setNotes(""); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Informe o nome do item"); return; }
    const q = parseFloat(quantity);
    const v = parseFloat(unitValue);
    if (isNaN(q) || q < 0) { toast.error("Quantidade inválida"); return; }
    if (isNaN(v) || v < 0) { toast.error("Valor unitário inválido"); return; }
    onSave({ name: name.trim(), quantity: q, unitValue: v, notes: notes.trim() || undefined });
    reset();
  };

  const total = (parseFloat(quantity) || 0) * (parseFloat(unitValue) || 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar Item" : "Novo Item de Estoque"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome do item *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantidade *</Label><Input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
            <div><Label>Valor unitário *</Label><Input type="number" step="0.01" value={unitValue} onChange={e => setUnitValue(e.target.value)} /></div>
          </div>
          <div className="text-sm text-muted-foreground">Valor total: <span className="font-semibold text-primary">{formatCurrency(total)}</span></div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockRotativoSectionInner({ readOnly }: Props) {
  const { items, history, addItem, updateItem, deleteItem, totalValue } = useStock();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);

  const handleSave = async (data: Omit<StockItem, "id">) => {
    if (editing) {
      const ok = await updateItem(editing.id, data);
      if (ok) toast.success("Item atualizado");
    } else {
      const ok = await addItem(data);
      if (ok) toast.success("Item adicionado");
    }
    setEditing(null);
    setModalOpen(false);
  };

  const itemHistory = historyOpen ? history.filter(h => h.stockItemId === historyOpen) : [];
  const historyItem = historyOpen ? items.find(i => i.id === historyOpen) : null;

  return (
    <div className="bg-card rounded-lg border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">Estoque Rotativo</h3>
            <span className="text-xs text-primary font-medium">Total: {formatCurrency(totalValue)} ({items.length} {items.length === 1 ? "item" : "itens"})</span>
          </div>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }} aria-label="Adicionar item">
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Item</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Quantidade</th>
              <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">Valor Unit.</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
              {!readOnly && <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={readOnly ? 4 : 5} className="p-6 text-center text-muted-foreground">Nenhum item cadastrado.</td></tr>
            )}
            {items.map((i) => (
              <tr key={i.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{i.name}{i.notes && <div className="text-xs text-muted-foreground">{i.notes}</div>}</td>
                <td className="p-3 text-right tabular-nums">{i.quantity}</td>
                <td className="p-3 text-right tabular-nums hidden sm:table-cell">{formatCurrency(i.unitValue)}</td>
                <td className="p-3 text-right tabular-nums font-semibold text-primary">{formatCurrency(i.quantity * i.unitValue)}</td>
                {!readOnly && (
                  <td className="p-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Histórico" title="Histórico" onClick={() => setHistoryOpen(i.id)}>
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar" onClick={() => { setEditing(i); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir item?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => { const ok = await deleteItem(i.id); if (ok) toast.success("Item excluído"); }}>Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td className="p-3" colSpan={3}>Total Estoque</td>
                <td className="p-3 text-right tabular-nums text-primary">{formatCurrency(totalValue)}</td>
                {!readOnly && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <StockModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
      />

      <Dialog open={!!historyOpen} onOpenChange={(o) => !o && setHistoryOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Histórico — {historyItem?.name}</DialogTitle></DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {itemHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma alteração de quantidade registrada.</p>
            ) : itemHistory.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm border-b pb-2">
                <span className="text-muted-foreground">{new Date(h.changedAt).toLocaleString("pt-BR")}</span>
                <span className="tabular-nums">{h.oldQuantity} → <span className="font-semibold">{h.newQuantity}</span></span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const StockRotativoSection = memo(StockRotativoSectionInner);
