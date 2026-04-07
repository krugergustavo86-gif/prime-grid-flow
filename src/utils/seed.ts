import { Transaction, PatrimonyData } from "@/types";

export function generateId(): string {
  return crypto.randomUUID();
}

export const LOCKED_MONTHS = ["01", "02", "03"];

export const LOCKED_BALANCES: Record<string, number> = {
  "01": -246208.13,
  "02": 6358.93,
  "03": 195974.62,
};

export function createSeedData(ano: number): Transaction[] {
  return [
    { id: generateId(), date: `${ano}-01-31`, description: "Consolidado Janeiro - Entradas", type: "Entrada", category: "Energia Solar", value: 1965652.77, month: `01/${ano}` },
    { id: generateId(), date: `${ano}-01-31`, description: "Consolidado Janeiro - Saídas", type: "Saída", category: "Solar Kits", value: 2211860.90, month: `01/${ano}` },
    { id: generateId(), date: `${ano}-02-28`, description: "Consolidado Fevereiro - Entradas", type: "Entrada", category: "Energia Solar", value: 1937195.87, month: `02/${ano}` },
    { id: generateId(), date: `${ano}-02-28`, description: "Consolidado Fevereiro - Saídas", type: "Saída", category: "Solar Kits", value: 1930836.94, month: `02/${ano}` },
    { id: generateId(), date: `${ano}-03-31`, description: "Consolidado Março - Entradas", type: "Entrada", category: "Energia Solar", value: 1500000.00, month: `03/${ano}` },
    { id: generateId(), date: `${ano}-03-31`, description: "Consolidado Março - Saídas", type: "Saída", category: "Solar Kits", value: 1304025.38, month: `03/${ano}` },
  ];
}

export const DEFAULT_CONFIG = {
  saldoAnterior: 409000,
  ano: 2026,
  numSocios: 4,
};

export function createPatrimonySeed(): PatrimonyData {
  return {
    assets: [
      // Veículos
      { id: generateId(), group: "Veículos", description: "Uno 2P 2013 – Predial", plate: "ITP3028", valueFipe: 23830, valueMarket: 16000 },
      { id: generateId(), group: "Veículos", description: "Uno 2P 2007 – Predial", plate: "MFW0G91", valueFipe: 12570, valueMarket: 8000 },
      { id: generateId(), group: "Veículos", description: "Gol 2011 4P – Paulo", plate: "IRS4G44", valueFipe: 21206, valueMarket: 20000 },
      { id: generateId(), group: "Veículos", description: "Uno 4P 2008 – Panty/Suporte", plate: "IOY9H82", valueFipe: 15580, valueMarket: 10000 },
      { id: generateId(), group: "Veículos", description: "Palio 2014 – Reserva", plate: "MLZ7763", valueFipe: 25820, valueMarket: 19000 },
      { id: generateId(), group: "Veículos", description: "Kwid 4P 2018 – SP Carlos/Nathan", plate: "IYL2C45", valueFipe: 31100, valueMarket: 27000 },
      { id: generateId(), group: "Veículos", description: "Sandero 4P 2012 – Mateus", plate: "AUV7A81", valueFipe: 25510, valueMarket: 25000 },
      { id: generateId(), group: "Veículos", description: "Strada 2016 – Suporte", plate: "IXF5D02", valueFipe: 47390, valueMarket: 47000 },
      { id: generateId(), group: "Veículos", description: "Sandero 2016 – Ribas/Uruguaiana", plate: "PXC4F13", valueFipe: 30800, valueMarket: 30800 },
      { id: generateId(), group: "Veículos", description: "Ducato 2019 – Solar Pinalli", plate: "QPW3F14", valueFipe: 138468, valueMarket: 110000 },
      { id: generateId(), group: "Veículos", description: "Sprinter Van 2012 – Reserva", plate: "MKB7F68", valueFipe: 89112, valueMarket: 60000 },
      { id: generateId(), group: "Veículos", description: "Sprinter Baú 2012 – Solar Varella", plate: "ITA3354", valueFipe: 68580, valueMarket: 100000 },
      { id: generateId(), group: "Veículos", description: "Ranger 2012 – Plantão", plate: "MJH5D53", valueFipe: 60368, valueMarket: 58000 },
      { id: generateId(), group: "Veículos", description: "Iveco Cesto – I.P.", plate: "AOW1H49", valueFipe: 62826, valueMarket: 120000 },
      { id: generateId(), group: "Veículos", description: "Marrua Cesto 2008 – I.P.", plate: "APX6B14", valueFipe: 62783, valueMarket: 120000 },
      { id: generateId(), group: "Veículos", description: "Constelation Munck 2007 – Redes", plate: "INP2A75", valueFipe: 116594, valueMarket: 320000 },
      { id: generateId(), group: "Veículos", description: "Iveco Munck 2011 – Redes", plate: "IST8I66", valueFipe: 101691, valueMarket: 180000 },
      { id: generateId(), group: "Veículos", description: "Cargo 2012 – Redes", plate: "PEK4J92", valueFipe: 156298, valueMarket: 350000 },
      { id: generateId(), group: "Veículos", description: "Sandero 2020 – Gabriel", plate: "PTR3I87", valueFipe: 45000, valueMarket: 40000 },
      { id: generateId(), group: "Veículos", description: "HR – Solar Maicon", plate: "IPX5A57", valueFipe: 72000, valueMarket: 72000 },
      { id: generateId(), group: "Veículos", description: "Onix 2020 Sedan – Sergio", plate: "RAC1i69", valueFipe: 66000, valueMarket: 60000 },
      { id: generateId(), group: "Veículos", description: "Saveiro 2026 01 – Comercial", plate: "TQX4I91", valueFipe: 100000, valueMarket: 113000 },
      { id: generateId(), group: "Veículos", description: "Saveiro 2026 02 – Fab. Geradores", plate: "TQX4I89", valueFipe: 100000, valueMarket: 113000 },
      { id: generateId(), group: "Veículos", description: "Reboque 01 – Gerador 15KVA 2024", plate: "JCY3F73", valueFipe: 0, valueMarket: 7900 },
      { id: generateId(), group: "Veículos", description: "Reboque 02 – Gerador 125KVA 2024", plate: "JCY8J77", valueFipe: 0, valueMarket: 19990 },
      // Imóveis/Terrenos
      { id: generateId(), group: "Imóveis/Terrenos", description: "Pavilhão Principal", valueMarket: 1350000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "Casa 02", valueMarket: 130000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "Terreno 1 – Beira da Lagoa", valueMarket: 30000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "Terreno 2 – Beira da Lagoa", valueMarket: 30000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "Casa 03 – Prime/Carol Perusso", valueMarket: 125000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "50% Bar dos Amigos", valueMarket: 200000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "50% Terreno Prime Beach", valueMarket: 250000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "Terreno Loteamento Ipiranga", valueMarket: 110000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "TCL T.C.", valueMarket: 120000 },
      { id: generateId(), group: "Imóveis/Terrenos", description: "Pavilhão Geradores", valueMarket: 450000 },
      // Equipamentos
      { id: generateId(), group: "Equipamentos", description: "Analisador de Energia", valueMarket: 5000 },
      { id: generateId(), group: "Equipamentos", description: "Computadores T.A + T.C", valueMarket: 20000 },
      { id: generateId(), group: "Equipamentos", description: "Celulares", valueMarket: 15000 },
      { id: generateId(), group: "Equipamentos", description: "Gerador 01 MWM", valueMarket: 35000 },
      { id: generateId(), group: "Equipamentos", description: "Gerador Kadu", valueMarket: 75000 },
      { id: generateId(), group: "Equipamentos", description: "Ferramentas Oficina Gerador", valueMarket: 40000 },
      { id: generateId(), group: "Equipamentos", description: "Varroa Rotativa Lavagem", valueMarket: 5000 },
      { id: generateId(), group: "Equipamentos", description: "Gerador 170 KVA – Prime", valueMarket: 130000 },
      { id: generateId(), group: "Equipamentos", description: "Gerador Edson 25 KVA", valueMarket: 35000 },
      // Geradores Locados
      { id: generateId(), group: "Geradores Locados", description: "50 KVA Lacoste – Em produção", valueMarket: 50000 },
      { id: generateId(), group: "Geradores Locados", description: "Pasqualoto 112 KVA", valueMarket: 18000 },
      { id: generateId(), group: "Geradores Locados", description: "75 KVA – Gloria", valueMarket: 15000 },
      { id: generateId(), group: "Geradores Locados", description: "112 KVA – Maravilha", valueMarket: 18000 },
      { id: generateId(), group: "Geradores Locados", description: "150 KVA – Água Santo Anjo", valueMarket: 21000 },
      { id: generateId(), group: "Geradores Locados", description: "45 KVA – Antena", valueMarket: 10000 },
      { id: generateId(), group: "Geradores Locados", description: "112 KVA – Hugo", valueMarket: 15000 },
      { id: generateId(), group: "Geradores Locados", description: "30 KVA – CTG João Sobrinho", valueMarket: 9000 },
      // Outros Ativos
      { id: generateId(), group: "Outros Ativos", description: "Casa da Ferragem – Participação (50%)", valueMarket: 400000 },
      { id: generateId(), group: "Outros Ativos", description: "Inversores Solar", valueMarket: 70000 },
    ],
    receivables: [
      { id: generateId(), description: "Carteira de Cheques", value: 353888.00, dueDate: "10/03/2026", type: "Cheque", status: "A vencer" },
      { id: generateId(), description: "Carteira de Boletos", value: 2615532.24, type: "Boleto", status: "A vencer" },
      { id: generateId(), description: "Serviços Caminhão", value: 979791.94, type: "Serviço", status: "A vencer" },
      { id: generateId(), description: "Solar + BESS", value: 2278195.00, dueDate: "10/03/2026", type: "Solar", status: "A vencer" },
      { id: generateId(), description: "Acerto Rodrigo", value: 147000.00, type: "Acerto", status: "A vencer", notes: "Pagamento mensal – abater conforme parcelas Rodrigo + financ. Cresol" },
    ],
    doubtfulCredits: [
      { id: generateId(), description: "Boletos em Atraso", value: 248000, responsible: "Financeiro" },
      { id: generateId(), description: "Ben Gabriel – Usina Solar", value: 86500, responsible: "Alana", notes: "Acompanhar Alana" },
      { id: generateId(), description: "Geradores", value: 10000, responsible: "Alana", notes: "Acompanhar Alana" },
    ],
    cashEntries: [
      { id: generateId(), description: "Saldo em Conta", balance: 81372.16, refDate: "Abr/2026" },
      { id: generateId(), description: "Aplicação Sicredi", balance: 3187.57, refDate: "Abr/2026", notes: "Aplicação financeira" },
      { id: generateId(), description: "Tiago K 1,5%", balance: 41000.00, refDate: "Abr/2026", notes: "Juros: R$ 604,27/mês" },
      { id: generateId(), description: "Rodrigo K 1,5%", balance: 40000.00, refDate: "Abr/2026", notes: "Juros: R$ 615,00/mês" },
      { id: generateId(), description: "Saldo Empréstimo Ronaldinho", balance: 17220.00, refDate: "Abr/2026", notes: "48x R$ 615,00 — Pago: 20/48" },
      { id: generateId(), description: "Terreno Anderson", balance: 49000.00, refDate: "Abr/2026", notes: "49x R$ 1.000,00" },
      { id: generateId(), description: "Casa da Ferragem", balance: 55316.61, refDate: "Abr/2026", notes: "9x R$ 6.146,39" },
    ],
    loans: [
      { id: generateId(), contract: "Capital Giro AA", institution: "Sicoob", type: "Capital de Giro", nextPayment: "2026-04-04", totalInstallments: 61, paidInstallments: 31, installmentValue: 1100.00 },
      { id: generateId(), contract: "Finan. Bens e Serviços", institution: "Sicoob", type: "Financiamento", nextPayment: "2026-04-13", totalInstallments: 60, paidInstallments: 33, installmentValue: 3873.00 },
      { id: generateId(), contract: "Capital Giro", institution: "Sicoob", type: "Capital de Giro", nextPayment: "2026-05-02", totalInstallments: 43, paidInstallments: 17, installmentValue: 6300.00 },
      { id: generateId(), contract: "Giro Pronanp", institution: "Sicredi", type: "Capital de Giro", nextPayment: "2026-05-02", totalInstallments: 47, paidInstallments: 45, installmentValue: 2127.67 },
      { id: generateId(), contract: "Constelation", institution: "Sicredi", type: "Fin. Veículo", nextPayment: "2026-05-05", totalInstallments: 54, paidInstallments: 36, installmentValue: 6005.00 },
      { id: generateId(), contract: "Terreno Prime Beach", institution: "Parc. Dir.", type: "Terreno", nextPayment: "2026-04-09", totalInstallments: 82, paidInstallments: 23, installmentValue: 1700.00 },
      { id: generateId(), contract: "Pronamp Sicoob AR", institution: "Sicoob", type: "Pronamp", nextPayment: "2026-04-28", totalInstallments: 36, paidInstallments: 10, installmentValue: 2476.99 },
      { id: generateId(), contract: "Gerador 01 Prime", institution: "Cresol", type: "Fin. Equipamento", nextPayment: "2026-05-25", totalInstallments: 60, paidInstallments: 20, installmentValue: 3190.02 },
      { id: generateId(), contract: "Parcelas Pavilhão", institution: "Cheques", type: "Imóvel", nextPayment: "2026-04-13", totalInstallments: 60, paidInstallments: 31, installmentValue: 4999.00 },
      { id: generateId(), contract: "Consórcio Ducato 1/3", institution: "Consórcio", type: "Consórcio Veículo", nextPayment: "2026-04-11", totalInstallments: 66, paidInstallments: 51, installmentValue: 652.90 },
      { id: generateId(), contract: "Consórcio Ducato 2/3", institution: "Consórcio", type: "Consórcio Veículo", nextPayment: "2026-04-11", totalInstallments: 66, paidInstallments: 32, installmentValue: 598.13 },
      { id: generateId(), contract: "Consórcio Ducato 3/3", institution: "Consórcio", type: "Consórcio Veículo", nextPayment: "2026-04-11", totalInstallments: 66, paidInstallments: 32, installmentValue: 652.90 },
      { id: generateId(), contract: "Terreno Ipiranga", institution: "Parc. Dir.", type: "Terreno", nextPayment: "2026-05-01", totalInstallments: 70, paidInstallments: 21, installmentValue: 1000.00 },
      { id: generateId(), contract: "Ford Cargo", institution: "Sicredi", type: "Fin. Veículo", nextPayment: "2026-04-10", totalInstallments: 48, paidInstallments: 17, installmentValue: 9740.00 },
      { id: generateId(), contract: "FGI Sicredi", institution: "FGI Sicredi", type: "Financiamento", nextPayment: "2026-05-05", totalInstallments: 64, paidInstallments: 8, installmentValue: 3463.17 },
      { id: generateId(), contract: "Pavilhão – Direto", institution: "Direto", type: "Imóvel", nextPayment: "2026-07-20", totalInstallments: 18, paidInstallments: 12, installmentValue: 10000.00 },
      { id: generateId(), contract: "Carta Créd. Cons. Saveiro", institution: "Carta Cré.", type: "Consórcio Veículo", nextPayment: "2026-04-11", totalInstallments: 32, paidInstallments: 5, installmentValue: 3729.60 },
      { id: generateId(), contract: "Giro Rápido", institution: "Sicredi 18x", type: "Capital de Giro", nextPayment: "2026-04-10", totalInstallments: 18, paidInstallments: 1, installmentValue: 35929.24 },
      { id: generateId(), contract: "Dívida em Boletos", institution: "Fornecedores", type: "Boletos a Pagar", totalInstallments: 1, paidInstallments: 0, installmentValue: 1156000.00 },
    ],
    payables: [
      { id: generateId(), description: "Comissões Futuras", value: 243335.00, responsible: "Comercial", status: "A vencer", notes: "Vendas fechadas não pagas" },
      { id: generateId(), description: "Cartão de Crédito Sicredi", value: 209883.36, responsible: "Financeiro", status: "A vencer", notes: "Fatura em aberto" },
      { id: generateId(), description: "Carregadores Reserva", value: 80000.00, dueDate: "20/06/2026", responsible: "Bryan", status: "Agendado", notes: "Pedido confirmado" },
      { id: generateId(), description: "Cartão de Crédito Sicoob", value: 18644.00, responsible: "Financeiro", status: "A vencer" },
      { id: generateId(), description: "Taz – Mão Obra Terceirizada", value: 47000.00, responsible: "Braian", status: "A vencer" },
      { id: generateId(), description: "Retrofit Gerador Hosp. Palm.", value: 25000.00, responsible: "Braian", status: "A vencer" },
      { id: generateId(), description: "Pedroso + Douglas", value: 17500.00, responsible: "Braian", status: "A vencer" },
      { id: generateId(), description: "Lucas – Projeto O Fumaça", value: 4000.00, responsible: "Braian", status: "A vencer" },
      { id: generateId(), description: "Ronalducho", value: 17000.00, dueDate: "11/04/2026", responsible: "Financeiro", status: "A vencer" },
    ],
  };
}
