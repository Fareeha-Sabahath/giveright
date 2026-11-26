export type UserRole = 'DONOR' | 'NGO' | 'ADMIN';

export type DonationCategory =
  | 'Food'
  | 'Clothing'
  | 'Books and stationery'
  | 'Medicines'
  | 'Medical supplies'
  | 'Hygiene products'
  | 'Household essentials'
  | 'Other';

export type PerishableFoodType =
  | 'Cooked food'
  | 'Fresh vegetables'
  | 'Fresh fruits'
  | 'Dairy products'
  | 'Other perishable groceries';

export type DonationType = 'One-time' | 'Recurring' | 'Emergency / Surplus';

export type DonationStatus =
  | 'Available'
  | 'Partially Allocated'
  | 'Allocated'
  | 'Completed'
  | 'Expired';

export type NGOPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type RequirementStatus =
  | 'Open'
  | 'Partially Fulfilled'
  | 'Fulfilled'
  | 'Cancelled';

export type ExpiryStatus =
  | 'Expired'
  | 'Critical'
  | 'Urgent'
  | 'Approaching Expiry'
  | 'Fresh';

export type MatchStatus =
  | 'Pending NGO Review'
  | 'Accepted'
  | 'Rejected'
  | 'In Delivery'
  | 'Completed';

export type DeliveryStage =
  | 'Awaiting NGO Acceptance'
  | 'Allocation Confirmed'
  | 'Pickup Scheduled'
  | 'Picked Up'
  | 'In Transit'
  | 'Near Destination'
  | 'Delivered'
  | 'Receipt Confirmed';

export type GPSSource = 'REAL_BROWSER_GPS' | 'SIMULATED_DEMO_GPS';

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string; // Donor full name or Admin name; for NGOs display name
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  createdAt: string;
  // NGO-specific fields
  ngoName?: string;
  contactPerson?: string;
  registrationId?: string;
  description?: string;
  verified?: boolean;
}

export interface DemoAccountSummary {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  city: string;
  verified: boolean;
  passwordStatus: string;
  lastPasswordUpdatedAt: string;
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  itemName: string;
  category: DonationCategory;
  description: string;
  quantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  unit: string;
  pickupLocation: string;
  city: string;
  lat: number;
  lng: number;
  availabilityDate: string;
  donationType: DonationType;
  status: DonationStatus;
  createdAt: string;
  updatedAt: string;
  // Perishable Food Fields
  isPerishable: boolean;
  foodType?: PerishableFoodType;
  preparationDate?: string;
  expiryDateTime?: string;
  storageInstructions?: string;
}

export interface NGORequirement {
  id: string;
  ngoId: string;
  ngoName: string;
  itemName: string;
  category: DonationCategory;
  requiredQuantity: number;
  fulfilledQuantity: number;
  remainingQuantity: number;
  unit: string;
  priority: NGOPriority;
  requiredByDate: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  status: RequirementStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationMatch {
  id: string;
  runId: string;
  donationId: string;
  donorId: string;
  donorName: string;
  requirementId: string;
  ngoId: string;
  ngoName: string;
  itemName: string;
  category: DonationCategory;
  availableBefore: number;
  allocatedQuantity: number;
  remainingAfter: number;
  unit: string;
  distanceKm: number;
  priority: NGOPriority;
  priorityScore: number;
  expiryUrgencyScore: number;
  objectiveContribution: number;
  status: MatchStatus;
  isPerishable: boolean;
  expiryDateTime?: string;
  createdAt: string;
}

export interface ConstraintVerification {
  supplyCapRespected: boolean;
  demandCapRespected: boolean;
  noExpiredFoodAllocated: boolean;
  categoryCompatibilityRespected: boolean;
  integerDecisionVariablesOnly: boolean;
  noDoubleAllocation: boolean;
}

export interface OptimizationRunResult {
  runId: string;
  solverLabel: string;
  isTrueORToolsBackend: boolean;
  executedAt: string;
  durationMs: number;
  objectiveValue: number;
  totalDonationsAvailable: number;
  totalQuantityAvailable: number;
  totalQuantityAllocated: number;
  requirementsFulfilled: number;
  partiallyFulfilledRequirements: number;
  unallocatedQuantity: number;
  numberOfMatches: number;
  excludedExpiredCount: number;
  matches: AllocationMatch[];
  constraintsVerified: ConstraintVerification;
}

export interface DeliveryTimelineEntry {
  stage: DeliveryStage;
  timestamp: string;
  note: string;
  gpsSource: GPSSource;
  lat: number;
  lng: number;
}

export interface DeliveryRecord {
  id: string;
  matchId: string;
  donationId: string;
  donorId: string;
  donorName: string;
  ngoId: string;
  ngoName: string;
  itemName: string;
  quantity: number;
  unit: string;
  pickupLocation: string;
  pickupLat: number;
  pickupLng: number;
  dropLocation: string;
  dropLat: number;
  dropLng: number;
  currentLat: number;
  currentLng: number;
  gpsSource: GPSSource;
  stage: DeliveryStage;
  distanceKm: number;
  estimatedMinutes: number;
  lastUpdated: string;
  timeline: DeliveryTimelineEntry[];
}

export type NotificationType =
  | 'MATCH_CREATED'
  | 'ALLOCATION_ACCEPTED'
  | 'ALLOCATION_REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'DELIVERY_UPDATE'
  | 'DELIVERY_COMPLETED'
  | 'EXPIRY_APPROACHING'
  | 'EXPIRY_CRITICAL'
  | 'EXPIRY_EXPIRED';

export interface AppNotification {
  id: string;
  targetRole: UserRole | 'ALL';
  targetUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface HyderabadHubPreset {
  label: string;
  area: string;
  city: string;
  state: string;
  address: string;
  lat: number;
  lng: number;
}
