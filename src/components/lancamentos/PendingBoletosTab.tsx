import { useMemo, useState } from "react";
import { usePendingBoletos } from "@/hooks/usePendingBoletos";
import { formatCurrency, formatDateBR } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2, XCircle, FileText } from "lucide-react";

interface Props {
  readOnly?: boolean;
}

export function PendingBoletosTab({ readOnly }: Props) {
  const { boletos, loading, confirmBoleto, rejectBoleto } = usePendingBoletos();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [area, setArea] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const areas = useMemo(
    () => Array.from(new Set(boletos.map(b => b.area).filter((a): a is string => Boolean(a)))).sort(),
    [boletos]
  );

  const filtered = useMemo(() => boletos.filter(b => {
    const ref = b.dueDate || b.entryDate;
    if (from && ref < from) return false;
    if (to && ref > to) return false;
    if (area !== "all" && b.area !== area) return false;
    return true;
  }), [boletos, from, to, area]);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card border rounded-lg p-4">
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
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{filtered.length} boleto(s) aguardando confirmação</span>
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
                    {b.osNumber && <Badge variant="outline">OS #{b.osNumber}</Badge>}
                    {b.area && <Badge variant="secondary">{b.area}</Badge>}
                    <Badge>Pendente</Badge>
                  </div>
                  <p className="font-medium text-foreground mt-2 truncate">{b.clientName || b.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento: {b.dueDate ? formatDateBR(b.dueDate) : "—"}
                    {b.paymentMethod ? ` · ${b.paymentMethod}` : ""}
                  </p>
                </div>
                <p className="font-semibold text-success whitespace-nowrap">{formatCurrency(b.value)}</p>
              </div>

              {!readOnly && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={busyId === b.id}
                    onClick={() => handle(b.id, () => confirmBoleto(b))}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Confirmar Pagamento
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
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
    </div>
  );
}
