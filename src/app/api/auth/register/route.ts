import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, orgName, orgType } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "שדות חסרים" }, { status: 400 });
    }

    if (role === "ORG_ADMIN" && !orgName?.trim()) {
      return NextResponse.json({ error: "שם הארגון חובה" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "כתובת האימייל כבר קיימת" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const allowedRoles = ["USER", "GUIDE", "ORG_ADMIN"] as const;
    const assignedRole = allowedRoles.includes(role) ? role : "USER";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: assignedRole,
        ...(assignedRole === "GUIDE" && {
          guide: { create: {} },
        }),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    // Create org + membership for ORG_ADMIN
    if (assignedRole === "ORG_ADMIN" && orgName?.trim()) {
      const org = await prisma.organization.create({
        data: {
          name: orgName.trim(),
          type: orgType ?? "company",
          contactEmail: email,
          contactName: name,
        },
      });
      await prisma.organizationMembership.create({
        data: { organizationId: org.id, userId: user.id, role: "ADMIN" },
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
