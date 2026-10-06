import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useContasBancarias } from "@/hooks/useContasBancarias";
import { usePendingBoletos, PendingBoleto } from "@/hooks/usePendingBoletos";
import { useCategoryRules } from "@/hooks/useCategoryRules";
import { notifyPendenciasChanged } from "@/hooks/usePendenciasCount";
import { parseStatement, StatementLine, daysBetween, addDays } from "@/utils/bankStatement";
import { getCategoriesByType, normTxt, A_CLASSIFICAR, FORMAS_PAGAMENTO } from "@/utils/categories";
import { formatCurrency, formatDateBR, getMonthFromDate } from "@/utils/formatters";
import { isMonthKeyLocked } from "@/utils/lockedMonths";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Status = "novo" | "boleto" | "ja_importado" | "possivel_dup" | "mes_fechado";
type Action = "inserir" | "vincular" | "ignorar";

interface ExistingTx { id: string; date: string; value: number; type: string; description: string; conta_id: string | null; fitid: string | null; import_key: string | null }

interface ReviewRow {
  key: string;
  line: StatementLine;
  importKey: string;
  status: Status;
  action: Action;
  category: string;
  cliente: string;
  forma: string;
  boleto?: PendingBoleto;
  dup?: ExistingTx;
  regra?: string;
}

const STATUS_LABEL: Record<Status, string> = {
  novo: "Novo", boleto: "Casa com boleto", ja_importado: "Já importado",
  possivel_dup: "Possível duplicado", mes_fechado: "Mês fechado",
};

function guessForma(desc: string): string {
  const d = normTxt(desc);
  if (d.includes("pix")) return "PIX";
  if (d.includes("cheque")) return "Cheque";
  if (d.includes("cobranca") || d.includes("boleto") || d.includes("titulo")) return "Boleto";
  if (d.includes("cartao") || d.includes("debito visa") || d.includes("master")) return "Cartão";
  if (d.includes("ted") || d.includes("doc") || d.includes("transf")) return "Transferência";
  if (d.includes("saque") || d.includes("deposito dinheiro")) return "Dinheiro";
  return "";
}

async function readText(file: File) {
  const buf = await file.arrayBuffer();
  const utf = new TextDecoder("utf-8").decode(buf);
  return utf.includes("\uFFFD") ? new TextDecoder("windows-1252").decode(buf) : utf;
}

export function ImportExtratoDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const contas = useContasBancarias();
  const { boletos, confirmBoleto } = usePendingBoletos();
  const { findRule } = useCategoryRules();
  const [contaId, setContaId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setRows(null); setFile(null); };
  const close = () => { reset(); onClose(); };

  const analyze = async () => {
    if (!file || !contaId) return;
    setBusy(true);
    try {
      const lines = parseStatement(file.name, await readText(file));
      if (lines.length === 0) { toast.error("Nenhuma movimentação encontrada no arquivo"); return; }
      const dates = lines.map(l => l.date).sort();
      const { data } = await supabase.from("transactions")
        .select("id,date,value,type,description,conta_id,fitid,import_key")
        .gte("date", addDays(dates[0], -5)).lte("date", addDays(dates[dates.length - 1], 5)).limit(5000);
      const existing = ((data ?? []) as ExistingTx[]).map(t => ({ ...t, value: Number(t.value) }));
      const usedBoletos = new Set<string>();
      const usedDup = new Set<string>();
      const seenKeys = new Set<string>();

      const out: ReviewRow[] = lines.map((line, i) => {
        const importKey = `${contaId}|${line.date}|${line.value.toFixed(2)}|${line.type}|${normTxt(line.description)}`;
        const base: ReviewRow = { key: `${i}`, line, importKey, status: "novo", action: "inserir", category: A_CLASSIFICAR, cliente: "", forma: guessForma(line.description) };

        if (isMonthKeyLocked(getMonthFromDate(line.date))) return { ...base, status: "mes_fechado", action: "ignorar" };
        const already = existing.some(t => (line.fitid && t.fitid === line.fitid && t.conta_id === contaId) || t.import_key === importKey) || seenKeys.has(importKey);
        seenKeys.add(importKey);
        if (already) return { ...base, status: "ja_importado", action: "ignorar" };

        if (line.type === "Entrada") {
          const b = boletos.find(bo => !usedBoletos.has(bo.id) && Math.abs(bo.value - line.value) < 0.005 &&
            daysBetween(bo.dueDate || bo.entryDate, line.date) <= 5);
          if (b) {
            usedBoletos.add(b.id);
            return { ...base, status: "boleto", boleto: b, category: b.category, cliente: b.clientName || "", forma: "Boleto" };
          }
        }
        const dup = existing.find(t => !usedDup.has(t.id) && !t.import_key && !t.fitid && t.type === line.type &&
          Math.abs(t.value - line.value) < 0.005 && daysBetween(t.date, line.date) <= 2 && (!t.conta_id || t.conta_id === contaId));
        if (dup) { usedDup.add(dup.id); return { ...base, status: "possivel_dup", dup, action: "vincular" }; }

        const rule = findRule(line.type, line.description);
        if (rule) return { ...base, category: rule.categoria, forma: rule.forma_pagamento || base.forma, regra: rule.texto_contem };
        if (line.type === "Entrada" && normTxt(line.description).includes("liquidacao cobranca")) return { ...base, forma: "Boleto" };
        return base;
      });
      setRows(out);
    } finally { setBusy(false); }
  };

  const update = (key: string, patch: Partial<ReviewRow>) => setRows(prev => prev!.map(r => r.key === key ? { ...r, ...patch } : r));

  const summary = useMemo(() => {
    const s = { inserir: 0, vincular: 0, ignorar: 0, boleto: 0, pend: 0 };
    rows?.forEach(r => { s[r.action]++; if (r.action === "inserir" && r.boleto) s.boleto++; if (r.action === "inserir" && r.category === A_CLASSIFICAR) s.pend++; });
    return s;
  }, [rows]);

  const confirm = async () => {
    if (!rows) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let ok = 0, fail = 0;
    const inserts: Record<string, unknown>[] = [];
    for (const r of rows) {
      if (r.action === "ignorar") continue;
      if (r.action === "vincular" && r.dup) {
        const { error } = await supabase.from("transactions").update({ conta_id: contaId, fitid: r.line.fitid, import_key: r.importKey }).eq("id", r.dup.id);
        error ? fail++ : ok++;
        continue;
      }
      if (r.boleto) {
        const done = await confirmBoleto({ ...r.boleto, category: r.category }, { date: r.line.date, contaId, silent: true, extra: { fitid: r.line.fitid, import_key: r.importKey } });
        done ? ok++ : fail++;
        continue;
      }
      inserts.push({
        date: r.line.date, description: r.line.description, type: r.line.type, category: r.category,
        value: r.line.value, notes: "Importado do extrato", month: getMonthFromDate(r.line.date),
        created_by: user?.id ?? null, conta_id: contaId, fitid: r.line.fitid, import_key: r.importKey,
        forma_pagamento: r.forma || null, cliente: r.cliente || null,
        regra_aplicada: r.regra ? `importacao: ${r.regra}` : null,
      });
    }
    for (let i = 0; i < inserts.length; i += 200) {
      const chunk = inserts.slice(i, i + 200);
      const { error } = await supabase.from("transactions").insert(chunk as never);
      if (error) { console.error(error); fail += chunk.length; } else ok += chunk.length;
    }
    setBusy(false);
    notifyPendenciasChanged();
    if (fail) toast.error(`${ok} gravados, ${fail} com erro`); else toast.success(`${ok} movimentações gravadas`);
    onDone();
    close();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      <DialogContent className={rows ? "max-w-6xl max-h-[90vh] overflow-y-auto" : "max-w-md"}>
        <DialogHeader><DialogTitle>{rows ? "Revisar extrato antes de gravar" : "Importar extrato"}</DialogTitle></DialogHeader>
        {!rows ? (
          <div className="space-y-3">
            <div>
              <Label>Conta bancária de origem</Label>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arquivo OFX ou CSV</Label>
              <Input className="mt-1" type="file" accept=".ofx,.csv,.txt" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <p className="text-xs text-muted-foreground">Nada é gravado antes da revisão.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge>{summary.inserir} a gravar</Badge>
              <Badge variant="secondary">{summary.boleto} baixas de boleto</Badge>
              <Badge variant="secondary">{summary.vincular} vincular a lançamento existente</Badge>
              <Badge variant="outline">{summary.ignorar} ignorados</Badge>
              <Badge variant="outline">{summary.pend} irão para Pendências</Badge>
            </div>
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.key} className="border rounded-md p-2 grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-sm">
                  <div className="md:col-span-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{formatDateBR(r.line.date)}</span>
                      <span className={r.line.type === "Entrada" ? "text-success font-semibold" : "text-destructive font-semibold"}>
                        {r.line.type === "Entrada" ? "+" : "-"}{formatCurrency(r.line.value)}
                      </span>
                      <Badge variant={r.status === "novo" ? "outline" : "secondary"}>{STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <p className="truncate" title={r.line.description}>{r.line.description}</p>
                    {r.boleto && <p className="text-xs text-muted-foreground">Boleto: {r.boleto.clientName || r.boleto.description} · venc. {r.boleto.dueDate ? formatDateBR(r.boleto.dueDate) : "—"}</p>}
                    {r.dup && <p className="text-xs text-muted-foreground">Já existe: {r.dup.description} · {formatDateBR(r.dup.date)}</p>}
                    {r.regra && <p className="text-xs text-muted-foreground">Regra: "{r.regra}"</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Select value={r.action} onValueChange={v => update(r.key, { action: v as Action })} disabled={r.status === "ja_importado" || r.status === "mes_fechado"}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inserir">{r.boleto ? "Baixar boleto" : "Gravar"}</SelectItem>
                        {r.dup && <SelectItem value="vincular">Vincular ao existente</SelectItem>}
                        <SelectItem value="ignorar">Ignorar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Select value={r.category} onValueChange={v => update(r.key, { category: v })} disabled={r.action !== "inserir"}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{getCategoriesByType(r.line.type).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Input className="md:col-span-2 h-8" placeholder="Cliente" value={r.cliente} disabled={r.action !== "inserir" || !!r.boleto} onChange={e => update(r.key, { cliente: e.target.value })} />
                  <div className="md:col-span-1">
                    <Select value={r.forma || "none"} onValueChange={v => update(r.key, { forma: v === "none" ? "" : v })} disabled={r.action !== "inserir" || !!r.boleto}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Forma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          {rows ? (
            <>
              <Button variant="outline" onClick={reset} disabled={busy}>Voltar</Button>
              <Button onClick={confirm} disabled={busy || summary.inserir + summary.vincular === 0}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Confirmar e gravar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button onClick={analyze} disabled={busy || !file || !contaId}>
                {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Revisar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
