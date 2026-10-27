export function canCorrectLegacyBalance(value: string) {
 if (!value.trim()) return false;
 const amount = Number(value);
 return Number.isFinite(amount) && amount >= 0 && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001;
}