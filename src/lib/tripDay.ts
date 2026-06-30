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
  isRestDay?: boolean;
  equipment?: string;
  sources?: unknown;
}

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
    isRestDay: !!d.isRestDay,
    equipment: d.equipment || null,
    sourceMaterials: Array.isArray(d.sources) && d.sources.length > 0 ? (d.sources as object[]) : undefined,
  });
}
