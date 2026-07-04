export interface TripTag {
  value: string;
  label: string;
  labelEn: string;
  selfGuidedOnly?: boolean;
}

// Trip attribute tags (searchable filters). Set by guide at creation.
export const TRIP_TAGS: TripTag[] = [
  { value: "dog", label: "🐕 ידידותי לכלבים", labelEn: "🐕 Dog-friendly" },
  { value: "stroller", label: "👶 מתאים לעגלה", labelEn: "👶 Stroller-friendly" },
  { value: "young_children", label: "🚸 מתאים לילדים קטנים", labelEn: "🚸 Young children" },
  { value: "wheelchair", label: "♿ נגיש לכיסא גלגלים", labelEn: "♿ Wheelchair accessible" },
  { value: "restrooms", label: "🚻 יש שירותים", labelEn: "🚻 Restrooms" },
  { value: "shaded", label: "🌳 מסלול מוצל", labelEn: "🌳 Shaded route" },
  { value: "water", label: "💧 מים (נחל/בריכה)", labelEn: "💧 Water (stream/pool)" },
  { value: "swimming", label: "🏊 מתאים לשחייה", labelEn: "🏊 Swimming" },
  { value: "cycling", label: "🚲 מתאים לרכיבה", labelEn: "🚲 Cycling" },
  { value: "scenic", label: "📸 נקודות תצפית", labelEn: "📸 Scenic viewpoints" },
  { value: "climbing", label: "🧗 דורש טיפוס", labelEn: "🧗 Scrambling" },
  { value: "night", label: "🌙 טיול לילה", labelEn: "🌙 Night hike" },
  // Self-guided only
  { value: "campfire", label: "🔥 מתאים למדורה", labelEn: "🔥 Campfire-friendly", selfGuidedOnly: true },
  { value: "sunrise_sunset", label: "🌅 זריחה/שקיעה", labelEn: "🌅 Sunrise/sunset", selfGuidedOnly: true },
  { value: "seasonal", label: "🍂 המלצה עונתית", labelEn: "🍂 Seasonal", selfGuidedOnly: true },
  { value: "not_rainy", label: "🌧️ לא בימי גשם", labelEn: "🌧️ Not on rainy days", selfGuidedOnly: true },
];

export const TAG_LABEL: Record<string, string> = Object.fromEntries(TRIP_TAGS.map((t) => [t.value, t.label]));
export const TAG_LABEL_EN: Record<string, string> = Object.fromEntries(TRIP_TAGS.map((t) => [t.value, t.labelEn]));
