import { prisma } from "@/lib/prisma";

// Returns true if the user may manage the trip: the primary/owner guide,
// any assigned TripGuide, a co-manager (TripManager), or an ADMIN.
export async function canManageTrip(tripId: string, userId: string, role?: string): Promise<boolean> {
  if (role === "ADMIN") return true;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      guide: { select: { userId: true } },
      guides: { select: { guide: { select: { userId: true } } } },
      managers: { select: { userId: true } },
    },
  });
  if (!trip) return false;

  if (trip.guide.userId === userId) return true;
  if (trip.managers.some((m) => m.userId === userId)) return true;
  if (trip.guides.some((g) => g.guide.userId === userId)) return true;
  return false;
}

// Resolve a secondary guide (by email) and co-managers (by email) and sync the
// TripGuide / TripManager join tables for a trip. The owner guide is always
// (re)stored as PRIMARY.
export async function syncTripTeam(opts: {
  tripId: string;
  ownerGuideId: string;
  secondGuideEmail?: string | null;
  secondGuideRole?: "SECONDARY" | "EQUAL";
  managerEmails?: string[];
}) {
  const { tripId, ownerGuideId, secondGuideEmail, secondGuideRole, managerEmails } = opts;

  // ── Guides (owner + optional second) ──
  await prisma.tripGuide.deleteMany({ where: { tripId } });
  const isEqual = secondGuideRole === "EQUAL";
  const ownerRole: "PRIMARY" | "EQUAL" = isEqual ? "EQUAL" : "PRIMARY";
  const guideRows: { tripId: string; guideId: string; role: "PRIMARY" | "SECONDARY" | "EQUAL" }[] = [
    { tripId, guideId: ownerGuideId, role: ownerRole },
  ];
  if (secondGuideEmail?.trim()) {
    const u = await prisma.user.findUnique({
      where: { email: secondGuideEmail.trim().toLowerCase() },
      select: { guide: { select: { id: true } } },
    });
    if (u?.guide && u.guide.id !== ownerGuideId) {
      guideRows.push({ tripId, guideId: u.guide.id, role: isEqual ? "EQUAL" : "SECONDARY" });
    }
  }
  await prisma.tripGuide.createMany({ data: guideRows, skipDuplicates: true });

  // ── Co-managers ──
  await prisma.tripManager.deleteMany({ where: { tripId } });
  if (Array.isArray(managerEmails) && managerEmails.length > 0) {
    const emails = managerEmails.map((e) => e.trim().toLowerCase()).filter(Boolean);
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    if (users.length > 0) {
      await prisma.tripManager.createMany({
        data: users.map((u) => ({ tripId, userId: u.id })),
        skipDuplicates: true,
      });
    }
  }
}
