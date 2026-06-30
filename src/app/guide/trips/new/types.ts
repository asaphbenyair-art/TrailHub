export interface TripDayData {
  dayNumber: number;
  title: string;
  description: string;
  distanceKm: string;
  durationHours: string;
  startPoint: string;
  endPoint: string;
  date: string;
  startTime: string;
  isRestDay: boolean;
  equipment: string;
  sources?: SourceMaterial[];
}

export interface PriceTier {
  label: string;    // e.g. "ילדים", "סטודנטים"
  price: string;
}

export interface CouponData {
  code: string;
  discountPct: string;
  maxUses: string;
  expiresAt: string;
}

export interface RegFieldData {
  id: string;
  label: string;
  type: "text" | "boolean" | "select";
  required: boolean;
  options: string[]; // for type === "select"
}

export interface SourceMaterial {
  type: "pdf" | "link";
  url: string;
  title: string;
}

export interface WaypointData {
  lat: number;
  lng: number;
  name: string;
  description: string;
  navInstructions?: string; // turn-by-turn (self-guided)
  guidance?: string;        // guidance material text (self-guided, read-aloud)
  safety?: string;          // segment safety warning (self-guided)
  sources?: SourceMaterial[];
}

export interface WizardData {
  // Step 1
  title: string;
  description: string;
  date: string;
  endDate: string;
  startTime: string;
  region: string;
  meetingPoint: string;
  mainImagePreview: string;
  extraImagePreviews: string[];
  tripType: "DAY_HIKE" | "EXPEDITION" | "MULTI_SITE" | "SELF_GUIDED";
  registrationMode: "FULL_ONLY" | "INDIVIDUAL_DAYS" | "FLEXIBLE";
  accessWindowDays: string; // self-guided: how long buyer has access
  attributeTags: string[];
  tripDays: TripDayData[];

  // Step 2
  routeType: string;
  distanceKm: string;
  durationHours: string;
  waypoints: string;
  routeGpx: string;
  waypointsJson: WaypointData[];

  // Step 3
  difficulty: string;
  ageMin: string;
  ageMax: string;
  fitnessLevel: string;
  maxSpots: string;
  minSpots: string;
  equipmentList: string[];
  whatToBring: string;
  registrationFields: RegFieldData[];

  // Step 4
  price: string;
  individualDayPrice: string;
  priceTiers: PriceTier[];
  coupons: CouponData[];
  cancelTier1Hours: string;
  cancelTier1Refund: string;
  cancelTier2Hours: string;
  cancelTier2Refund: string;
  cancelTier3Refund: string;

  // Step 5
  status: string;
  visibility: "PUBLIC" | "PRIVATE";
  sourceMaterials: SourceMaterial[];
  sourceMaterialsVisibility: "preview" | "during";

  // Team (shared management)
  secondGuideEmail: string;
  secondGuideRole: "SECONDARY" | "EQUAL";
  managerEmails: string[];
}

export const DEFAULT_WIZARD_DATA: WizardData = {
  title: "",
  description: "",
  date: "",
  endDate: "",
  startTime: "07:00",
  region: "",
  meetingPoint: "",
  mainImagePreview: "",
  extraImagePreviews: [],
  tripType: "DAY_HIKE",
  registrationMode: "FULL_ONLY",
  accessWindowDays: "30",
  attributeTags: [],
  tripDays: [],
  routeType: "one-way",
  distanceKm: "",
  durationHours: "",
  waypoints: "",
  routeGpx: "",
  waypointsJson: [],
  difficulty: "MEDIUM",
  ageMin: "",
  ageMax: "",
  fitnessLevel: "",
  maxSpots: "20",
  minSpots: "",
  equipmentList: [],
  whatToBring: "",
  registrationFields: [],
  price: "",
  individualDayPrice: "",
  priceTiers: [],
  coupons: [],
  cancelTier1Hours: "72",
  cancelTier1Refund: "100%",
  cancelTier2Hours: "24",
  cancelTier2Refund: "50%",
  cancelTier3Refund: "0%",
  status: "DRAFT",
  visibility: "PUBLIC",
  sourceMaterials: [],
  sourceMaterialsVisibility: "preview",
  secondGuideEmail: "",
  secondGuideRole: "SECONDARY",
  managerEmails: [],
};
