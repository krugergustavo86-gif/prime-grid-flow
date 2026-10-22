import { useState } from "react";
import { Transaction } from "@/types";
import { groupOf } from "@/utils/categories";
import { sumTotals } from "@/utils/monthlyTotals";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { GroupDetailSheet } from "./GroupDetailSheet";
import { ChevronRight, Users } from "lucide-react";

export function PeopleExpenseTotal({ transactions }: { transactions: Transaction[] }) {
  const [open, setOpen] = useState(false);
  const total = sumTotals(transactions.filter(t => t.type === "Saída" && groupOf(t.type, t.category) === "Pessoal (folha)")).saidas;
  return <>
    <Button variant="outline" className="h-auto w-full justify-between gap-3 py-3" onClick={() => setOpen(true)}>
      <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Gasto em pessoas</span>
      <span className="flex items-center gap-2 tabular-nums">{formatCurrency(total)}<ChevronRight className="h-4 w-4" /></span>
    </Button>
    <GroupDetailSheet transactions={transactions} selected={open ? { type: "Saída", name: "Pessoal (folha)", mode: "grupo" } : null} onClose={() => setOpen(false)} />
  </>;
}