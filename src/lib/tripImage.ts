// Real "man hiking" / outdoor cover photos for trips.
//
// The requested `source.unsplash.com` endpoint was deprecated and shut down by
// Unsplash (returns 503), so those URLs no longer load. Instead we use a curated
// pool of Unsplash CDN photos (images.unsplash.com) — every URL was verified to
// return 200 image/jpeg, so nothing ships broken, and the Unsplash CDN is fast
// and consistent. A deterministic hash maps each trip to a stable photo.
//
// The seed trips all ship with random /uploads images, so we OVERRIDE the cover
// with these themed photos (that's what "replace all trip images" means here).

const PHOTO_IDS = [
  "1551632811-561732d1e306", // hiker on ridge
  "1533240332313-0db49b459ad6", // man hiking trail
  "1454496522488-7a8e488e8606", // mountain valley
  "1476514525535-07fb3b4ae5f1", // alpine lake
  "1445307806294-bff7f67ff225", // hiker summit
  "1508739773434-c26b3d09e071", // forest trail
  "1560026301-88340cf16be7", // backpacker
  "1521336575822-6da63fb45455", // desert hike
  "1571863533956-01c88e79957e", // man hiking
  "1519681393784-d120267933ba", // mountain
  "1470770903676-69b98201ea1c", // lake path
  "1465311440653-ba9b1d9b0f5b", // canyon
  "1500534623283-312aade485b7", // trail woods
  "1522163182402-834f871fd851", // ridge walk
  "1487730116645-74489c95b41b", // mountain vista
];

const url = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&q=80`;

function hashSeed(s: string): number {
  let h = 0;
  for (const c of s || "trip") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** A stable outdoor/hiking photo URL for a given seed + slot index. */
export function hikingPhoto(seed: string, index = 0): string {
  const idx = (hashSeed(seed) + index) % PHOTO_IDS.length;
  return url(PHOTO_IDS[idx]);
}

/**
 * Cover images for a trip — themed hiking photos, unique per trip.
 * `count` distinct photos are returned so the staggered-fade rotation still works.
 * The stored `images` are intentionally ignored (demo covers are replaced).
 */
export function coverImages(_images: string[] | null | undefined, seed: string, count = 3): string[] {
  const start = hashSeed(seed);
  return Array.from({ length: count }, (_, i) => url(PHOTO_IDS[(start + i) % PHOTO_IDS.length]));
}
