import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id: tripId } = await params;
  const meId = session.user.id!;

  // Get the trip to find guide's userId
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { guide: { select: { userId: true } } },
  });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  const guideUserId = trip.guide.userId;
  const role = (session.user as { role?: string }).role;

  const { searchParams: sp } = new URL(req.url);
  const withUserId = sp.get("with");

  // Generic thread: conversation between me and any specified counterpart
  if (withUserId) {
    const messages = await prisma.chatMessage.findMany({
      where: {
        tripId,
        OR: [
          { fromUserId: meId, toUserId: withUserId },
          { fromUserId: withUserId, toUserId: meId },
        ],
      },
      include: { fromUser: { select: { name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
    // Mark incoming messages as read
    await prisma.chatMessage.updateMany({
      where: { tripId, fromUserId: withUserId, toUserId: meId, read: false },
      data: { read: true },
    });
    const counterpart = await prisma.user.findUnique({
      where: { id: withUserId },
      select: { id: true, name: true, image: true },
    });
    return NextResponse.json({ messages, guideUserId, counterpart });
  }

  // Guide sees all threads OR a specific hiker's thread via ?userId=
  if (role === "GUIDE" || role === "ADMIN") {
    const { searchParams } = new URL(req.url);
    const hikerId = searchParams.get("userId");

    if (hikerId) {
      // Single thread between guide and one hiker
      const messages = await prisma.chatMessage.findMany({
        where: {
          tripId,
          OR: [
            { fromUserId: guideUserId, toUserId: hikerId },
            { fromUserId: hikerId, toUserId: guideUserId },
          ],
        },
        include: { fromUser: { select: { name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      });
      // Mark hiker messages as read
      await prisma.chatMessage.updateMany({
        where: { tripId, fromUserId: hikerId, toUserId: guideUserId, read: false },
        data: { read: true },
      });
      return NextResponse.json(messages);
    }

    // Thread list: distinct hikers who messaged this trip
    const threads = await prisma.chatMessage.findMany({
      where: {
        tripId,
        OR: [{ toUserId: guideUserId }, { fromUserId: guideUserId }],
      },
      include: {
        fromUser: { select: { id: true, name: true, image: true } },
        toUser: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Collapse to unique hiker entries (most recent message per hiker)
    const seen = new Set<string>();
    const result: typeof threads = [];
    for (const msg of threads) {
      const hikerId = msg.fromUserId === guideUserId ? msg.toUserId : msg.fromUserId;
      if (!seen.has(hikerId)) {
        seen.add(hikerId);
        result.push(msg);
      }
    }
    return NextResponse.json(result);
  }

  // Hiker: see conversation with the guide
  const messages = await prisma.chatMessage.findMany({
    where: {
      tripId,
      OR: [
        { fromUserId: meId, toUserId: guideUserId },
        { fromUserId: guideUserId, toUserId: meId },
      ],
    },
    include: { fromUser: { select: { name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Mark guide messages as read
  await prisma.chatMessage.updateMany({
    where: { tripId, fromUserId: guideUserId, toUserId: meId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ messages, guideUserId });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

  const { id: tripId } = await params;
  const { body, toUserId } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "הודעה ריקה" }, { status: 400 });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { guide: { select: { userId: true } } },
  });
  if (!trip) return NextResponse.json({ error: "טיול לא נמצא" }, { status: 404 });

  const meId = session.user.id!;
  const guideUserId = trip.guide.userId;
  const role = (session.user as { role?: string }).role;

  let recipientId: string;
  if (toUserId) {
    recipientId = toUserId;
  } else if (role === "GUIDE" || role === "ADMIN") {
    return NextResponse.json({ error: "חסר נמען" }, { status: 400 });
  } else {
    recipientId = guideUserId;
  }

  const message = await prisma.chatMessage.create({
    data: { tripId, fromUserId: meId, toUserId: recipientId, body: body.trim() },
    include: { fromUser: { select: { name: true, image: true } } },
  });

  // Notify recipient
  await prisma.notification.create({
    data: {
      userId: recipientId,
      tripId,
      type: "NEW_MESSAGE",
      title: "הודעה חדשה",
      body: `בטיול "${trip.title}": ${body.trim().slice(0, 60)}`,
      link: `/trips/${tripId}/chat`,
    },
  });

  return NextResponse.json(message, { status: 201 });
}
