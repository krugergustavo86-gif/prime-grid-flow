import { useState, useEffect } from "react";
import { Transaction, TransactionType } from "@/types";
import { getCategoriesByType } from "@/utils/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, "id" | "month">) => void;
  editTransaction?: Transaction | null;
}

export function TransactionModal({ open, onClose, onSave, editTransaction }: TransactionModalProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState<TransactionType>("Saída");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editTransaction) {
      setDate(new Date(editTransaction.date + "T12:00:00"));
      setType(editTransaction.type);
      setCategory(editTransaction.category);
      setDescription(editTransaction.description);
      setValue(editTransaction.value.toFixed(2).replace(".", ","));
      setNotes(editTransaction.notes || "");
    } else {
      setDate(new Date());
      setType("Saída");
      setCategory("");
      setDescription("");
      setValue("");
      setNotes("");
    }
  }, [editTransaction, open]);

  const categories = getCategoriesByType(type);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory("");
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
    });
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
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
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
