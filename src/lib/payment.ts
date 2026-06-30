// Stripe-shaped payment helpers (simulated — no real Stripe keys configured).
// Authorization happens on registration; capture happens when the no-refund
// window opens. Swap these stubs for real Stripe calls once keys are added.

export function noRefundHours(policy: string | null): number {
  if (!policy) return 24;
  const nums = [...policy.matchAll(/(\d+)\s*שעות/g)].map((m) => parseInt(m[1]));
  return nums.length ? Math.min(...nums) : 24;
}

export function withinNoRefundWindow(tripDate: Date, policy: string | null, now = new Date()): boolean {
  const h = noRefundHours(policy);
  return now.getTime() >= tripDate.getTime() - h * 3600 * 1000;
}

// Hours remaining until the no-refund window opens (negative = already inside it).
export function hoursUntilNoRefund(tripDate: Date, policy: string | null, now = new Date()): number {
  const h = noRefundHours(policy);
  const windowStart = tripDate.getTime() - h * 3600 * 1000;
  return (windowStart - now.getTime()) / 3600000;
}

export function simIntentId(): string {
  return `pi_sim_${Math.random().toString(36).slice(2, 12)}`;
}
