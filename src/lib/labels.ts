// Central Hebrew↔English display labels for enum-like values that are stored in
// Hebrew or as codes (regions, difficulty, trip status, trip type, route type).
// Used via the useLabels() hook so cards/badges/filters translate with the UI.

export const REGION_EN: Record<string, string> = {
  "נגב": "Negev",
  "גליל עליון": "Upper Galilee",
  "גליל תחתון": "Lower Galilee",
  "כרמל": "Carmel",
  "גולן": "Golan Heights",
  "ירושלים": "Jerusalem",
  "ים המלח": "Dead Sea",
  "שפלה": "Judean Lowlands",
  "אפרים ומנשה": "Ephraim & Manasseh",
  "ארץ בנימין": "Benjamin Region",
  "יהודה": "Judea",
  "עמק יזרעאל": "Jezreel Valley",
  "ערבה": "Arava",
};

// Guide specialty categories (shown on guide profiles, directory cards, filters).
export const SPECIALTY_EN: Record<string, string> = {
  "טבע": "Nature",
  "ארכיאולוגיה": "Archaeology",
  "היסטוריה": "History",
  "צפרות": "Birdwatching",
  "גיאולוגיה": "Geology",
  "תנ״ך": "Biblical",
  'תנ"ך': "Biblical",
  "מדבר": "Desert",
  "ים ונחלים": "Sea & Streams",
  "ספורט והרפתקאות": "Sports & Adventure",
  "משפחות": "Families",
  "לילה וכוכבים": "Night & Stars",
  "צמחייה ובוטניקה": "Flora & Botany",
  "טיולי אתגר": "Adventure Hikes",
  "מוסיקה": "Music",
};

export const DIFFICULTY_HE: Record<string, string> = { EASY: "קל", MEDIUM: "בינוני", HARD: "קשה", EXTREME: "קיצוני" };
export const DIFFICULTY_EN: Record<string, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard", EXTREME: "Extreme" };

// Predefined equipment presets (guide-suggested list). User-typed items pass through untranslated.
export const EQUIPMENT_EN: Record<string, string> = {
  "נעלי הליכה": "Hiking shoes",
  "כובע ושמשייה": "Hat & sun protection",
  "מים (2 ליטר)": "Water (2 liters)",
  "מים (3 ליטר)": "Water (3 liters)",
  "אוכל לצהריים": "Lunch",
  "מקל הליכה": "Trekking pole",
  "ערכת עזרה ראשונה": "First-aid kit",
  "קרם הגנה": "Sunscreen",
};

export const STATUS_HE: Record<string, string> = {
  OPEN: "פתוח", FULL: "מלא", DRAFT: "טיוטה", PENDING_REVIEW: "ממתין לאישור",
  REJECTED: "נדחה", POSTPONED: "נדחה", CANCELLED: "בוטל", COMPLETED: "הושלם",
};
export const STATUS_EN: Record<string, string> = {
  OPEN: "Open", FULL: "Full", DRAFT: "Draft", PENDING_REVIEW: "Pending review",
  REJECTED: "Rejected", POSTPONED: "Postponed", CANCELLED: "Cancelled", COMPLETED: "Completed",
};

export const TRIP_TYPE_HE: Record<string, string> = {
  DAY_HIKE: "טיול יומי", EXPEDITION: "מסע", MULTI_SITE: "מסע", SELF_GUIDED: "טיול עצמאי",
};
export const TRIP_TYPE_EN: Record<string, string> = {
  DAY_HIKE: "Day hike", EXPEDITION: "Journey", MULTI_SITE: "Journey", SELF_GUIDED: "Self-guided",
};

export const ROUTE_TYPE_HE: Record<string, string> = {
  "one-way": "הלוך", "circular_nature": "מעגלי (טבע)", "circular_urban": "מעגלי (עירוני)",
  "circular": "מעגלי", "linear": "קווי", "out_back": "הלוך-חזור", "loop": "מעגלי",
};
export const ROUTE_TYPE_EN: Record<string, string> = {
  "one-way": "One-way", "circular_nature": "Circular (nature)", "circular_urban": "Circular (urban)",
  "circular": "Circular", "linear": "Linear", "out_back": "Out-and-back", "loop": "Loop",
};
