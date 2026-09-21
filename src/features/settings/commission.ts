/**
 * Pure function, deliberately separated from Firestore access
 * (getMonetizationSettings in api.ts) so the actual math is unit
 * testable without mocking the Admin SDK. Rounds to the nearest paisa
 * (2 decimal places) since this is currency.
 */
export function calculateCommission(amount: number, commissionPercent: number): number {
  if (amount < 0 || commissionPercent < 0) {
    throw new Error("Amount and commission percent must be non-negative");
  }
  return Math.round(amount * (commissionPercent / 100) * 100) / 100;
}

export function calculateProviderPayout(amount: number, commission: number): number {
  return Math.round((amount - commission) * 100) / 100;
}
