import { prisma } from "@/lib/prisma";

// Recompute a guide's ratings, kept completely separate for guided vs self-guided trips.
export async function recalcGuideRating(guideId: string) {
  const [guided, selfGuided] = await Promise.all([
    prisma.review.findMany({ where: { trip: { guideId, tripType: { not: "SELF_GUIDED" } } }, select: { rating: true } }),
    prisma.review.findMany({ where: { trip: { guideId, tripType: "SELF_GUIDED" } }, select: { rating: true } }),
  ]);
  const avg = (a: { rating: number }[]) => (a.length ? a.reduce((s, r) => s + r.rating, 0) / a.length : 0);
  await prisma.guide.update({
    where: { id: guideId },
    data: {
      rating: avg(guided), reviewCount: guided.length,
      selfGuidedRating: avg(selfGuided), selfGuidedReviewCount: selfGuided.length,
    },
  });
}
