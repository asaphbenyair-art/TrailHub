import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || (role !== "ADMIN")) return null;
  return session;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { guides: true, memberships: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orgs);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const body = await req.json();
  const { name, type, contactName, contactEmail, contactPhone } = body;
  if (!name || !type) return NextResponse.json({ error: "שם וסוג חובה" }, { status: 400 });

  const org = await prisma.organization.create({
    data: { name, type, contactName, contactEmail, contactPhone },
  });

  return NextResponse.json(org, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "חסר id" }, { status: 400 });

  const org = await prisma.organization.update({ where: { id }, data });
  return NextResponse.json(org);
}
