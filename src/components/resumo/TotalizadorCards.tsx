import { formatCurrency } from "@/utils/formatters";

interface TotalizadorCardsProps {
  saldoAnterior: number;
  acumuladoAno: number;
  caixaAtual: number;
  ano: number;
}

export function TotalizadorCards({ saldoAnterior, acumuladoAno, caixaAtual, ano }: TotalizadorCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-warning rounded-lg p-5 text-center">
        <p className="text-xs uppercase tracking-wider font-medium text-warning-foreground mb-1">
          Saldo Restante de {ano - 1}
        </p>
        <p className="text-xl font-bold tabular-nums text-warning-foreground">{formatCurrency(saldoAnterior)}</p>
      </div>
      <div className="bg-blue-100 rounded-lg p-5 text-center">
        <p className="text-xs uppercase tracking-wider font-medium text-blue-800 mb-1">
          Acumulado do Ano {ano}
        </p>
        <p className={`text-xl font-bold tabular-nums ${acumuladoAno >= 0 ? "text-blue-800" : "text-chart-saida"}`}>
          {formatCurrency(acumuladoAno)}
        </p>
      </div>
      <div className="bg-primary rounded-lg p-5 text-center">
        <p className="text-xs uppercase tracking-wider font-medium text-primary-foreground mb-1">
          💰 Caixa Atual
        </p>
        <p className="text-xl font-bold tabular-nums text-primary-foreground">{formatCurrency(caixaAtual)}</p>
      </div>
    </div>
  );
}
