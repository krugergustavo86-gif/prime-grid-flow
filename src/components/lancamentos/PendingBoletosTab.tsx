import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePendingBoletos } from "@/hooks/usePendingBoletos";
import { formatCurrency, formatDateBR } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, Loader2, XCircle, FileText, Split } from "lucide-react";
import type { PendingBoleto } from "@/hooks/usePendingBoletos";
import { Checkbox } from "@/components/ui/checkbox";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { isMonthKeyLocked } from "@/utils/lockedMonths";
import { getMonthFromDate } from "@/utils/formatters";

function addMonths(dateStr: string, months: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(y, m - 1 + months, 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(d, last));
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}

interface Props {
  readOnly?: boolean;
}

export function PendingBoletosTab({ readOnly }: Props) {
  const { boletos, loading, confirmBoleto, rejectBoleto, splitBoleto } = usePendingBoletos();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [area, setArea] = useState("all");
  const [category, setCategory] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [splitTarget, setSplitTarget] = useState<PendingBoleto | null>(null);
  const [dueDates, setDueDates] = useState<string[]>([]);
  const [splitting, setSplitting] = useState(false);
  const contas = useContasBancarias();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [receive, setReceive] = useState<PendingBoleto[] | null>(null);
  const [recDate, setRecDate] = useState(new Date().toISOString().slice(0, 10));
  const [recConta, setRecConta] = useState("");
  const [receiving, setReceiving] = useState(false);

  const toggleSel = (id: string) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doReceive = async () => {
    if (!receive || !recConta) return;
    if (isMonthKeyLocked(getMonthFromDate(recDate))) return;
    setReceiving(true);
    let ok = 0;
    for (const b of receive) {
      if (await confirmBoleto(b, { date: recDate, contaId: recConta, silent: true })) ok++;
    }
    setReceiving(false);
    setSel(new Set());
    setReceive(null);
    toast.success(`${ok} boleto(s) recebido(s) e lançado(s) no caixa`);
  };

  const openSplit = (b: PendingBoleto) => {
    const start = b.dueDate || b.entryDate;
    setSplitTarget(b);
    setDueDates([start, addMonths(start, 1)]);
  };

  const setCount = (n: number) => {
    if (!splitTarget || n < 2 || n > 36) return;
    const start = splitTarget.dueDate || splitTarget.entryDate;
    setDueDates(prev => Array.from({ length: n }, (_, i) => prev[i] || addMonths(start, i)));
  };

  const parcelValues = useMemo(() => {
    if (!splitTarget) return [];
    const n = dueDates.length;
    const total = Math.round(splitTarget.value * 100);
    const base = Math.floor(total / n);
    return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - base * (n - 1) : base) / 100);
  }, [splitTarget, dueDates]);

  const handleSplit = async () => {
    if (!splitTarget) return;
    setSplitting(true);
    const ok = await splitBoleto(splitTarget, dueDates);
    setSplitting(false);
    if (ok) setSplitTarget(null);
  };

  const areas = useMemo(
    () => Array.from(new Set(boletos.map(b => b.area).filter((a): a is string => Boolean(a)))).sort(),
    [boletos]
  );

  const categories = useMemo(
    () => Array.from(new Set(boletos.map(b => b.category).filter(Boolean))).sort(),
    [boletos]
  );

  const filtered = useMemo(() => boletos.filter(b => {
    const ref = b.dueDate || b.entryDate;
    if (from && ref < from) return false;
    if (to && ref > to) return false;
    if (area !== "all" && b.area !== area) return false;
    if (category !== "all" && b.category !== category) return false;
    return true;
  }), [boletos, from, to, area, category]);

  const total = filtered.reduce((s, b) => s + b.value, 0);

  const handle = async (id: string, fn: () => Promise<boolean>) => {
    setBusyId(id);
    await fn();
    setBusyId(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card border rounded-lg p-4">
        <div className="space-y-1">
          <Label htmlFor="boleto-from">De</Label>
          <Input id="boleto-from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="boleto-to">Até</Label>
          <Input id="boleto-to" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Área</Label>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>


      <div className="flex items-center justify-between text-sm gap-2 flex-wrap">
        <span className="text-muted-foreground">{filtered.length} boleto(s) aguardando confirmação</span>
        {!readOnly && filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-muted-foreground">
              <Checkbox checked={sel.size > 0 && filtered.every(b => sel.has(b.id))}
                onCheckedChange={() => setSel(prev => filtered.every(b => prev.has(b.id)) ? new Set() : new Set(filtered.map(b => b.id)))} />
              Todos
            </label>
            <Button size="sm" disabled={sel.size === 0} onClick={() => setReceive(filtered.filter(b => sel.has(b.id)))}>
              <CheckCircle className="h-4 w-4 mr-1" /> Marcar recebidos ({sel.size})
            </Button>
          </div>
        )}
        <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhum boleto pendente.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className="border rounded-lg p-4 bg-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!readOnly && <Checkbox checked={sel.has(b.id)} onCheckedChange={() => toggleSel(b.id)} aria-label="Selecionar boleto" />}
                    {b.osNumber && <Badge variant="outline">OS #{b.osNumber}</Badge>}
                    {b.area && <Badge variant="secondary">{b.area}</Badge>}
                    {b.category && <Badge variant="secondary">{b.category}</Badge>}
                    <Badge>Pendente</Badge>
                  </div>
                  <p className="font-medium text-foreground mt-2 truncate">{b.clientName || b.description}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {b.dueDate ? formatDateBR(b.dueDate) : "—"}
                    {b.paymentMethod ? ` · ${b.paymentMethod}` : ""}
                  </p>

                </div>
                <p className="font-semibold text-success whitespace-nowrap">{formatCurrency(b.value)}</p>
              </div>

              {!readOnly && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="flex-1 min-w-[140px]"
                    disabled={busyId === b.id}
                    onClick={() => setReceive([b])}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Recebido
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-w-[100px]"
                    disabled={busyId === b.id}
                    onClick={() => openSplit(b)}
                  >
                    <Split className="h-4 w-4 mr-1" /> Parcelar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 min-w-[100px]"
                    disabled={busyId === b.id}
                    onClick={() => handle(b.id, () => rejectBoleto(b.id))}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!receive} onOpenChange={o => !o && setReceive(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Marcar como recebido</DialogTitle></DialogHeader>
          {receive && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {receive.length} boleto(s) · {formatCurrency(receive.reduce((s, b) => s + b.value, 0))}. Cada um vira uma entrada com cliente, categoria e forma Boleto.
              </p>
              <div><Label>Data do recebimento</Label><Input className="mt-1" type="date" value={recDate} onChange={e => setRecDate(e.target.value)} /></div>
              {isMonthKeyLocked(getMonthFromDate(recDate)) && <p className="text-xs text-destructive">Este mês está fechado.</p>}
              <div>
                <Label>Conta</Label>
                <Select value={recConta} onValueChange={setRecConta}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                  <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceive(null)}>Cancelar</Button>
            <Button onClick={doReceive} disabled={receiving || !recConta || isMonthKeyLocked(getMonthFromDate(recDate))}>
              {receiving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Confirmar recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!splitTarget} onOpenChange={o => !o && setSplitTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Parcelar boleto</DialogTitle>
          </DialogHeader>
          {splitTarget && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {splitTarget.clientName || splitTarget.description} · Total{" "}
                <span className="font-semibold text-foreground">{formatCurrency(splitTarget.value)}</span>
              </div>
              <div className="space-y-1">
                <Label htmlFor="parcelas">Número de parcelas</Label>
                <Input
                  id="parcelas"
                  type="number"
                  min={2}
                  max={36}
                  value={dueDates.length}
                  onChange={e => setCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {dueDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs w-20 shrink-0 text-muted-foreground">
                      Parcela {i + 1}/{dueDates.length}
                    </span>
                    <Input
                      type="date"
                      value={d}
                      onChange={e =>
                        setDueDates(prev => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                      }
                    />
                    <span className="text-xs w-24 text-right shrink-0">{formatCurrency(parcelValues[i] ?? 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSplitTarget(null)}>Cancelar</Button>
            <Button onClick={handleSplit} disabled={splitting}>
              {splitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar parcelas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
