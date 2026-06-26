import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      gender: true,
      birthYear: true,
      bio: true,
      phone: true,
      preferredRegions: true,
      preferredDifficulties: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, gender, birthYear, bio, phone, preferredRegions, preferredDifficulties, image } = body;

    const updated = await prisma.user.update({
      where: { id: session.user.id! },
      data: {
        ...(name !== undefined && { name }),
        ...(gender !== undefined && { gender: gender || null }),
        ...(birthYear !== undefined && { birthYear: birthYear ? Number(birthYear) : null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(preferredRegions !== undefined && { preferredRegions }),
        ...(preferredDifficulties !== undefined && { preferredDifficulties }),
        ...(image !== undefined && { image: image || null }),
      },
      select: {
        id: true, name: true, email: true, image: true,
        gender: true, birthYear: true, bio: true, phone: true,
        preferredRegions: true, preferredDifficulties: true,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[profile PATCH]", err);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
