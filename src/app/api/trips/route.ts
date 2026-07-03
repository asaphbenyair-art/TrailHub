import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const regionsParam = searchParams.get("regions") ?? "";
  const difficultiesParam = searchParams.get("difficulties") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const priceMax = searchParams.get("priceMax") ?? "";
  const priceMin = searchParams.get("priceMin") ?? "";
  const ageMin = searchParams.get("ageMin") ?? "";
  const favoriteGuides = searchParams.get("favoriteGuides") === "1";
  const category = searchParams.get("category") ?? "guided";
  const gender = searchParams.get("gender") ?? ""; // "", "MEN", "WOMEN"
  const tagsParam = searchParams.get("tags") ?? "";
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];

  const regions = regionsParam ? regionsParam.split(",").filter(Boolean) : [];
  const difficulties = difficultiesParam ? difficultiesParam.split(",").filter(Boolean) : [];

  // Resolve "favorite guides only" via the logged-in user's follows
  let followedGuideIds: string[] | null = null;
  if (favoriteGuides) {
    const session = await auth();
    if (session?.user) {
      const follows = await prisma.guideFollow.findMany({
        where: { userId: session.user.id! },
        select: { guideId: true },
      });
      followedGuideIds = follows.map((f) => f.guideId);
    } else {
      followedGuideIds = [];
    }
  }

  const trips = await prisma.trip.findMany({
    where: {
      status: { in: ["OPEN", "FULL"] },
      visibility: "PUBLIC",
      ...(category === "self_guided"
        ? { tripType: "SELF_GUIDED" as const }
        : { tripType: { in: ["DAY_HIKE", "EXPEDITION", "MULTI_SITE"] as ("DAY_HIKE" | "EXPEDITION" | "MULTI_SITE")[] } }),
      ...(tags.length > 0 && { attributeTags: { hasEvery: tags } }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { region: { contains: q, mode: "insensitive" } },
          { guide: { user: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }),
      ...(regions.length > 0 && { region: { in: regions } }),
      ...(difficulties.length > 0 && {
        difficulty: { in: difficulties as ("EASY" | "MEDIUM" | "HARD" | "EXTREME")[] },
      }),
      ...(gender === "MEN" || gender === "WOMEN"
        ? { genderRestriction: { in: [gender, "ALL"] } }
        : {}),
      ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
      ...(priceMax && { price: { lte: parseFloat(priceMax) } }),
      ...(priceMin && { price: { gte: parseFloat(priceMin) } }),
      ...(followedGuideIds !== null && { guideId: { in: followedGuideIds } }),
    },
    include: {
      guide: { include: { user: { select: { name: true, image: true, companyLogo: true } } } },
      guides: { include: { guide: { include: { user: { select: { name: true, image: true } } } } } },
      managers: { include: { user: { select: { companyLogo: true } } } },
      _count: { select: { days: true } },
    },
    orderBy: { date: "asc" },
    take: 50,
  });

  // Client-side age filter (ageMin from Trip model)
  const filtered = ageMin
    ? trips.filter((t) => {
        const tripAgeMin = (t as unknown as { ageMin?: number | null }).ageMin;
        return !tripAgeMin || tripAgeMin <= parseInt(ageMin);
      })
    : trips;

  // Rideshare summary per trip for the card indicator: available seats across
  // open offers + number of "looking for a ride" seekers.
  const ids = filtered.map((t) => t.id);
  const [offers, seekerGroups, qaAll, qaOpen] = await Promise.all([
    prisma.rideshareOffer.findMany({
      where: { tripId: { in: ids }, isCancelled: false },
      select: { tripId: true, spots: true, _count: { select: { claims: true } } },
    }),
    prisma.rideshareRequest.groupBy({
      by: ["tripId"],
      where: { tripId: { in: ids } },
      _count: { _all: true },
    }),
    // Public Q&A only (private questions are visible to asker/manager alone).
    prisma.tripQuestion.groupBy({
      by: ["tripId"],
      where: { tripId: { in: ids }, isPrivate: false },
      _count: { _all: true },
    }),
    prisma.tripQuestion.groupBy({
      by: ["tripId"],
      where: { tripId: { in: ids }, isPrivate: false, answer: null },
      _count: { _all: true },
    }),
  ]);
  const spotsByTrip: Record<string, number> = {};
  for (const o of offers) spotsByTrip[o.tripId] = (spotsByTrip[o.tripId] ?? 0) + Math.max(o.spots - o._count.claims, 0);
  const seekersByTrip: Record<string, number> = {};
  for (const g of seekerGroups) seekersByTrip[g.tripId] = g._count._all;
  const qaCountByTrip: Record<string, number> = {};
  for (const g of qaAll) qaCountByTrip[g.tripId] = g._count._all;
  const qaOpenByTrip: Record<string, number> = {};
  for (const g of qaOpen) qaOpenByTrip[g.tripId] = g._count._all;

  const withRideshare = filtered.map((t) => {
    // Trip-manager logo takes priority over the guide's; else none.
    const managerLogo = t.managers?.map((m) => m.user?.companyLogo).find(Boolean) ?? null;
    const guideLogo = t.guide?.user?.companyLogo ?? null;
    return {
      ...t,
      rideSpots: spotsByTrip[t.id] ?? 0,
      rideSeekers: seekersByTrip[t.id] ?? 0,
      qaCount: qaCountByTrip[t.id] ?? 0,
      qaOpen: qaOpenByTrip[t.id] ?? 0,
      cardLogo: managerLogo ?? guideLogo ?? null,
    };
  });

  return NextResponse.json(withRideshare);
}
