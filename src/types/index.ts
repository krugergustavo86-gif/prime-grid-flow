export interface Transaction {
  id: string;
  date: string; // "YYYY-MM-DD"
  description: string;
  type: "Saída" | "Entrada";
  category: string;
  value: number;
  notes?: string;
  month: string; // "MM/YYYY"
  created_at?: string; // ISO timestamp
}

export interface AppConfig {
  saldoAnterior: number;
  ano: number;
  numSocios: number;
}

export interface MonthSummary {
  month: string; // "01" to "12"
  label: string;
  entradas: number;
  saidas: number;
  balanco: number;
  saldoAcumulado: number;
  locked: boolean;
}

export type TransactionType = "Saída" | "Entrada";

// === MÓDULO PATRIMONIAL ===

export type AssetGroup = "Veículos" | "Imóveis/Terrenos" | "Equipamentos" | "Geradores Locados" | "Outros Ativos";

export interface Asset {
  id: string;
  group: AssetGroup;
  description: string;
  plate?: string;
  valueFipe?: number;
  valueMarket: number;
  notes?: string;
}

export type ReceivableType = "Cheque" | "Boleto" | "Serviço" | "Solar" | "Acerto" | "Outro";
export type ReceivableStatus = "A vencer" | "Vencido" | "Recebido";

export interface Receivable {
  id: string;
  description: string;
  value: number;
  paidValue: number;
  dueDate?: string;
  type: ReceivableType;
  status: ReceivableStatus;
  responsible?: string;
  notes?: string;
}

export interface DoubtfulCredit {
  id: string;
  description: string;
  value: number;
  responsible?: string;
  notes?: string;
}

export interface CashEntry {
  id: string;
  description: string;
  balance: number;
  refDate: string;
  notes?: string;
}

export type LoanType = "Capital de Giro" | "Financiamento" | "Fin. Veículo" | "Fin. Equipamento" | "Consórcio Veículo" | "Imóvel" | "Terreno" | "Pronamp" | "Boletos a Pagar" | "Outro";

export interface Loan {
  id: string;
  contract: string;
  institution: string;
  type: LoanType;
  nextPayment?: string; // "YYYY-MM-DD"
  totalInstallments: number;
  paidInstallments: number;
  installmentValue: number;
  notes?: string;
}

export type PayableStatus = "A vencer" | "Vencido" | "Agendado" | "Pago";

export interface Payable {
  id: string;
  description: string;
  value: number;
  dueDate?: string;
  scheduledDate?: string;
  responsible: string;
  status: PayableStatus;
  notes?: string;
}

export interface PatrimonyData {
  assets: Asset[];
  receivables: Receivable[];
  doubtfulCredits: DoubtfulCredit[];
  cashEntries: CashEntry[];
  loans: Loan[];
  payables: Payable[];
}
