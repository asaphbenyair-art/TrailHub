// Refund calculation from a trip's cancellation policy text vs. current time.
// The policy is stored as Hebrew lines like "עד 72 שעות לפני — החזר 100%".
export function computeRefund(policy: string | null, tripDate: string, totalPrice: number) {
  const hoursUntil = (new Date(tripDate).getTime() - Date.now()) / 3_600_000;
  const lines = (policy ?? "").split("\n").filter(Boolean);
  const tiers: { hours: number; pct: number }[] = [];
  for (const line of lines) {
    const hMatch = line.match(/(\d+)\s*שעות/);
    const noRefund = /ללא\s*החזר/.test(line);
    const pMatch = line.match(/(\d+)\s*%/);
    if (!hMatch) continue;
    const hours = parseInt(hMatch[1], 10);
    const pct = noRefund ? 0 : pMatch ? parseInt(pMatch[1], 10) : 0;
    // "פחות מ-X שעות" describes the window BELOW the threshold.
    if (/פחות/.test(line)) continue;
    tiers.push({ hours, pct });
  }
  // Most generous tier the hiker still qualifies for.
  let pct = 0;
  for (const t of tiers) if (hoursUntil >= t.hours) pct = Math.max(pct, t.pct);
  return { pct, amount: Math.round((totalPrice * pct) / 100) };
}
