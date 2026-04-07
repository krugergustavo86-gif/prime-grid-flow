import { useState } from "react";
import { Asset, AssetGroup } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Car, Building, Wrench, Zap, Package } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface Props {
  assets: Asset[];
  addAsset: (a: Omit<Asset, "id">) => void;
  updateAsset: (id: string, u: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
}

const GROUPS: { key: AssetGroup; label: string; icon: React.ElementType }[] = [
  { key: "Veículos", label: "🚗 Veículos", icon: Car },
  { key: "Imóveis/Terrenos", label: "🏗 Imóveis e Terrenos", icon: Building },
  { key: "Equipamentos", label: "⚙ Equipamentos", icon: Wrench },
  { key: "Geradores Locados", label: "🔋 Geradores Locados", icon: Zap },
  { key: "Outros Ativos", label: "🏪 Outros Ativos", icon: Package },
];

const CHART_COLORS = [
  "hsl(219, 52%, 25%)", "hsl(162, 76%, 24%)", "hsl(222, 45%, 37%)",
  "hsl(0, 55%, 41%)", "hsl(35, 80%, 50%)",
];

export function AssetsTab({ assets, addAsset, updateAsset, deleteAsset }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [defaultGroup, setDefaultGroup] = useState<AssetGroup>("Veículos");

  const groupTotals = GROUPS.map(g => ({
    name: g.key,
    value: assets.filter(a => a.group === g.key).reduce((s, a) => s + a.valueMarket, 0),
  })).filter(g => g.value > 0);

  const totalPhysical = assets.reduce((s, a) => s + a.valueMarket, 0);

  const handleSave = (data: Omit<Asset, "id">) => {
    if (editing) {
      updateAsset(editing.id, data);
      toast.success("Ativo atualizado");
    } else {
      addAsset(data);
      toast.success("Ativo adicionado");
    }
    setEditing(null);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Donut chart */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-semibold text-foreground mb-3">Distribuição do Patrimônio</h3>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={groupTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {groupTotals.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 text-sm">
            {groupTotals.map((g, i) => (
              <div key={g.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-muted-foreground">{g.name}</span>
                <span className="font-medium tabular-nums ml-auto">{formatCurrency(g.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accordions */}
      <Accordion type="multiple" defaultValue={["Veículos"]}>
        {GROUPS.map((group) => {
          const groupAssets = assets.filter(a => a.group === group.key);
          const subtotal = groupAssets.reduce((s, a) => s + a.valueMarket, 0);
          const isVehicle = group.key === "Veículos";

          return (
            <AccordionItem key={group.key} value={group.key}>
              <AccordionTrigger className="text-base font-semibold">
                <div className="flex items-center justify-between w-full pr-4">
                  <span>{group.label} ({groupAssets.length})</span>
                  <span className="tabular-nums text-sm font-medium text-muted-foreground">{formatCurrency(subtotal)}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-2">
                  <Button size="sm" variant="outline" onClick={() => { setDefaultGroup(group.key); setEditing(null); setModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium text-muted-foreground">Descrição</th>
                        {isVehicle && <th className="text-left p-2 font-medium text-muted-foreground">Placa</th>}
                        {isVehicle && <th className="text-right p-2 font-medium text-muted-foreground">FIPE</th>}
                        <th className="text-right p-2 font-medium text-muted-foreground">Mercado</th>
                        <th className="text-right p-2 font-medium text-muted-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupAssets.map((a) => (
                        <tr key={a.id} className="border-b hover:bg-muted/30">
                          <td className="p-2">{a.description}</td>
                          {isVehicle && <td className="p-2 text-muted-foreground">{a.plate || "—"}</td>}
                          {isVehicle && <td className="p-2 text-right tabular-nums text-muted-foreground">{a.valueFipe != null ? formatCurrency(a.valueFipe) : "—"}</td>}
                          <td className="p-2 text-right tabular-nums font-medium">{formatCurrency(a.valueMarket)}</td>
                          <td className="p-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(a); setDefaultGroup(a.group); setModalOpen(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Excluir ativo?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteAsset(a.id); toast.success("Ativo excluído"); }}>Excluir</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="bg-primary/10 rounded-lg border border-primary/20 p-4 flex items-center justify-between">
        <span className="font-bold text-primary">Patrimônio Físico Total</span>
        <span className="text-xl font-bold tabular-nums text-primary">{formatCurrency(totalPhysical)}</span>
      </div>

      <AssetModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} initial={editing} defaultGroup={defaultGroup} />
    </div>
  );
}

function AssetModal({ open, onClose, onSave, initial, defaultGroup }: { open: boolean; onClose: () => void; onSave: (d: Omit<Asset, "id">) => void; initial: Asset | null; defaultGroup: AssetGroup }) {
  const [group, setGroup] = useState<AssetGroup>(initial?.group || defaultGroup);
  const [description, setDescription] = useState(initial?.description || "");
  const [plate, setPlate] = useState(initial?.plate || "");
  const [valueFipe, setValueFipe] = useState(initial?.valueFipe?.toString() || "");
  const [valueMarket, setValueMarket] = useState(initial?.valueMarket?.toString() || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  useState(() => {
    if (open) {
      setGroup(initial?.group || defaultGroup);
      setDescription(initial?.description || "");
      setPlate(initial?.plate || "");
      setValueFipe(initial?.valueFipe?.toString() || "");
      setValueMarket(initial?.valueMarket?.toString() || "");
      setNotes(initial?.notes || "");
    }
  });

  const handleSubmit = () => {
    if (!description || !valueMarket) { toast.error("Preencha os campos obrigatórios"); return; }
    onSave({
      group, description,
      plate: plate || undefined,
      valueFipe: valueFipe ? parseFloat(valueFipe) : undefined,
      valueMarket: parseFloat(valueMarket) || 0,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar" : "Novo"} Ativo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Grupo</Label>
            <Select value={group} onValueChange={v => setGroup(v as AssetGroup)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GROUPS.map(g => <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Descrição *</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          {group === "Veículos" && (
            <>
              <div><Label>Placa</Label><Input value={plate} onChange={e => setPlate(e.target.value)} /></div>
              <div><Label>Valor FIPE (R$)</Label><Input type="number" value={valueFipe} onChange={e => setValueFipe(e.target.value)} /></div>
            </>
          )}
          <div><Label>Valor de Mercado (R$) *</Label><Input type="number" value={valueMarket} onChange={e => setValueMarket(e.target.value)} /></div>
          <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
