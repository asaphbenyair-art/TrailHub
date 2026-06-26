export interface TripDayData {
  dayNumber: number;
  title: string;
  description: string;
  distanceKm: string;
  durationHours: string;
  startPoint: string;
  endPoint: string;
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
  tripType: "DAY_HIKE" | "EXPEDITION" | "MULTI_SITE";
  tripDays: TripDayData[];

  // Step 2
  routeType: string;
  distanceKm: string;
  durationHours: string;
  waypoints: string;

  // Step 3
  difficulty: string;
  ageMin: string;
  ageMax: string;
  fitnessLevel: string;
  maxSpots: string;
  minSpots: string;
  equipmentList: string[];
  whatToBring: string;

  // Step 4
  price: string;
  priceTiers: PriceTier[];
  coupons: CouponData[];
  cancelTier1Hours: string;
  cancelTier1Refund: string;
  cancelTier2Hours: string;
  cancelTier2Refund: string;
  cancelTier3Refund: string;

  // Step 5
  status: string;
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
  tripDays: [],
  routeType: "one-way",
  distanceKm: "",
  durationHours: "",
  waypoints: "",
  difficulty: "MEDIUM",
  ageMin: "",
  ageMax: "",
  fitnessLevel: "",
  maxSpots: "20",
  minSpots: "",
  equipmentList: [],
  whatToBring: "",
  price: "",
  priceTiers: [],
  coupons: [],
  cancelTier1Hours: "72",
  cancelTier1Refund: "100%",
  cancelTier2Hours: "24",
  cancelTier2Refund: "50%",
  cancelTier3Refund: "0%",
  status: "DRAFT",
};
