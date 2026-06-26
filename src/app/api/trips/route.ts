import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const regionsParam = searchParams.get("regions") ?? "";
  const difficultiesParam = searchParams.get("difficulties") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const priceMax = searchParams.get("priceMax") ?? "";
  const ageMin = searchParams.get("ageMin") ?? "";

  const regions = regionsParam ? regionsParam.split(",").filter(Boolean) : [];
  const difficulties = difficultiesParam ? difficultiesParam.split(",").filter(Boolean) : [];

  const trips = await prisma.trip.findMany({
    where: {
      status: { in: ["OPEN", "DRAFT"] },
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { region: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(regions.length > 0 && { region: { in: regions } }),
      ...(difficulties.length > 0 && {
        difficulty: { in: difficulties as ("EASY" | "MEDIUM" | "HARD" | "EXTREME")[] },
      }),
      ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
      ...(priceMax && { price: { lte: parseFloat(priceMax) } }),
      // ageMin filter is advisory — we filter client-side if DB column exists
    },
    include: {
      guide: { include: { user: { select: { name: true, image: true } } } },
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
