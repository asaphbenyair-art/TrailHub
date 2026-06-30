export interface TripTag {
  value: string;
  label: string;
  selfGuidedOnly?: boolean;
}

// Trip attribute tags (searchable filters). Set by guide at creation.
export const TRIP_TAGS: TripTag[] = [
  { value: "dog", label: "🐕 ידידותי לכלבים" },
  { value: "stroller", label: "👶 מתאים לעגלה" },
  { value: "young_children", label: "🚸 מתאים לילדים קטנים" },
  { value: "wheelchair", label: "♿ נגיש לכיסא גלגלים" },
  { value: "restrooms", label: "🚻 יש שירותים" },
  { value: "shaded", label: "🌳 מסלול מוצל" },
  { value: "water", label: "💧 מים (נחל/בריכה)" },
  { value: "swimming", label: "🏊 מתאים לשחייה" },
  { value: "cycling", label: "🚲 מתאים לרכיבה" },
  { value: "scenic", label: "📸 נקודות תצפית" },
  { value: "climbing", label: "🧗 דורש טיפוס" },
  { value: "night", label: "🌙 טיול לילה" },
  // Self-guided only
  { value: "campfire", label: "🔥 מתאים למדורה", selfGuidedOnly: true },
  { value: "sunrise_sunset", label: "🌅 זריחה/שקיעה", selfGuidedOnly: true },
  { value: "seasonal", label: "🍂 המלצה עונתית", selfGuidedOnly: true },
  { value: "not_rainy", label: "🌧️ לא בימי גשם", selfGuidedOnly: true },
];

export const TAG_LABEL: Record<string, string> = Object.fromEntries(TRIP_TAGS.map((t) => [t.value, t.label]));
