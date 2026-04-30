import { Lock } from "lucide-react";
import { MONTH_LABELS_SHORT } from "@/utils/formatters";
import { LOCKED_MONTHS } from "@/utils/lockedMonths";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MonthSelectorProps {
  selectedMonth: string;
  onSelect: (month: string) => void;
}

export function MonthSelector({ selectedMonth, onSelect }: MonthSelectorProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
      {MONTH_LABELS_SHORT.map((label, i) => {
        const monthNum = String(i + 1).padStart(2, "0");
        const isSelected = monthNum === selectedMonth;
        const isLocked = LOCKED_MONTHS.includes(monthNum);
        return (
          <Tooltip key={monthNum}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSelect(monthNum)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0
                  ${isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
              >
                {isLocked && <Lock className="h-3 w-3" />}
                {label}
              </button>
            </TooltipTrigger>
            {isLocked && (
              <TooltipContent>
                <p>Mês fechado — não pode ser editado</p>
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}
