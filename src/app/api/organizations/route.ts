import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  if (role === "ADMIN") {
    const orgs = await prisma.organization.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return NextResponse.json(orgs);
  }

  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  // ORG_ADMIN sees only their org
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId: session.user.id! },
    include: { organization: true },
  });
  return NextResponse.json(memberships.map((m) => m.organization));
}
