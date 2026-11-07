export interface OrdemServico {
  numero: string; cliente: string | null; area: string | null; status: string | null;
  data_abertura: string | null; data_execucao: string | null; valor: number | null;
}
export const dataLocal = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
export function fimMes(mes: string) {
  const [ano, numero] = mes.split("-").map(Number);
  const dia = new Date(ano, numero, 0).getDate();
  return `${mes}-${String(dia).padStart(2, "0")}`;
}
export function diasEntre(a: string, b: string) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
}
export function resumoOS(ordens: OrdemServico[], mes: string, area = "Todas", hoje = dataLocal()) {
  const referencia = fimMes(mes) < hoje ? fimMes(mes) : hoje;
  const base = ordens.filter(o => !/cancel/i.test(o.status ?? "") && (area === "Todas" || o.area === area));
  const executadas = base.filter(o => o.data_execucao?.startsWith(mes) && o.data_execucao <= referencia);
  const abertas = base.filter(o => o.data_abertura?.startsWith(mes) && o.data_abertura <= referencia);
  const comValor = executadas.filter(o => Number(o.valor) > 0);
  const semValor = executadas.filter(o => Number(o.valor ?? 0) === 0);
  const negativos = executadas.filter(o => Number(o.valor) < 0);
  const valor = comValor.reduce((s, o) => s + Number(o.valor), 0);
  const backlog = base.filter(o => o.data_abertura && o.data_abertura <= referencia && (!o.data_execucao || o.data_execucao > referencia));
  const backlog30 = backlog.filter(o => o.data_abertura && diasEntre(o.data_abertura, referencia) > 30);
  const tempos = executadas.flatMap(o => o.data_abertura && o.data_execucao && o.data_execucao >= o.data_abertura ? [diasEntre(o.data_abertura, o.data_execucao)] : []);
  return { referencia, executadas, abertas, comValor, semValor, negativos, valor, backlog, backlog30,
    ticket: comValor.length ? valor / comValor.length : null,
    ticketComZero: executadas.length ? executadas.reduce((s, o) => s + Number(o.valor ?? 0), 0) / executadas.length : null,
    tempo: tempos.length ? tempos.reduce((s, v) => s + v, 0) / tempos.length : null };
}