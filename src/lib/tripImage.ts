// Curated, high-quality Unsplash cover photos for trips, assigned by region/type.
//
// Every ID below was verified to return 200 from the Unsplash CDN
// (images.unsplash.com/photo-<id>) — no random source.unsplash.com URLs, which
// are dead. Photos are grouped by scenery so each trip gets a category-matched,
// hand-picked photo; a per-trip hash spreads photos within a category.
//
// The seed trips ship with random /uploads images, so we OVERRIDE the cover with
// these curated photos (that's what "apply to all cards + detail" means).

const POOLS: Record<string, string[]> = {
  desert: [
    "1547234935-80c7145ec969", "1473580044384-7ba9967e16a0", "1516426122078-c23e76319801",
    "1495107334309-fcf20504a5ab", "1682686581362-796145f0e123", "1548032885-b5e38734688a",
    "1521336575822-6da63fb45455",
  ],
  mountain: [
    "1464822759023-fed622ff2c3b", "1506905925346-21bda4d32df4", "1519681393784-d120267933ba",
    "1454496522488-7a8e488e8606", "1476514525535-07fb3b4ae5f1", "1470770903676-69b98201ea1c",
  ],
  forest: [
    "1448375240586-882707db888b", "1441974231531-c6227db76b6e", "1508739773434-c26b3d09e071",
    "1500534623283-312aade485b7",
  ],
  water: [
    "1518623489648-a173ef7824f3", "1501854140801-50d01698950b", "1505118380757-91f5f5632de0",
  ],
  night: [
    "1419242902214-272b3f66ee7a", "1519681393784-d120267933ba",
  ],
  general: [
    "1551632811-561732d1e306", "1533240332313-0db49b459ad6", "1445307806294-bff7f67ff225",
    "1560026301-88340cf16be7", "1571863533956-01c88e79957e", "1465311440653-ba9b1d9b0f5b",
    "1522163182402-834f871fd851", "1487730116645-74489c95b41b",
  ],
};

export interface CoverOpts {
  region?: string | null;
  tags?: string[] | null;
  title?: string | null;
  count?: number;
}

const url = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

function categoryFor(region?: string | null, tags?: string[] | null, title?: string | null): keyof typeof POOLS {
  const t = title ?? "";
  const tag = tags ?? [];
  if (tag.includes("night") || /לילה|כוכב|זריחה|שקיעה/.test(t)) return "night";
  if (tag.includes("water") || tag.includes("swimming") || /נחל|מפל|מעיין|בריכ|מים/.test(t)) return "water";
  switch (region) {
    case "נגב":
    case "ערבה":
      return "desert";
    case "גולן":
      return "mountain";
    case "כרמל":
      return "forest";
    default:
      return "general"; // גליל / עמק יזרעאל / ירושלים / שפלה
  }
}

function hashSeed(s: string): number {
  let h = 0;
  for (const c of s || "trip") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** A curated Unsplash photo URL for a trip, category-matched by region/type. */
export function hikingPhoto(seed: string, index = 0, opts: CoverOpts = {}): string {
  const pool = POOLS[categoryFor(opts.region, opts.tags, opts.title)];
  return url(pool[(hashSeed(seed) + index) % pool.length]);
}

/**
 * Cover images for a trip — curated photos, category-matched. Returns `count`
 * DISTINCT photos (where the pool allows) so the staggered-fade rotation shows
 * different images. The stored `images` are intentionally ignored.
 */
export function coverImages(_images: string[] | null | undefined, seed: string, opts: CoverOpts = {}): string[] {
  const pool = POOLS[categoryFor(opts.region, opts.tags, opts.title)];
  const count = Math.min(opts.count ?? 3, pool.length);
  const base = hashSeed(seed);
  return Array.from({ length: count }, (_, i) => url(pool[(base + i) % pool.length]));
}
