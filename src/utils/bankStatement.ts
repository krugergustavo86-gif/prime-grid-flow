/** Leitura de extratos bancários (OFX e CSV de Sicredi, Sicoob, Banrisul, BB, Cresol). */
export interface StatementLine {
  date: string; // YYYY-MM-DD
  description: string;
  value: number; // sempre positivo
  type: "Entrada" | "Saída";
  fitid: string | null;
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : null;
}

export function parseOFX(text: string): StatementLine[] {
  const out: StatementLine[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const raw of blocks) {
    const b = raw.split(/<\/STMTTRN>/i)[0];
    const amt = parseFloat((tag(b, "TRNAMT") || "0").replace(",", "."));
    const d = tag(b, "DTPOSTED") || "";
    if (!amt || d.length < 8) continue;
    const desc = [tag(b, "MEMO"), tag(b, "NAME")].filter(Boolean).join(" ").trim() || "Sem descrição";
    out.push({
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      description: desc.replace(/\s+/g, " "),
      value: Math.round(Math.abs(amt) * 100) / 100,
      type: amt > 0 ? "Entrada" : "Saída",
      fitid: tag(b, "FITID"),
    });
  }
  return out;
}

function parseBRNumber(s: string): number | null {
  let t = (s || "").trim().replace(/R\$\s?/i, "").replace(/\s/g, "");
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (/[DC]$/i.test(t)) { neg = /D$/i.test(t); t = t.slice(0, -1); }
  if (t.startsWith("-")) { neg = true; t = t.slice(1); }
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

function parseDate(s: string): string | null {
  const t = (s || "").trim();
  let m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function splitCSV(line: string, sep: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === sep && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(c => c.trim());
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function parseCSV(text: string): StatementLine[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sep = (lines.slice(0, 15).join("").match(/;/g)?.length ?? 0) > (lines.slice(0, 15).join("").match(/,/g)?.length ?? 0) / 2 ? ";" : ",";
  // localizar o cabeçalho (linha com "data" e "valor"/"credito"/"debito")
  let hi = lines.findIndex(l => { const n = norm(l); return n.includes("data") && (n.includes("valor") || n.includes("credito") || n.includes("debito")); });
  let idxDate = 0, idxDesc = 1, idxVal = -1, idxCred = -1, idxDeb = -1;
  if (hi >= 0) {
    const h = splitCSV(lines[hi], sep).map(norm);
    idxDate = h.findIndex(c => c.startsWith("data"));
    idxDesc = h.findIndex(c => /(descri|historico|lancamento|memo)/.test(c));
    idxVal = h.findIndex(c => c.startsWith("valor"));
    idxCred = h.findIndex(c => c.startsWith("credito") || c === "entrada");
    idxDeb = h.findIndex(c => c.startsWith("debito") || c === "saida");
    if (idxDesc < 0) idxDesc = idxDate + 1;
  } else hi = -1;
  const out: StatementLine[] = [];
  for (const l of lines.slice(hi + 1)) {
    const c = splitCSV(l, sep);
    const date = parseDate(c[idxDate] ?? "");
    if (!date) continue;
    const desc = (c[idxDesc] ?? "").replace(/\s+/g, " ").trim();
    if (/saldo/i.test(desc) && !/liquida/i.test(desc)) continue;
    let v: number | null = null;
    if (idxCred >= 0 || idxDeb >= 0) {
      const cr = parseBRNumber(c[idxCred] ?? ""); const db = parseBRNumber(c[idxDeb] ?? "");
      if (cr) v = Math.abs(cr); else if (db) v = -Math.abs(db);
    }
    if (v === null && idxVal >= 0) v = parseBRNumber(c[idxVal] ?? "");
    if (v === null) { // fallback: última coluna numérica que não seja saldo
      for (let i = c.length - 1; i > idxDesc; i--) { const n = parseBRNumber(c[i]); if (n) { v = n; break; } }
    }
    if (!v) continue;
    out.push({ date, description: desc || "Sem descrição", value: Math.round(Math.abs(v) * 100) / 100, type: v > 0 ? "Entrada" : "Saída", fitid: null });
  }
  return out;
}

export function parseStatement(fileName: string, text: string): StatementLine[] {
  return /\.ofx$/i.test(fileName) || /<OFX>/i.test(text) ? parseOFX(text) : parseCSV(text);
}

export function daysBetween(a: string, b: string) {
  return Math.abs((new Date(a + "T12:00:00").getTime() - new Date(b + "T12:00:00").getTime()) / 86400000);
}

export function addDays(d: string, n: number) {
  const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10);
}
