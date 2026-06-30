import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SELECT = {
  id: true, headline: true, bio: true, yearsActive: true, trainingInstitution: true,
  specialtyRegions: true, interests: true, youtubeUrl: true, podcastUrl: true,
} as const;

// GET → the logged-in guide's own editable profile fields
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  const guide = await prisma.guide.findUnique({ where: { userId: session.user.id! }, select: SELECT });
  if (!guide) return NextResponse.json({ error: "פרופיל מדריך לא נמצא" }, { status: 404 });
  return NextResponse.json(guide);
}

// PATCH → update guide profile fields
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const guide = await prisma.guide.findUnique({ where: { userId: session.user.id! }, select: { id: true } });
  if (!guide) return NextResponse.json({ error: "פרופיל מדריך לא נמצא" }, { status: 404 });

  const { headline, bio, yearsActive, trainingInstitution, specialtyRegions, interests, youtubeUrl, podcastUrl } = await req.json();

  const updated = await prisma.guide.update({
    where: { id: guide.id },
    data: {
      ...(headline !== undefined && { headline: headline || null }),
      ...(bio !== undefined && { bio: bio || null }),
      ...(yearsActive !== undefined && { yearsActive: yearsActive ? Number(yearsActive) : null }),
      ...(trainingInstitution !== undefined && { trainingInstitution: trainingInstitution || null }),
      ...(specialtyRegions !== undefined && { specialtyRegions: Array.isArray(specialtyRegions) ? specialtyRegions : [] }),
      ...(interests !== undefined && { interests: Array.isArray(interests) ? interests : [] }),
      ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl || null }),
      ...(podcastUrl !== undefined && { podcastUrl: podcastUrl || null }),
    },
    select: SELECT,
  });
  return NextResponse.json(updated);
}
