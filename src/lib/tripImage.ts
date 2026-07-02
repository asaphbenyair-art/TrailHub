// Real "man hiking" cover photos for trips.
//
// NOTE: the requested `source.unsplash.com` endpoint was deprecated and shut
// down by Unsplash (it now returns 503), so those URLs no longer load. We keep
// the exact intent — real photos of a man hiking, a unique location term per
// trip — but serve them from LoremFlickr, a keyword photo service that is live
// (verified 200 image/jpeg). Swap the URL builder for the official Unsplash API
// if a key is added later.
//
// The seed trips all ship with random /uploads images, so we OVERRIDE the cover
// with themed man-hiking photos (this is what "replace all trip images" means in
// practice). To only fill empty images instead, gate on `images?.length` below.

const TERMS = ["desert", "galilee", "mountain", "trail", "waterfall", "forest", "spring", "valley", "canyon", "negev"];

function hashSeed(s: string): number {
  let h = 0;
  for (const c of s || "trip") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** A stable "man hiking" photo URL for a given seed + slot index. */
export function hikingPhoto(seed: string, index = 0): string {
  const h = hashSeed(`${seed}:${index}`);
  const term = TERMS[h % TERMS.length];
  const lock = (h % 1000) + 1; // stable image per seed+index
  return `https://loremflickr.com/800/600/man,hiking,${term}?lock=${lock}`;
}

/**
 * Cover images for a trip — themed man-hiking photos, unique per trip.
 * `count` distinct photos are returned so the staggered-fade rotation still works.
 * The stored `images` are intentionally ignored (demo covers are replaced).
 */
export function coverImages(_images: string[] | null | undefined, seed: string, count = 3): string[] {
  return Array.from({ length: count }, (_, i) => hikingPhoto(seed, i));
}
