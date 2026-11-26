import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { FASTAPI_MATCHING_URL } from '../config/firebase';
import {
  createSeedDeliveries,
  createSeedDonations,
  createSeedMatches,
  createSeedNotifications,
  createSeedRequirements,
  DEMO_USERS,
} from '../data/seedData';
import {
  runDemoILPMatching,
  runFastApiORToolsMatching,
} from '../engine/ilpMatcher';
import {
  AllocationMatch,
  AppNotification,
  DeliveryRecord,
  DeliveryStage,
  DemoAccountSummary,
  Donation,
  DonationCategory,
  DonationType,
  GPSSource,
  NGOPriority,
  NGORequirement,
  OptimizationRunResult,
  PerishableFoodType,
  UserProfile,
  UserRole,
} from '../types';
import { evaluateExpiry } from '../utils/expiry';
import { estimateUrbanMinutes, haversineDistanceKm } from '../utils/geo';

const STORAGE_KEY = 'giveright_app_state_v1';

export const DELIVERY_STAGES: DeliveryStage[] = [
  'Awaiting NGO Acceptance',
  'Allocation Confirmed',
  'Pickup Scheduled',
  'Picked Up',
  'In Transit',
  'Near Destination',
  'Delivered',
  'Receipt Confirmed',
];

interface PersistedState {
  users: UserProfile[];
  donations: Donation[];
  requirements: NGORequirement[];
  matches: AllocationMatch[];
  deliveries: DeliveryRecord[];
  notifications: AppNotification[];
  lastOptimizationRun: OptimizationRunResult | null;
  generatedAlertKeys: string[];
}

export interface NewDonationItemInput {
  itemName: string;
  category: DonationCategory;
  description: string;
  quantity: number;
  unit: string;
  pickupLocation: string;
  city: string;
  lat: number;
  lng: number;
  availabilityDate: string;
  donationType: DonationType;
  isPerishable: boolean;
  foodType?: PerishableFoodType;
  preparationDate?: string;
  expiryDateTime?: string;
  storageInstructions?: string;
}

export interface NewRequirementInput {
  itemName: string;
  category: DonationCategory;
  requiredQuantity: number;
  unit: string;
  priority: NGOPriority;
  requiredByDate: string;
}

interface RegisterDonorInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface RegisterNGOInput {
  ngoName: string;
  contactPerson: string;
  email: string;
  phone: string;
  password: string;
  registrationId: string;
  address: string;
  city: string;
  state: string;
  description: string;
  lat: number;
  lng: number;
}

interface RunMatchingExtraOptions {
  extraDonations?: Donation[];
  extraRequirements?: NGORequirement[];
}

interface AppContextValue {
  users: UserProfile[];
  currentUser: UserProfile | null;
  authChecked: boolean;
  donations: Donation[];
  requirements: NGORequirement[];
  matches: AllocationMatch[];
  deliveries: DeliveryRecord[];
  notifications: AppNotification[];
  lastOptimizationRun: OptimizationRunResult | null;
  nowMs: number;
  // Auth
  login: (
    email: string,
    password: string,
    expectedRole?: UserRole
  ) => Promise<{ ok: boolean; error?: string; user?: UserProfile }>;
  registerDonor: (input: RegisterDonorInput) => Promise<{ ok: boolean; error?: string }>;
  registerNGO: (input: RegisterNGOInput) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  // Admin Demo Account Management
  fetchDemoAccounts: () => Promise<{
    ok: boolean;
    accounts?: DemoAccountSummary[];
    error?: string;
  }>;
  resetDemoAccountPassword: (
    accountId: string,
    newPassword: string
  ) => Promise<{
    ok: boolean;
    account?: DemoAccountSummary;
    message?: string;
    error?: string;
  }>;
  // Donations
  addDonationsBatch: (items: NewDonationItemInput[]) => Donation[];
  updateDonation: (id: string, updates: Partial<Donation>) => void;
  deleteDonation: (id: string) => { ok: boolean; error?: string };
  // Requirements
  addRequirement: (input: NewRequirementInput) => NGORequirement | null;
  updateRequirement: (id: string, updates: Partial<NGORequirement>) => void;
  deleteRequirement: (id: string) => { ok: boolean; error?: string };
  // Matching
  runMatching: (
    mode: 'demo_ilp' | 'ortools_fastapi',
    options?: RunMatchingExtraOptions | Donation[]
  ) => Promise<{ ok: boolean; result?: OptimizationRunResult; error?: string }>;
  acceptAllocation: (matchId: string) => void;
  rejectAllocation: (matchId: string) => void;
  // Deliveries
  updateDeliveryStage: (
    deliveryId: string,
    stage: DeliveryStage,
    note?: string,
    coords?: { lat: number; lng: number },
    gpsSource?: GPSSource
  ) => void;
  updateDeliveryGPS: (
    deliveryId: string,
    lat: number,
    lng: number,
    gpsSource: GPSSource
  ) => void;
  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  // Demo management
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function stripPasswordFromUsers(users: UserProfile[]): UserProfile[] {
  return users.map((u) => {
    const clean = { ...u } as UserProfile & { password?: unknown };
    delete clean.password;
    return clean;
  });
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function mapMatchStatusToDeliveryStage(status: AllocationMatch['status']): DeliveryStage {
  if (status === 'Completed') return 'Receipt Confirmed';
  if (status === 'In Delivery') return 'In Transit';
  if (status === 'Accepted') return 'Allocation Confirmed';
  return 'Awaiting NGO Acceptance';
}

function createDeliveryForMatch(
  match: AllocationMatch,
  donations: Donation[],
  requirements: NGORequirement[],
  users: UserProfile[],
  createdAtIso: string
): DeliveryRecord {
  const donation = donations.find((d) => d.id === match.donationId);
  const requirement = requirements.find((r) => r.id === match.requirementId);
  const ngoUser = users.find((u) => u.id === match.ngoId);

  const pickupLat = donation?.lat ?? 17.4375;
  const pickupLng = donation?.lng ?? 78.4483;
  const dropLat = requirement?.lat ?? ngoUser?.lat ?? 17.4948;
  const dropLng = requirement?.lng ?? ngoUser?.lng ?? 78.3996;
  const distanceKm = haversineDistanceKm(pickupLat, pickupLng, dropLat, dropLng);
  const stage = mapMatchStatusToDeliveryStage(match.status);
  const isInitialPending = stage === 'Awaiting NGO Acceptance';

  return {
    id: `DEL-${match.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    matchId: match.id,
    donationId: match.donationId,
    donorId: match.donorId,
    donorName: match.donorName,
    ngoId: match.ngoId,
    ngoName: match.ngoName,
    itemName: match.itemName,
    quantity: match.allocatedQuantity,
    unit: (match.unit || donation?.unit || '').trim(),
    pickupLocation: donation?.pickupLocation ?? 'Hyderabad Donor Hub',
    pickupLat,
    pickupLng,
    dropLocation: requirement?.address ?? ngoUser?.address ?? 'NGO Center',
    dropLat,
    dropLng,
    currentLat: stage === 'Receipt Confirmed' ? dropLat : pickupLat,
    currentLng: stage === 'Receipt Confirmed' ? dropLng : pickupLng,
    gpsSource: 'SIMULATED_DEMO_GPS',
    stage,
    distanceKm,
    estimatedMinutes:
      stage === 'Receipt Confirmed' ? 0 : estimateUrbanMinutes(distanceKm),
    lastUpdated: createdAtIso,
    timeline: [
      {
        stage,
        timestamp: createdAtIso,
        note: isInitialPending
          ? `Matched ${match.allocatedQuantity} ${match.unit} to ${match.ngoName}. Awaiting NGO acceptance.`
          : `${match.ngoName} allocation stage: ${stage}.`,
        gpsSource: 'SIMULATED_DEMO_GPS',
        lat: pickupLat,
        lng: pickupLng,
      },
    ],
  };
}

function reconcileState(rawState: PersistedState): PersistedState {
  const users = stripPasswordFromUsers(rawState.users || []);
  const matches = deduplicateById(rawState.matches || []);

  // Reconcile donation quantities cleanly so Total Donated = Allocated + Remaining
  const activeMatchSums = new Map<string, number>();
  for (const m of matches) {
    if (m.status === 'Rejected') continue;
    activeMatchSums.set(
      m.donationId,
      (activeMatchSums.get(m.donationId) ?? 0) + Math.max(0, Math.floor(m.allocatedQuantity))
    );
  }

  const donations = deduplicateById(rawState.donations || []).map((d) => {
    const total = Math.max(0, Math.floor(Number(d.quantity) || 0));
    const hasMatchRecords = activeMatchSums.has(d.id);
    const rawAlloc = hasMatchRecords
      ? activeMatchSums.get(d.id)!
      : Math.max(0, Math.floor(Number(d.allocatedQuantity) || 0));
    const allocated = Math.min(total, rawAlloc);
    const remaining = Math.max(0, total - allocated);
    return {
      ...d,
      unit: (d.unit || '').trim(),
      quantity: total,
      allocatedQuantity: allocated,
      remainingQuantity: remaining,
    };
  });

  const requirements = deduplicateById(rawState.requirements || []).map((r) => {
    const required = Math.max(0, Math.floor(Number(r.requiredQuantity) || 0));
    const fulfilled = Math.min(required, Math.max(0, Math.floor(Number(r.fulfilledQuantity) || 0)));
    const remaining = Math.max(0, required - fulfilled);
    return {
      ...r,
      unit: (r.unit || '').trim(),
      requiredQuantity: required,
      fulfilledQuantity: fulfilled,
      remainingQuantity: remaining,
    };
  });

  // Ensure one unique delivery record per non-rejected match
  const deliveryByMatchId = new Map<string, DeliveryRecord>();
  for (const del of rawState.deliveries || []) {
    if (!del || !del.matchId) continue;
    if (!deliveryByMatchId.has(del.matchId)) {
      deliveryByMatchId.set(del.matchId, del);
    }
  }

  const reconciledDeliveries: DeliveryRecord[] = [];
  const seenMatchIds = new Set<string>();

  // Keep existing valid deliveries first (synchronizing status if needed)
  for (const del of deliveryByMatchId.values()) {
    const linkedMatch = matches.find((m) => m.id === del.matchId);
    if (linkedMatch && linkedMatch.status === 'Rejected') {
      continue;
    }
    seenMatchIds.add(del.matchId);
    reconciledDeliveries.push(del);
  }

  // Create linked delivery records for any valid allocation missing a delivery
  for (const m of matches) {
    if (m.status === 'Rejected' || seenMatchIds.has(m.id)) continue;
    seenMatchIds.add(m.id);
    reconciledDeliveries.push(
      createDeliveryForMatch(m, donations, requirements, users, m.createdAt || new Date().toISOString())
    );
  }

  return {
    ...rawState,
    users,
    donations,
    requirements,
    matches,
    deliveries: reconciledDeliveries,
  };
}

function createInitialState(): PersistedState {
  return reconcileState({
    users: DEMO_USERS,
    donations: createSeedDonations(),
    requirements: createSeedRequirements(),
    matches: createSeedMatches(),
    deliveries: createSeedDeliveries(),
    notifications: createSeedNotifications(),
    lastOptimizationRun: null,
    generatedAlertKeys: [
      'don-food-50:EXPIRY_CRITICAL',
      'don-expired-15:EXPIRY_EXPIRED',
    ],
  });
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as PersistedState & { currentUserId?: unknown };
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.donations)) {
      return createInitialState();
    }
    return reconcileState({
      users: stripPasswordFromUsers(parsed.users),
      donations: parsed.donations,
      requirements: parsed.requirements,
      matches: parsed.matches,
      deliveries: parsed.deliveries,
      notifications: parsed.notifications,
      lastOptimizationRun: parsed.lastOptimizationRun ?? null,
      generatedAlertKeys: Array.isArray(parsed.generatedAlertKeys)
        ? parsed.generatedAlertKeys
        : [],
    });
  } catch {
    return createInitialState();
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const matchingInFlightRef = React.useRef(false);

  // Persist domain data (without secrets or session credentials) to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          users: stripPasswordFromUsers(state.users),
        })
      );
    } catch {
      // Ignore quota errors gracefully
    }
  }, [state]);

  // Restore server session cleanly via HttpOnly cookie if available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { token?: string; user?: UserProfile };
        if (cancelled || !data.user) return;
        setCurrentUser(data.user);
        if (data.token) setAuthToken(data.token);
        setState((prev) => ({
          ...prev,
          users: prev.users.some((u) => u.id === data.user!.id)
            ? prev.users.map((u) => (u.id === data.user!.id ? data.user! : u))
            : [...prev.users, data.user!],
        }));
      } catch {
        // Unauthenticated
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When authenticated as Admin, sync full user directory from protected admin endpoint
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN' || !authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${authToken}` },
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { users?: UserProfile[] };
        if (!cancelled && Array.isArray(data.users)) {
          setState((prev) => ({ ...prev, users: data.users! }));
        }
      } catch {
        // Ignore gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, authToken]);

  // Live 1-second clock for perishable food countdowns
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Automatic expiry scanner (runs immediately and every 20 seconds)
  useEffect(() => {
    const scanExpiries = () => {
      const currentNow = Date.now();
      setState((prev) => {
        let changed = false;
        const newNotifications: AppNotification[] = [];
        const newAlertKeys = [...prev.generatedAlertKeys];

        const updatedDonations = prev.donations.map((d) => {
          if (
            (d.category === 'Food' || d.isPerishable) &&
            d.expiryDateTime &&
            d.status !== 'Completed'
          ) {
            const evalRes = evaluateExpiry(d.expiryDateTime, currentNow);

            if (evalRes.isExpired && d.status !== 'Expired') {
              changed = true;
              const key = `${d.id}:EXPIRY_EXPIRED`;
              if (!newAlertKeys.includes(key)) {
                newAlertKeys.push(key);
                newNotifications.push({
                  id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  targetRole: 'ALL',
                  targetUserId: d.donorId,
                  type: 'EXPIRY_EXPIRED',
                  title: `Food Expired: ${d.itemName}`,
                  message: `${d.remainingQuantity} ${d.unit} at ${d.pickupLocation} has expired and is blocked from allocation.`,
                  read: false,
                  createdAt: new Date(currentNow).toISOString(),
                  relatedId: d.id,
                });
              }
              return {
                ...d,
                status: 'Expired' as const,
                updatedAt: new Date(currentNow).toISOString(),
              };
            }

            if (!evalRes.isExpired && d.remainingQuantity > 0) {
              if (evalRes.status === 'Critical') {
                const key = `${d.id}:EXPIRY_CRITICAL`;
                if (!newAlertKeys.includes(key)) {
                  newAlertKeys.push(key);
                  changed = true;
                  newNotifications.push({
                    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    targetRole: 'ALL',
                    targetUserId: d.donorId,
                    type: 'EXPIRY_CRITICAL',
                    title: `Critical (<6h): ${d.itemName}`,
                    message: `${d.remainingQuantity} ${d.unit} expires in ${evalRes.countdownLabel}. Urgent allocation needed.`,
                    read: false,
                    createdAt: new Date(currentNow).toISOString(),
                    relatedId: d.id,
                  });
                }
              } else if (evalRes.status === 'Approaching Expiry' || evalRes.status === 'Urgent') {
                const key = `${d.id}:EXPIRY_APPROACHING`;
                if (!newAlertKeys.includes(key)) {
                  newAlertKeys.push(key);
                  changed = true;
                  newNotifications.push({
                    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    targetRole: 'ALL',
                    targetUserId: d.donorId,
                    type: 'EXPIRY_APPROACHING',
                    title: `Approaching Expiry: ${d.itemName}`,
                    message: `${d.remainingQuantity} ${d.unit} has ${evalRes.countdownLabel} remaining.`,
                    read: false,
                    createdAt: new Date(currentNow).toISOString(),
                    relatedId: d.id,
                  });
                }
              }
            }
          }
          return d;
        });

        if (!changed && newNotifications.length === 0) return prev;
        return {
          ...prev,
          donations: updatedDonations,
          notifications: [...newNotifications, ...prev.notifications],
          generatedAlertKeys: newAlertKeys,
        };
      });
    };

    scanExpiries();
    const interval = window.setInterval(scanExpiries, 20000);
    return () => window.clearInterval(interval);
  }, []);

  const login = async (email: string, password: string, expectedRole?: UserRole) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, expectedRole }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: UserProfile;
        error?: string;
      };
      if (!res.ok || !data.user || !data.token) {
        return {
          ok: false,
          error: data.error ?? 'Invalid email or password. Please verify your credentials.',
        };
      }
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setState((prev) => ({
        ...prev,
        users: prev.users.some((u) => u.id === data.user!.id)
          ? prev.users.map((u) => (u.id === data.user!.id ? data.user! : u))
          : [...prev.users, data.user!],
      }));
      return { ok: true, user: data.user };
    } catch {
      return { ok: false, error: 'Unable to reach authentication service.' };
    }
  };

  const registerDonor = async (input: RegisterDonorInput) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...input, role: 'DONOR' }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: UserProfile;
        error?: string;
      };
      if (!res.ok || !data.user || !data.token) {
        return { ok: false, error: data.error ?? 'Registration failed.' };
      }
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setState((prev) => ({
        ...prev,
        users: [...prev.users, data.user!],
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Unable to complete registration.' };
    }
  };

  const registerNGO = async (input: RegisterNGOInput) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...input, role: 'NGO' }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: UserProfile;
        error?: string;
      };
      if (!res.ok || !data.user || !data.token) {
        return { ok: false, error: data.error ?? 'Registration failed.' };
      }
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setState((prev) => ({
        ...prev,
        users: [...prev.users, data.user!],
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Unable to complete registration.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        credentials: 'include',
      });
    } catch {
      // Clear client session regardless
    }
    setAuthToken(null);
    setCurrentUser(null);
  };

  const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
    let nextUser: UserProfile | null = null;
    if (currentUser && currentUser.id === userId && authToken) {
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          credentials: 'include',
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const data = (await res.json()) as { user?: UserProfile };
          if (data.user) {
            nextUser = data.user;
            setCurrentUser(data.user);
          }
        }
      } catch {
        // Fallback to local profile state sync below
      }
    }

    setState((prev) => {
      const updatedUsers = prev.users.map((u) => {
        if (u.id !== userId) return u;
        if (nextUser) return nextUser;
        const merged = { ...u, ...updates };
        if (merged.role === 'NGO' && updates.ngoName) {
          merged.name = updates.ngoName;
        }
        return merged;
      });
      const updatedUser = updatedUsers.find((u) => u.id === userId);
      const displayName = updatedUser?.ngoName || updatedUser?.name;

      return {
        ...prev,
        users: updatedUsers,
        donations:
          updatedUser?.role === 'DONOR' && displayName
            ? prev.donations.map((d) =>
                d.donorId === userId ? { ...d, donorName: displayName } : d
              )
            : prev.donations,
        requirements:
          updatedUser?.role === 'NGO' && displayName
            ? prev.requirements.map((r) =>
                r.ngoId === userId ? { ...r, ngoName: displayName } : r
              )
            : prev.requirements,
      };
    });
  };

  const fetchDemoAccounts = async () => {
    if (!authToken || currentUser?.role !== 'ADMIN') {
      return { ok: false, error: 'Forbidden: Admin authentication required.' };
    }
    try {
      const res = await fetch('/api/admin/demo-accounts', {
        method: 'GET',
        headers: { Authorization: `Bearer ${authToken}` },
        credentials: 'include',
      });
      const data = (await res.json()) as {
        accounts?: DemoAccountSummary[];
        error?: string;
      };
      if (!res.ok || !data.accounts) {
        return { ok: false, error: data.error ?? 'Failed to load demo accounts.' };
      }
      return { ok: true, accounts: data.accounts };
    } catch {
      return { ok: false, error: 'Network error loading demo accounts.' };
    }
  };

  const resetDemoAccountPassword = async (
    accountId: string,
    newPassword: string
  ) => {
    if (!authToken || currentUser?.role !== 'ADMIN') {
      return { ok: false, error: 'Forbidden: Admin authentication required.' };
    }
    try {
      const res = await fetch(
        `/api/admin/demo-accounts/${encodeURIComponent(accountId)}/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({ newPassword }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        account?: DemoAccountSummary;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error ?? 'Failed to reset password.' };
      }
      return { ok: true, account: data.account, message: data.message };
    } catch {
      return { ok: false, error: 'Network error resetting password.' };
    }
  };

  const addDonationsBatch = (items: NewDonationItemInput[]) => {
    if (!currentUser) return [];
    const nowIso = new Date().toISOString();
    const created: Donation[] = items.map((item, idx) => {
      const qty = Math.max(1, Math.floor(item.quantity));
      const isExp =
        (item.category === 'Food' || item.isPerishable) &&
        item.expiryDateTime &&
        evaluateExpiry(item.expiryDateTime).isExpired;

      return {
        id: `don-${Date.now()}-${idx}`,
        donorId: currentUser.id,
        donorName: currentUser.name,
        itemName: item.itemName.trim(),
        category: item.category,
        description: item.description.trim(),
        quantity: qty,
        allocatedQuantity: 0,
        remainingQuantity: qty,
        unit: item.unit.trim(),
        pickupLocation: item.pickupLocation.trim(),
        city: item.city.trim(),
        lat: item.lat,
        lng: item.lng,
        availabilityDate: item.availabilityDate,
        donationType: item.donationType,
        status: isExp ? 'Expired' : 'Available',
        createdAt: nowIso,
        updatedAt: nowIso,
        isPerishable: item.category === 'Food' ? item.isPerishable : false,
        foodType: item.isPerishable ? item.foodType : undefined,
        preparationDate: item.isPerishable ? item.preparationDate : undefined,
        expiryDateTime: item.isPerishable ? item.expiryDateTime : undefined,
        storageInstructions: item.isPerishable ? item.storageInstructions : undefined,
      };
    });

    setState((prev) => ({
      ...prev,
      donations: [...created, ...prev.donations],
    }));
    return created;
  };

  const updateDonation = (id: string, updates: Partial<Donation>) => {
    setState((prev) => ({
      ...prev,
      donations: prev.donations.map((d) => {
        if (d.id !== id) return d;
        const nextQty =
          updates.quantity !== undefined
            ? Math.max(d.allocatedQuantity, Math.floor(updates.quantity))
            : d.quantity;
        const nextRemaining = Math.max(0, nextQty - d.allocatedQuantity);
        let nextStatus = updates.status ?? d.status;
        if (d.isPerishable && (updates.expiryDateTime ?? d.expiryDateTime)) {
          if (evaluateExpiry(updates.expiryDateTime ?? d.expiryDateTime).isExpired) {
            nextStatus = 'Expired';
          } else if (nextStatus === 'Expired') {
            nextStatus = nextRemaining === 0 ? 'Allocated' : 'Available';
          }
        }
        return {
          ...d,
          ...updates,
          quantity: nextQty,
          remainingQuantity: nextRemaining,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const deleteDonation = (id: string) => {
    const target = state.donations.find((d) => d.id === id);
    if (!target) return { ok: false, error: 'Donation not found.' };
    if (target.allocatedQuantity > 0 && currentUser?.role !== 'ADMIN') {
      return {
        ok: false,
        error: 'Cannot delete a donation that already has active NGO allocations.',
      };
    }
    setState((prev) => ({
      ...prev,
      donations: prev.donations.filter((d) => d.id !== id),
    }));
    return { ok: true };
  };

  const addRequirement = (input: NewRequirementInput) => {
    if (!currentUser) return null;
    const nowIso = new Date().toISOString();
    const qty = Math.max(1, Math.floor(input.requiredQuantity));
    const newReq: NGORequirement = {
      id: `req-${Date.now()}`,
      ngoId: currentUser.id,
      ngoName: currentUser.ngoName || currentUser.name,
      itemName: input.itemName.trim(),
      category: input.category,
      requiredQuantity: qty,
      fulfilledQuantity: 0,
      remainingQuantity: qty,
      unit: input.unit.trim(),
      priority: input.priority,
      requiredByDate: input.requiredByDate,
      city: currentUser.city,
      address: currentUser.address,
      lat: currentUser.lat,
      lng: currentUser.lng,
      status: 'Open',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setState((prev) => ({
      ...prev,
      requirements: [newReq, ...prev.requirements],
    }));
    return newReq;
  };

  const updateRequirement = (id: string, updates: Partial<NGORequirement>) => {
    setState((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r) => {
        if (r.id !== id) return r;
        const nextRequired =
          updates.requiredQuantity !== undefined
            ? Math.max(r.fulfilledQuantity, Math.floor(updates.requiredQuantity))
            : r.requiredQuantity;
        const nextRemaining = Math.max(0, nextRequired - r.fulfilledQuantity);
        const nextStatus =
          updates.status ??
          (nextRemaining === 0
            ? 'Fulfilled'
            : r.fulfilledQuantity > 0
            ? 'Partially Fulfilled'
            : 'Open');
        return {
          ...r,
          ...updates,
          requiredQuantity: nextRequired,
          remainingQuantity: nextRemaining,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const deleteRequirement = (id: string) => {
    const target = state.requirements.find((r) => r.id === id);
    if (!target) return { ok: false, error: 'Requirement not found.' };
    if (target.fulfilledQuantity > 0 && currentUser?.role !== 'ADMIN') {
      return {
        ok: false,
        error: 'Cannot delete a requirement that already has matched allocations.',
      };
    }
    setState((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((r) => r.id !== id),
    }));
    return { ok: true };
  };

  const runMatching = async (
    mode: 'demo_ilp' | 'ortools_fastapi',
    options?: RunMatchingExtraOptions | Donation[]
  ) => {
    if (matchingInFlightRef.current) {
      return { ok: false, error: 'Donation matching is already running.' };
    }
    matchingInFlightRef.current = true;
    try {
      const extraDonations = Array.isArray(options)
        ? options
        : options?.extraDonations;
      const extraRequirements = Array.isArray(options)
        ? undefined
        : options?.extraRequirements;

      const existingDonationIds = new Set(state.donations.map((d) => d.id));
      const donationsForSolver = extraDonations?.length
        ? [
            ...extraDonations.filter((d) => !existingDonationIds.has(d.id)),
            ...state.donations,
          ]
        : state.donations;

      const existingReqIds = new Set(state.requirements.map((r) => r.id));
      const requirementsForSolver = extraRequirements?.length
        ? [
            ...extraRequirements.filter((r) => !existingReqIds.has(r.id)),
            ...state.requirements,
          ]
        : state.requirements;

      const result =
        mode === 'ortools_fastapi'
          ? await runFastApiORToolsMatching(
              FASTAPI_MATCHING_URL,
              donationsForSolver,
              requirementsForSolver
            )
          : runDemoILPMatching(donationsForSolver, requirementsForSolver, Date.now());

      const nowIso = new Date().toISOString();

      setState((prev) => {
        const donAllocDelta = new Map<string, number>();
        const reqFulfillDelta = new Map<string, number>();

        for (const m of result.matches) {
          donAllocDelta.set(
            m.donationId,
            (donAllocDelta.get(m.donationId) ?? 0) + m.allocatedQuantity
          );
          reqFulfillDelta.set(
            m.requirementId,
            (reqFulfillDelta.get(m.requirementId) ?? 0) + m.allocatedQuantity
          );
        }

        const updatedDonations = prev.donations.map((d) => {
          const delta = donAllocDelta.get(d.id) ?? 0;
          if (delta === 0) return d;
          const nextAlloc = d.allocatedQuantity + delta;
          const nextRem = Math.max(0, d.quantity - nextAlloc);
          return {
            ...d,
            allocatedQuantity: nextAlloc,
            remainingQuantity: nextRem,
            status:
              nextRem === 0
                ? ('Allocated' as const)
                : ('Partially Allocated' as const),
            updatedAt: nowIso,
          };
        });

        const updatedRequirements = prev.requirements.map((r) => {
          const delta = reqFulfillDelta.get(r.id) ?? 0;
          if (delta === 0) return r;
          const nextFul = r.fulfilledQuantity + delta;
          const nextRem = Math.max(0, r.requiredQuantity - nextFul);
          return {
            ...r,
            fulfilledQuantity: nextFul,
            remainingQuantity: nextRem,
            status:
              nextRem === 0
                ? ('Fulfilled' as const)
                : ('Partially Fulfilled' as const),
            updatedAt: nowIso,
          };
        });

        const matchNotifications: AppNotification[] = result.matches.flatMap((m) => [
          {
            id: `notif-d-${m.id}`,
            targetRole: 'DONOR' as const,
            targetUserId: m.donorId,
            type: 'MATCH_CREATED' as const,
            title: `New Match: ${m.itemName}`,
            message: `${m.allocatedQuantity} ${m.unit} matched to ${m.ngoName} (${m.distanceKm} km away).`,
            read: false,
            createdAt: nowIso,
            relatedId: m.id,
          },
          {
            id: `notif-n-${m.id}`,
            targetRole: 'NGO' as const,
            targetUserId: m.ngoId,
            type: 'MATCH_CREATED' as const,
            title: `Allocation Ready: ${m.itemName}`,
            message: `${m.allocatedQuantity} ${m.unit} from ${m.donorName} is awaiting your review.`,
            read: false,
            createdAt: nowIso,
            relatedId: m.id,
          },
        ]);

        const mergedMatches = deduplicateById([...result.matches, ...prev.matches]);
        const existingMatchIds = new Set(prev.deliveries.map((d) => d.matchId));
        const newDeliveries: DeliveryRecord[] = result.matches
          .filter((m) => m.status !== 'Rejected' && !existingMatchIds.has(m.id))
          .map((m) =>
            createDeliveryForMatch(m, updatedDonations, updatedRequirements, prev.users, nowIso)
          );

        return {
          ...prev,
          donations: updatedDonations,
          requirements: updatedRequirements,
          matches: mergedMatches,
          deliveries: [...newDeliveries, ...prev.deliveries],
          notifications: [...matchNotifications, ...prev.notifications],
          lastOptimizationRun: result,
        };
      });

      return { ok: true, result };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to execute ILP matching engine.',
      };
    } finally {
      matchingInFlightRef.current = false;
    }
  };

  const acceptAllocation = (matchId: string) => {
    const nowIso = new Date().toISOString();
    setState((prev) => {
      const targetMatch = prev.matches.find((m) => m.id === matchId);
      if (!targetMatch || targetMatch.status !== 'Pending NGO Review') return prev;

      const existingDelivery = prev.deliveries.find((d) => d.matchId === matchId);
      let updatedDeliveries: DeliveryRecord[];
      let deliveryId: string;

      if (existingDelivery) {
        deliveryId = existingDelivery.id;
        updatedDeliveries = prev.deliveries.map((d) => {
          if (d.matchId !== matchId) return d;
          return {
            ...d,
            stage: 'Allocation Confirmed',
            lastUpdated: nowIso,
            timeline: [
              ...d.timeline,
              {
                stage: 'Allocation Confirmed',
                timestamp: nowIso,
                note: `${targetMatch.ngoName} accepted allocation of ${targetMatch.allocatedQuantity} ${targetMatch.unit}. Ready for pickup scheduling.`,
                gpsSource: d.gpsSource,
                lat: d.currentLat,
                lng: d.currentLng,
              },
            ],
          };
        });
      } else {
        const created = createDeliveryForMatch(
          { ...targetMatch, status: 'Accepted' },
          prev.donations,
          prev.requirements,
          prev.users,
          nowIso
        );
        deliveryId = created.id;
        updatedDeliveries = [created, ...prev.deliveries];
      }

      const notif: AppNotification = {
        id: `notif-acc-${Date.now()}`,
        targetRole: 'DONOR',
        targetUserId: targetMatch.donorId,
        type: 'ALLOCATION_ACCEPTED',
        title: `Allocation Accepted by ${targetMatch.ngoName}`,
        message: `${targetMatch.allocatedQuantity} ${targetMatch.unit} of ${targetMatch.itemName} confirmed for pickup & delivery tracking.`,
        read: false,
        createdAt: nowIso,
        relatedId: deliveryId,
      };

      return {
        ...prev,
        matches: prev.matches.map((m) =>
          m.id === matchId ? { ...m, status: 'Accepted' } : m
        ),
        deliveries: updatedDeliveries,
        notifications: [notif, ...prev.notifications],
      };
    });
  };

  const rejectAllocation = (matchId: string) => {
    const nowIso = new Date().toISOString();
    setState((prev) => {
      const targetMatch = prev.matches.find((m) => m.id === matchId);
      if (!targetMatch || targetMatch.status !== 'Pending NGO Review') return prev;

      const updatedDonations = prev.donations.map((d) => {
        if (d.id !== targetMatch.donationId) return d;
        const nextAlloc = Math.max(0, d.allocatedQuantity - targetMatch.allocatedQuantity);
        const nextRem = Math.min(d.quantity, d.quantity - nextAlloc);
        const nextStatus =
          d.status === 'Expired'
            ? ('Expired' as const)
            : nextAlloc === 0
            ? ('Available' as const)
            : ('Partially Allocated' as const);
        return {
          ...d,
          allocatedQuantity: nextAlloc,
          remainingQuantity: nextRem,
          status: nextStatus,
          updatedAt: nowIso,
        };
      });

      const updatedRequirements = prev.requirements.map((r) => {
        if (r.id !== targetMatch.requirementId) return r;
        const nextFul = Math.max(0, r.fulfilledQuantity - targetMatch.allocatedQuantity);
        const nextRem = Math.min(r.requiredQuantity, r.requiredQuantity - nextFul);
        return {
          ...r,
          fulfilledQuantity: nextFul,
          remainingQuantity: nextRem,
          status:
            nextFul === 0 ? ('Open' as const) : ('Partially Fulfilled' as const),
          updatedAt: nowIso,
        };
      });

      const notif: AppNotification = {
        id: `notif-rej-${Date.now()}`,
        targetRole: 'DONOR',
        targetUserId: targetMatch.donorId,
        type: 'ALLOCATION_REJECTED',
        title: `Allocation Declined: ${targetMatch.itemName}`,
        message: `${targetMatch.ngoName} declined the allocation; ${targetMatch.allocatedQuantity} ${targetMatch.unit} returned to available pool.`,
        read: false,
        createdAt: nowIso,
        relatedId: targetMatch.id,
      };

      return {
        ...prev,
        donations: updatedDonations,
        requirements: updatedRequirements,
        matches: prev.matches.map((m) =>
          m.id === matchId ? { ...m, status: 'Rejected' } : m
        ),
        deliveries: prev.deliveries.filter((d) => d.matchId !== matchId),
        notifications: [notif, ...prev.notifications],
      };
    });
  };

  const updateDeliveryStage = (
    deliveryId: string,
    stage: DeliveryStage,
    note?: string,
    coords?: { lat: number; lng: number },
    gpsSource: GPSSource = 'SIMULATED_DEMO_GPS'
  ) => {
    const nowIso = new Date().toISOString();
    setState((prev) => {
      const target = prev.deliveries.find((d) => d.id === deliveryId);
      if (!target) return prev;

      const stageProgressMap: Record<DeliveryStage, number> = {
        'Awaiting NGO Acceptance': 0,
        'Allocation Confirmed': 0,
        'Pickup Scheduled': 0.05,
        'Picked Up': 0.2,
        'In Transit': 0.58,
        'Near Destination': 0.88,
        Delivered: 1,
        'Receipt Confirmed': 1,
      };
      const t = stageProgressMap[stage];
      const nextLat =
        coords?.lat ?? target.pickupLat + (target.dropLat - target.pickupLat) * t;
      const nextLng =
        coords?.lng ?? target.pickupLng + (target.dropLng - target.pickupLng) * t;

      const remDist = haversineDistanceKm(
        nextLat,
        nextLng,
        target.dropLat,
        target.dropLng
      );
      const remMins =
        stage === 'Delivered' || stage === 'Receipt Confirmed'
          ? 0
          : estimateUrbanMinutes(remDist);

      const updatedDeliveries = prev.deliveries.map((d) => {
        if (d.id !== deliveryId) return d;
        return {
          ...d,
          stage,
          currentLat: nextLat,
          currentLng: nextLng,
          gpsSource,
          distanceKm: remDist,
          estimatedMinutes: remMins,
          lastUpdated: nowIso,
          timeline: [
            ...d.timeline,
            {
              stage,
              timestamp: nowIso,
              note: note?.trim() || `Delivery status updated to ${stage}.`,
              gpsSource,
              lat: nextLat,
              lng: nextLng,
            },
          ],
        };
      });

      const updatedMatches = prev.matches.map((m) => {
        if (m.id !== target.matchId) return m;
        if (stage === 'Receipt Confirmed') {
          return { ...m, status: 'Completed' as const };
        }
        return { ...m, status: 'In Delivery' as const };
      });

      let updatedDonations = prev.donations;
      if (stage === 'Receipt Confirmed') {
        updatedDonations = prev.donations.map((don) => {
          if (don.id !== target.donationId) return don;
          const allMatchesForDon = updatedMatches.filter(
            (m) => m.donationId === don.id && m.status !== 'Rejected'
          );
          const allDone =
            don.remainingQuantity === 0 &&
            allMatchesForDon.length > 0 &&
            allMatchesForDon.every((m) => m.status === 'Completed');
          return allDone
            ? { ...don, status: 'Completed' as const, updatedAt: nowIso }
            : don;
        });
      }

      const notifType =
        stage === 'Pickup Scheduled'
          ? 'PICKUP_SCHEDULED'
          : stage === 'Receipt Confirmed' || stage === 'Delivered'
          ? 'DELIVERY_COMPLETED'
          : 'DELIVERY_UPDATE';

      const newNotifs: AppNotification[] = [
        {
          id: `notif-del-d-${Date.now()}`,
          targetRole: 'DONOR',
          targetUserId: target.donorId,
          type: notifType,
          title: `Delivery ${stage}: ${target.itemName}`,
          message: `${target.quantity} ${target.unit} en route to ${target.ngoName} (${stage}).`,
          read: false,
          createdAt: nowIso,
          relatedId: target.id,
        },
        {
          id: `notif-del-n-${Date.now() + 1}`,
          targetRole: 'NGO',
          targetUserId: target.ngoId,
          type: notifType,
          title: `Delivery ${stage}: ${target.itemName}`,
          message: `${target.quantity} ${target.unit} from ${target.donorName} is now ${stage}.`,
          read: false,
          createdAt: nowIso,
          relatedId: target.id,
        },
      ];

      return {
        ...prev,
        deliveries: updatedDeliveries,
        matches: updatedMatches,
        donations: updatedDonations,
        notifications: [...newNotifs, ...prev.notifications],
      };
    });
  };

  const updateDeliveryGPS = (
    deliveryId: string,
    lat: number,
    lng: number,
    gpsSource: GPSSource
  ) => {
    const nowIso = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      deliveries: prev.deliveries.map((d) => {
        if (d.id !== deliveryId) return d;
        const remDist = haversineDistanceKm(lat, lng, d.dropLat, d.dropLng);
        return {
          ...d,
          currentLat: lat,
          currentLng: lng,
          gpsSource,
          distanceKm: remDist,
          estimatedMinutes:
            d.stage === 'Delivered' || d.stage === 'Receipt Confirmed'
              ? 0
              : estimateUrbanMinutes(remDist),
          lastUpdated: nowIso,
        };
      }),
    }));
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  const resetDemoData = () => {
    const fresh = createInitialState();
    setState(fresh);
  };

  return (
    <AppContext.Provider
      value={{
        users: state.users,
        currentUser,
        authChecked,
        donations: state.donations,
        requirements: state.requirements,
        matches: state.matches,
        deliveries: state.deliveries,
        notifications: state.notifications,
        lastOptimizationRun: state.lastOptimizationRun,
        nowMs,
        login,
        registerDonor,
        registerNGO,
        logout,
        updateProfile,
        fetchDemoAccounts,
        resetDemoAccountPassword,
        addDonationsBatch,
        updateDonation,
        deleteDonation,
        addRequirement,
        updateRequirement,
        deleteRequirement,
        runMatching,
        acceptAllocation,
        rejectAllocation,
        updateDeliveryStage,
        updateDeliveryGPS,
        markNotificationRead,
        markAllNotificationsRead,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
