// One-way Google Calendar export (app → calendar). No two-way sync.

function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(opts: {
  title: string;
  dateISO: string;
  startTime?: string | null;     // "HH:mm"
  durationMin?: number | null;
  endDateISO?: string | null;    // for multi-day
  location?: string | null;
  details?: string | null;
}): string {
  const start = new Date(opts.dateISO);
  if (opts.startTime && /^\d{1,2}:\d{2}$/.test(opts.startTime)) {
    const [h, m] = opts.startTime.split(":").map(Number);
    start.setHours(h, m, 0, 0);
  }
  let end: Date;
  if (opts.endDateISO) {
    end = new Date(opts.endDateISO);
    end.setHours(18, 0, 0, 0);
  } else {
    end = new Date(start.getTime() + (opts.durationMin && opts.durationMin > 0 ? opts.durationMin : 180) * 60000);
  }
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    ...(opts.location ? { location: opts.location } : {}),
    ...(opts.details ? { details: opts.details } : {}),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
