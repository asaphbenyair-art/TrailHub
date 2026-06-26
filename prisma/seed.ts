import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const guidePassword = await bcrypt.hash("password123", 12);
  const userPassword = await bcrypt.hash("password123", 12);
  const adminPassword = await bcrypt.hash("password123", 12);

  const guide = await prisma.user.upsert({
    where: { email: "roei@trailhub.co.il" },
    update: {},
    create: {
      name: "רועי לוי",
      email: "roei@trailhub.co.il",
      password: guidePassword,
      role: "GUIDE",
      guide: {
        create: {
          bio: "מדריך טיולים מוסמך עם 10 שנות ניסיון. מתמחה בטיולי נחלים ומדבר.",
          location: "ירושלים",
          rating: 4.9,
          reviewCount: 127,
          isVerified: true,
          yearsActive: 10,
        },
      },
    },
    include: { guide: true },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@trailhub.co.il" },
    update: {},
    create: {
      name: "ישראל ישראלי",
      email: "user@trailhub.co.il",
      password: userPassword,
      role: "USER",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@trailhub.co.il" },
    update: {},
    create: {
      name: "מנהל מערכת",
      email: "admin@trailhub.co.il",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const nextFriday = new Date();
  nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));
  nextFriday.setHours(7, 0, 0, 0);

  if (guide.guide) {
    await prisma.trip.upsert({
      where: { id: "seed-trip-1" },
      update: {},
      create: {
        id: "seed-trip-1",
        title: "טיול נחל קלט — ממעיין פרת לעין פרת",
        description: "אחד הטיולים היפים בישראל לאורך נחל קלט עם מים זורמים, צוקים מרשימים ונופים עוצרי נשימה.",
        region: "ירושלים",
        difficulty: "MEDIUM",
        status: "OPEN",
        date: nextFriday,
        startTime: "07:00",
        durationMin: 330,
        distanceKm: 12.4,
        price: 120,
        maxSpots: 24,
        spotsBooked: 18,
        meetingPoint: "מעיין פרת — חניון לוחמי הגטאות",
        whatToBring: "3 ליטר מים, כובע, קרם הגנה, נעלי הליכה",
        guideId: guide.guide.id,
        images: [],
      },
    });
  }

  console.log("Seed complete:", { guide: guide.email, user: user.email, admin: "admin@trailhub.co.il" });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
