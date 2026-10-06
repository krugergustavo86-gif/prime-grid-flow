import { useState, useEffect } from "react";
import { Transaction, TransactionType } from "@/types";
import { getCategoriesByType, FORMAS_PAGAMENTO } from "@/utils/categories";
import { useCategoryRules } from "@/hooks/useCategoryRules";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, "id" | "month">) => void;
  editTransaction?: Transaction | null;
}

const DRAFT_KEY = "primecash:transaction-draft";

export function TransactionModal({ open, onClose, onSave, editTransaction }: TransactionModalProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState<TransactionType>("Saída");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [forma, setForma] = useState<string>("");
  const [catTouched, setCatTouched] = useState(false);
  const [ruleHint, setRuleHint] = useState<string | null>(null);
  const { findRule } = useCategoryRules();
  const [adding, setAdding] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const { categories: customCats, addCategory } = useCustomCategories();

  useEffect(() => {
    if (!open) return;
    if (editTransaction) {
      setDate(new Date(editTransaction.date + "T12:00:00"));
      setType(editTransaction.type);
      setCategory(editTransaction.category);
      setDescription(editTransaction.description);
      setValue(editTransaction.value.toFixed(2).replace(".", ","));
      setNotes(editTransaction.notes || "");
      setForma(editTransaction.forma_pagamento || "");
      setCatTouched(true);
      setRuleHint(null);
      return;
    }
    // Novo lançamento: tenta restaurar rascunho
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.description || d.value) {
          if (window.confirm("Você tem um rascunho não salvo. Deseja continuar de onde parou?")) {
            setDate(d.date ? new Date(d.date) : new Date());
            setType(d.type || "Saída");
            setCategory(d.category || "");
            setDescription(d.description || "");
            setValue(d.value || "");
            setNotes(d.notes || "");
            return;
          }
          sessionStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch { /* ignore */ }
    setDate(new Date());
    setType("Saída");
    setCategory("");
    setDescription("");
    setValue("");
    setNotes("");
    setForma("");
    setCatTouched(false);
    setRuleHint(null);
  }, [editTransaction, open]);

  // Regra por fornecedor: preenche categoria (editável) ao digitar a descrição
  useEffect(() => {
    if (!open || editTransaction || catTouched) return;
    const r = findRule(type, description);
    if (r) {
      setCategory(r.categoria);
      if (r.forma_pagamento && !forma) setForma(r.forma_pagamento);
      setRuleHint(r.texto_contem);
    } else if (ruleHint) {
      setRuleHint(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, type, open, editTransaction, catTouched, findRule]);

  // Auto-save rascunho (apenas para novos)
  useEffect(() => {
    if (!open || editTransaction) return;
    if (!description && !value) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        date: date.toISOString(), type, category, description, value, notes,
      }));
    } catch { /* ignore */ }
  }, [open, editTransaction, date, type, category, description, value, notes]);

  const builtIn = getCategoriesByType(type);
  const custom = customCats.filter(c => c.type === type).map(c => c.name);
  const categories = Array.from(new Set([...builtIn, ...custom]));

  const handleAddCategory = async () => {
    const created = await addCategory(newCatName, type);
    if (created) {
      setCategory(created.name);
      setNewCatName("");
      setAdding(false);
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory("");
    setCatTouched(false);
  };

  const parseValue = (): number => {
    const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const handleSave = () => {
    const numValue = parseValue();
    if (!description.trim() || !category || numValue <= 0) return;

    const dateStr = format(date, "yyyy-MM-dd");
    onSave({
      date: dateStr,
      description: description.trim(),
      type,
      category,
      value: numValue,
      notes: notes.trim() || undefined,
      forma_pagamento: forma || null,
    });
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    onClose();
  };

  const isValid = description.trim() && category && parseValue() > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTransaction ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Tipo</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={type === "Saída" ? "default" : "outline"}
                className={cn("flex-1", type === "Saída" && "bg-chart-saida hover:bg-chart-saida/90")}
                onClick={() => handleTypeChange("Saída")}
              >
                🔴 Saída
              </Button>
              <Button
                type="button"
                variant={type === "Entrada" ? "default" : "outline"}
                className={cn("flex-1", type === "Entrada" && "bg-chart-entrada hover:bg-chart-entrada/90")}
                onClick={() => handleTypeChange("Entrada")}
              >
                🟢 Entrada
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Categoria</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setAdding(v => !v)}>
                <Plus className="h-3 w-3 mr-1" /> {adding ? "Cancelar" : "Nova"}
              </Button>
            </div>
            {adding ? (
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Nome da nova categoria"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                  autoFocus
                />
                <Button type="button" onClick={handleAddCategory} disabled={!newCatName.trim()}>Criar</Button>
              </div>
            ) : (
              <Select value={category} onValueChange={(v) => { setCategory(v); setCatTouched(true); setRuleHint(null); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {ruleHint && <p className="text-xs text-muted-foreground mt-1">Sugerida pela regra "{ruleHint}" — pode alterar.</p>}
          </div>

          <div>
            <Label>Forma de pagamento</Label>
            <Select value={forma || "none"} onValueChange={(v) => setForma(v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Não informada" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informada</SelectItem>
                {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição</Label>
            <Input
              className="mt-1"
              placeholder="Nome do cliente ou fornecedor"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label>Valor (R$)</Label>
            <Input
              className="mt-1 tabular-nums"
              placeholder="0,00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              className="mt-1"
              placeholder="Anotações adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!isValid}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
