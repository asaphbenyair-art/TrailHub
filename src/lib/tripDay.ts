export interface TripDayInput {
  dayNumber: number;
  title?: string;
  description?: string;
  distanceKm?: string;
  durationHours?: string;
  startPoint?: string;
  endPoint?: string;
  date?: string;
  startTime?: string;
  estimatedEndTime?: string;
  difficulty?: string;
  isRestDay?: boolean;
  equipment?: string;
  gpxData?: string;
  waypointsJson?: unknown;
  sources?: unknown;
}

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "EXTREME"];

// Maps a wizard TripDay payload to a Prisma TripDay create row for a given trip.
export function mapTripDay(tripId: string) {
  return (d: TripDayInput) => ({
    tripId,
    dayNumber: d.dayNumber,
    title: d.title || null,
    description: d.description || null,
    distanceKm: d.distanceKm ? parseFloat(d.distanceKm) : null,
    durationMin: d.durationHours ? Math.round(parseFloat(d.durationHours) * 60) : null,
    startPoint: d.startPoint || null,
    endPoint: d.endPoint || null,
    date: d.date ? new Date(d.date) : null,
    startTime: d.startTime || null,
    estimatedEndTime: d.estimatedEndTime || null,
    difficulty: d.difficulty && DIFFICULTIES.includes(d.difficulty) ? (d.difficulty as "EASY" | "MEDIUM" | "HARD" | "EXTREME") : null,
    isRestDay: !!d.isRestDay,
    equipment: d.equipment || null,
    gpxData: d.gpxData || null,
    waypointsJson: d.waypointsJson ?? undefined,
    sourceMaterials: Array.isArray(d.sources) && d.sources.length > 0 ? (d.sources as object[]) : undefined,
  });
}
