import { prisma } from "../src/lib/prisma";

// Three trip-manager organizations, each with a real SVG logo shown on their trip cards.
const ORGS = [
  { name: "בית ספר שדה כפר עציון", email: "kfar-etzion@trailhub.co.il", logo: "/logos/kfar-etzion.svg" },
  { name: "בית ספר שדה עפר", email: "sde-ofer@trailhub.co.il", logo: "/logos/sde-ofer.svg" },
  { name: "עמיתים לטיולים", email: "amitim@trailhub.co.il", logo: "/logos/amitim.svg" },
];

async function main() {
  const managers = [];
  for (const org of ORGS) {
    const user = await prisma.user.upsert({
      where: { email: org.email },
      update: { name: org.name, role: "TRIP_MANAGER", companyLogo: org.logo },
      create: { email: org.email, name: org.name, role: "TRIP_MANAGER", companyLogo: org.logo },
    });
    managers.push(user);
    console.log(`✓ ${org.name} → ${org.logo} (${user.id})`);
  }

  // Attach each manager to a few upcoming trips so their logo appears on cards.
  const trips = await prisma.trip.findMany({
    where: { status: { in: ["OPEN", "FULL"] } },
    select: { id: true },
    orderBy: { date: "asc" },
    take: 9,
  });
  for (let i = 0; i < trips.length; i++) {
    const mgr = managers[i % managers.length];
    await prisma.tripManager.upsert({
      where: { tripId_userId: { tripId: trips[i].id, userId: mgr.id } },
      update: {},
      create: { tripId: trips[i].id, userId: mgr.id },
    });
  }
  console.log(`✓ Assigned managers to ${trips.length} trips`);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
