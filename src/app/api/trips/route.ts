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
      ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
      ...(priceMax && { price: { lte: parseFloat(priceMax) } }),
      ...(priceMin && { price: { gte: parseFloat(priceMin) } }),
      ...(followedGuideIds !== null && { guideId: { in: followedGuideIds } }),
    },
    include: {
      guide: { include: { user: { select: { name: true, image: true } } } },
      guides: { include: { guide: { include: { user: { select: { name: true, image: true } } } } } },
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

  return NextResponse.json(filtered);
}
