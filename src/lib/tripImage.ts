// Real "man hiking" nature/hiking cover photos for trips, varied by region/type.
//
// The requested `source.unsplash.com/?man,hiking,...` endpoint was shut down by
// Unsplash (returns 503). LoremFlickr provides the same keyword-search behavior
// and is live (verified 200 image/jpeg) — so we keep the exact query intent
// ("man,hiking,<region/type>") and give each trip a UNIQUE photo via ?lock=<hash>.
//
// The seed trips ship with random /uploads images, so we OVERRIDE the cover with
// these themed photos (that's what "apply to all trip cards + detail" means).

export interface CoverOpts {
  region?: string | null;
  tags?: string[] | null;
  title?: string | null;
  count?: number;
}

// Region/type → Unsplash-style keyword query (always includes "man,hiking").
function keywordsFor(region?: string | null, tags?: string[] | null, title?: string | null): string {
  const t = title ?? "";
  const tag = tags ?? [];
  if (tag.includes("night") || /לילה|כוכב|זריחה|שקיעה/.test(t)) return "man,hiking,night,stars";
  if (tag.includes("water") || tag.includes("swimming") || /נחל|מפל|מעיין|בריכ|מים/.test(t)) return "man,hiking,waterfall,stream";
  switch (region) {
    case "נגב":
    case "ערבה":
      return "man,hiking,desert,israel";
    case "גליל עליון":
    case "גליל תחתון":
    case "עמק יזרעאל":
      return "man,hiking,galilee,nature";
    case "כרמל":
      return "man,hiking,forest,trail";
    case "גולן":
      return "man,hiking,mountain,israel";
    case "ירושלים":
    case "שפלה":
      return "man,hiking,nature,israel";
    default:
      return "man,hiking,nature,israel";
  }
}

function hashSeed(s: string): number {
  let h = 0;
  for (const c of s || "trip") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** A unique "man hiking" photo URL for a trip, themed by region/type. */
export function hikingPhoto(seed: string, index = 0, opts: CoverOpts = {}): string {
  const kw = keywordsFor(opts.region, opts.tags, opts.title);
  const lock = (hashSeed(`${seed}:${index}`) % 100000) + 1; // unique per trip → unique URL
  return `https://loremflickr.com/800/500/${kw}?lock=${lock}`;
}

/**
 * Cover images for a trip — themed man-hiking photos, unique per trip.
 * `count` distinct photos are returned so the staggered-fade rotation still works.
 * The stored `images` are intentionally ignored (demo covers are replaced).
 */
export function coverImages(_images: string[] | null | undefined, seed: string, opts: CoverOpts = {}): string[] {
  const count = opts.count ?? 3;
  return Array.from({ length: count }, (_, i) => hikingPhoto(seed, i, opts));
}
