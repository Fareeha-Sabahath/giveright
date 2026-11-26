import {
  AllocationMatch,
  ConstraintVerification,
  Donation,
  NGOPriority,
  NGORequirement,
  OptimizationRunResult,
} from '../types';
import { evaluateExpiry } from '../utils/expiry';
import { haversineDistanceKm } from '../utils/geo';

/**
 * GiveRight Integer Linear Programming (ILP) Matching Engine
 *
 * IMPORTANT TRANSPARENCY NOTE:
 * This TypeScript module implements a client-side Demo Exact Integer Linear Programming
 * solver (via Minimum-Cost / Maximum-Weight Integer Bipartite Flow over Totally Unimodular
 * network constraints). It guarantees exact integer decision variables x_{i,j} ∈ Z_{>=0}
 * and global optimality for the bipartite allocation formulation below.
 * For production execution with Google OR-Tools (SCIP/CBC), use `/backend/main.py`.
 *
 * MATHEMATICAL FORMULATION:
 * Decision Variables:
 *   x_{i,j} ∈ Z_{>= 0}  (integer quantity allocated from donation i to requirement j)
 *
 * Objective Function (Maximize Z):
 *   Maximize Σ_{(i,j) ∈ E} x_{i,j} * (W_fulfill + W_priority(j) + W_expiry(i) - W_dist * d_{i,j})
 *
 * Subject to:
 *   1. Supply Cap:        Σ_j x_{i,j} <= remainingQuantity_i    ∀ donation i
 *   2. Demand Cap:        Σ_i x_{i,j} <= remainingQuantity_j    ∀ requirement j
 *   3. Compatibility:     x_{i,j} = 0 if (i,j) ∉ E (category/unit/item incompatible)
 *   4. Expiry Guard:      x_{i,j} = 0 if donation i is expired food (expiryDateTime <= now)
 *   5. Integrality:       x_{i,j} ∈ Z_{>= 0}
 */

const PRIORITY_WEIGHTS: Record<NGOPriority, number> = {
  Urgent: 400,
  High: 250,
  Medium: 120,
  Low: 40,
};

const BASE_FULFILLMENT_WEIGHT = 1000;
const DISTANCE_PENALTY_PER_KM = 2.5;

const STOP_WORDS = new Set([
  'fresh',
  'cooked',
  'packed',
  'packets',
  'packet',
  'bundles',
  'bundle',
  'kits',
  'kit',
  'kg',
  'liters',
  'boxes',
  'box',
  'and',
  'of',
  'the',
  'for',
  'perishable',
  'surplus',
  'donation',
  'items',
  'item',
  'general',
  'essentials',
]);

function extractItemTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u === 'kilograms' || u === 'kgs') return 'kg';
  if (u === 'litres' || u === 'l' || u === 'liter') return 'liters';
  if (u === 'pcs' || u === 'pieces' || u === 'units') return 'units';
  if (u === 'packet' || u === 'packs' || u === 'meals') return 'packets';
  if (u === 'kit') return 'kits';
  if (u === 'bundle') return 'bundles';
  return u;
}

export function areItemsCompatible(
  donation: Donation,
  requirement: NGORequirement
): boolean {
  if (donation.category !== requirement.category) {
    return false;
  }

  const dUnit = normalizeUnit(donation.unit);
  const rUnit = normalizeUnit(requirement.unit);
  const unitsCompatible =
    dUnit === rUnit ||
    (dUnit === 'units' && (rUnit === 'packets' || rUnit === 'kits' || rUnit === 'bundles')) ||
    (rUnit === 'units' && (dUnit === 'packets' || dUnit === 'kits' || dUnit === 'bundles'));

  if (!unitsCompatible) {
    return false;
  }

  const dTokens = extractItemTokens(donation.itemName);
  const rTokens = extractItemTokens(requirement.itemName);

  // If both have specific item tokens (e.g. "rice" vs "rice", "notebooks" vs "notebooks", "milk" vs "dairy milk")
  // require semantic overlap or known food/category group alignment
  if (dTokens.length > 0 && rTokens.length > 0) {
    const hasDirectOverlap = dTokens.some((dt) =>
      rTokens.some((rt) => rt.includes(dt) || dt.includes(rt))
    );
    if (hasDirectOverlap) return true;

    // Special semantic aliases for Indian NGO items
    const dStr = donation.itemName.toLowerCase();
    const rStr = requirement.itemName.toLowerCase();
    const aliasGroups = [
      ['rice', 'paddy', 'grain', 'sona masoori'],
      ['food packet', 'meal', 'pulao', 'cooked', 'dinner', 'lunch', 'tiffin'],
      ['milk', 'dairy', 'curd', 'paneer'],
      ['vegetable', 'produce', 'greens', 'tomato', 'onion', 'potato'],
      ['fruit', 'banana', 'apple', 'orange'],
      ['notebook', 'stationery', 'book', 'pen', 'pencil'],
      ['clothing', 'clothes', 'shirt', 'blanket', 'garment', 'apparel'],
      ['hygiene', 'soap', 'sanitizer', 'sanitary', 'toiletries'],
      ['medicine', 'tablet', 'paracetamol', 'ors', 'syrup'],
      ['medical', 'bandage', 'mask', 'gloves', 'first aid'],
    ];

    for (const group of aliasGroups) {
      const dMatch = group.some((kw) => dStr.includes(kw));
      const rMatch = group.some((kw) => rStr.includes(kw));
      if (dMatch && rMatch) return true;
    }

    return false;
  }

  return true;
}

interface FlowEdge {
  to: number;
  rev: number;
  cap: number;
  cost: number; // Negative of objective weight per unit (since we minimize cost = maximize weight)
  flow: number;
  isMatchEdge?: boolean;
  donationIdx?: number;
  reqIdx?: number;
}

/**
 * Exact Integer Min-Cost Max-Flow (Successive Shortest Augmenting Path with SPFA)
 * Because every capacity is integer and the bipartite constraint matrix is totally unimodular,
 * this computes the exact global optimum for the integer linear program x_{i,j} ∈ Z_{>=0}.
 */
export function runDemoILPMatching(
  donations: Donation[],
  requirements: NGORequirement[],
  nowMs: number = Date.now()
): OptimizationRunResult {
  const startPerf = performance.now();
  const runId = `ILP-${Date.now().toString(36).toUpperCase()}`;

  // 1. Filter eligible donations (available remaining > 0 and NOT expired food)
  let excludedExpiredCount = 0;
  const eligibleDonations: { donation: Donation; expiryUrgencyScore: number }[] = [];

  for (const d of donations) {
    const remaining = Math.floor(d.remainingQuantity);
    if (remaining <= 0 || d.status === 'Completed' || d.status === 'Expired') {
      if (d.status === 'Expired') excludedExpiredCount++;
      continue;
    }
    if (d.category === 'Food' || d.isPerishable) {
      const expiryEval = evaluateExpiry(d.expiryDateTime, nowMs);
      if (expiryEval.isExpired) {
        excludedExpiredCount++;
        continue;
      }
      eligibleDonations.push({
        donation: d,
        expiryUrgencyScore: expiryEval.urgencyScore,
      });
    } else {
      eligibleDonations.push({
        donation: d,
        expiryUrgencyScore: 0,
      });
    }
  }

  // 2. Filter eligible NGO requirements (open / partially fulfilled with remaining demand > 0)
  const eligibleReqs = requirements.filter(
    (r) =>
      Math.floor(r.remainingQuantity) > 0 &&
      (r.status === 'Open' || r.status === 'Partially Fulfilled')
  );

  const numD = eligibleDonations.length;
  const numR = eligibleReqs.length;
  const SOURCE = 0;
  const SINK = numD + numR + 1;
  const totalNodes = SINK + 1;

  const adj: FlowEdge[][] = Array.from({ length: totalNodes }, () => []);

  const addEdge = (
    from: number,
    to: number,
    cap: number,
    cost: number,
    meta?: { isMatchEdge: boolean; donationIdx: number; reqIdx: number }
  ) => {
    const fwd: FlowEdge = {
      to,
      rev: adj[to].length,
      cap,
      cost,
      flow: 0,
      ...meta,
    };
    const bwd: FlowEdge = {
      to: from,
      rev: adj[from].length,
      cap: 0,
      cost: -cost,
      flow: 0,
    };
    adj[from].push(fwd);
    adj[to].push(bwd);
  };

  // Source -> Donation nodes
  for (let i = 0; i < numD; i++) {
    const cap = Math.floor(eligibleDonations[i].donation.remainingQuantity);
    addEdge(SOURCE, 1 + i, cap, 0);
  }

  // Requirement nodes -> Sink
  for (let j = 0; j < numR; j++) {
    const cap = Math.floor(eligibleReqs[j].remainingQuantity);
    addEdge(1 + numD + j, SINK, cap, 0);
  }

  // Compatible Donation -> Requirement edges with exact objective coefficients
  const edgeMetadata = new Map<
    string,
    { distanceKm: number; priorityScore: number; expiryUrgencyScore: number; unitWeight: number }
  >();

  for (let i = 0; i < numD; i++) {
    const { donation, expiryUrgencyScore } = eligibleDonations[i];
    for (let j = 0; j < numR; j++) {
      const req = eligibleReqs[j];
      if (!areItemsCompatible(donation, req)) continue;

      const distanceKm = haversineDistanceKm(
        donation.lat,
        donation.lng,
        req.lat,
        req.lng
      );
      const priorityScore = PRIORITY_WEIGHTS[req.priority];
      const unitObjective =
        BASE_FULFILLMENT_WEIGHT +
        priorityScore +
        expiryUrgencyScore -
        DISTANCE_PENALTY_PER_KM * distanceKm;

      // Only add edges with strictly positive objective benefit
      if (unitObjective > 0) {
        const cap = Math.min(
          Math.floor(donation.remainingQuantity),
          Math.floor(req.remainingQuantity)
        );
        addEdge(1 + i, 1 + numD + j, cap, -unitObjective, {
          isMatchEdge: true,
          donationIdx: i,
          reqIdx: j,
        });
        edgeMetadata.set(`${i}-${j}`, {
          distanceKm,
          priorityScore,
          expiryUrgencyScore,
          unitWeight: unitObjective,
        });
      }
    }
  }

  // 3. Run Successive Shortest Augmenting Path (Bellman-Ford / SPFA for negative costs)
  const INF = 1e15;
  let totalObjective = 0;

  while (true) {
    const dist = new Array<number>(totalNodes).fill(INF);
    const parentNode = new Array<number>(totalNodes).fill(-1);
    const parentEdge = new Array<number>(totalNodes).fill(-1);
    const inQueue = new Array<boolean>(totalNodes).fill(false);

    dist[SOURCE] = 0;
    const queue: number[] = [SOURCE];
    inQueue[SOURCE] = true;

    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      inQueue[u] = false;

      for (let eIdx = 0; eIdx < adj[u].length; eIdx++) {
        const edge = adj[u][eIdx];
        if (edge.cap - edge.flow > 0) {
          const nd = dist[u] + edge.cost;
          if (nd < dist[edge.to] - 1e-9) {
            dist[edge.to] = nd;
            parentNode[edge.to] = u;
            parentEdge[edge.to] = eIdx;
            if (!inQueue[edge.to]) {
              queue.push(edge.to);
              inQueue[edge.to] = true;
            }
          }
        }
      }
    }

    // Stop if sink unreachable or no positive-objective augmenting path exists
    if (parentNode[SINK] === -1 || dist[SINK] >= 0) {
      break;
    }

    // Find bottleneck integer capacity along augmenting path
    let push = INF;
    let curr = SINK;
    while (curr !== SOURCE) {
      const p = parentNode[curr];
      const eIdx = parentEdge[curr];
      push = Math.min(push, adj[p][eIdx].cap - adj[p][eIdx].flow);
      curr = p;
    }

    const intPush = Math.floor(push);
    if (intPush <= 0) break;

    // Augment integer flow
    curr = SINK;
    while (curr !== SOURCE) {
      const p = parentNode[curr];
      const eIdx = parentEdge[curr];
      const edge = adj[p][eIdx];
      edge.flow += intPush;
      adj[curr][edge.rev].flow -= intPush;
      curr = p;
    }

    totalObjective += -dist[SINK] * intPush;
  }

  // 4. Extract optimal integer decision variables x_{i,j} > 0
  const matches: AllocationMatch[] = [];
  const donationUsed = new Map<string, number>();
  const reqFulfilled = new Map<string, number>();

  for (let i = 0; i < numD; i++) {
    const dNode = 1 + i;
    const { donation } = eligibleDonations[i];

    for (const edge of adj[dNode]) {
      if (edge.isMatchEdge && edge.flow > 0 && edge.reqIdx !== undefined) {
        const req = eligibleReqs[edge.reqIdx];
        const allocatedQty = Math.round(edge.flow);
        const meta = edgeMetadata.get(`${i}-${edge.reqIdx}`)!;

        const prevDonationUsed = donationUsed.get(donation.id) ?? 0;
        const availableBefore = donation.remainingQuantity - prevDonationUsed;
        const remainingAfter = Math.max(0, availableBefore - allocatedQty);

        donationUsed.set(donation.id, prevDonationUsed + allocatedQty);
        reqFulfilled.set(req.id, (reqFulfilled.get(req.id) ?? 0) + allocatedQty);

        matches.push({
          id: `MATCH-${runId}-${i}-${edge.reqIdx}`,
          runId,
          donationId: donation.id,
          donorId: donation.donorId,
          donorName: donation.donorName,
          requirementId: req.id,
          ngoId: req.ngoId,
          ngoName: req.ngoName,
          itemName: donation.itemName,
          category: donation.category,
          availableBefore,
          allocatedQuantity: allocatedQty,
          remainingAfter,
          unit: donation.unit,
          distanceKm: meta.distanceKm,
          priority: req.priority,
          priorityScore: meta.priorityScore,
          expiryUrgencyScore: meta.expiryUrgencyScore,
          objectiveContribution: Math.round(meta.unitWeight * allocatedQty * 100) / 100,
          status: 'Pending NGO Review',
          isPerishable: donation.isPerishable,
          expiryDateTime: donation.expiryDateTime,
          createdAt: new Date(nowMs).toISOString(),
        });
      }
    }
  }

  // Sort matches cleanly by priority & expiry urgency descending
  matches.sort(
    (a, b) =>
      b.priorityScore + b.expiryUrgencyScore - (a.priorityScore + a.expiryUrgencyScore) ||
      a.distanceKm - b.distanceKm
  );

  // 5. Compute summary statistics & verify ILP constraints
  const totalQuantityAvailable = eligibleDonations.reduce(
    (acc, item) => acc + Math.floor(item.donation.remainingQuantity),
    0
  );
  const totalQuantityAllocated = matches.reduce(
    (acc, m) => acc + m.allocatedQuantity,
    0
  );

  let requirementsFulfilled = 0;
  let partiallyFulfilledRequirements = 0;
  for (const r of eligibleReqs) {
    const added = reqFulfilled.get(r.id) ?? 0;
    if (added >= r.remainingQuantity) {
      requirementsFulfilled++;
    } else if (added > 0) {
      partiallyFulfilledRequirements++;
    }
  }

  const supplyCapRespected = eligibleDonations.every(
    ({ donation }) => (donationUsed.get(donation.id) ?? 0) <= donation.remainingQuantity
  );
  const demandCapRespected = eligibleReqs.every(
    (req) => (reqFulfilled.get(req.id) ?? 0) <= req.remainingQuantity
  );
  const noExpiredFoodAllocated = matches.every(
    (m) => !m.isPerishable || !evaluateExpiry(m.expiryDateTime, nowMs).isExpired
  );
  const categoryCompatibilityRespected = matches.every((m) => {
    const d = donations.find((x) => x.id === m.donationId);
    const r = requirements.find((x) => x.id === m.requirementId);
    return d && r ? areItemsCompatible(d, r) : false;
  });
  const integerDecisionVariablesOnly = matches.every((m) =>
    Number.isInteger(m.allocatedQuantity) && m.allocatedQuantity > 0
  );

  const constraintsVerified: ConstraintVerification = {
    supplyCapRespected,
    demandCapRespected,
    noExpiredFoodAllocated,
    categoryCompatibilityRespected,
    integerDecisionVariablesOnly,
    noDoubleAllocation: supplyCapRespected && demandCapRespected,
  };

  const durationMs = Math.max(1, Math.round((performance.now() - startPerf) * 100) / 100);

  return {
    runId,
    solverLabel: 'TypeScript Demo Exact Integer Flow ILP Solver (Client-Side Demo)',
    isTrueORToolsBackend: false,
    executedAt: new Date(nowMs).toISOString(),
    durationMs,
    objectiveValue: Math.round(totalObjective * 100) / 100,
    totalDonationsAvailable: eligibleDonations.length,
    totalQuantityAvailable,
    totalQuantityAllocated,
    requirementsFulfilled,
    partiallyFulfilledRequirements,
    unallocatedQuantity: Math.max(0, totalQuantityAvailable - totalQuantityAllocated),
    numberOfMatches: matches.length,
    excludedExpiredCount,
    matches,
    constraintsVerified,
  };
}

/**
 * Optional Python FastAPI + Google OR-Tools Client
 * Calls an external OR-Tools backend if running locally at VITE_FASTAPI_MATCHING_URL.
 */
export async function runFastApiORToolsMatching(
  endpointUrl: string,
  donations: Donation[],
  requirements: NGORequirement[]
): Promise<OptimizationRunResult> {
  const response = await fetch(`${endpointUrl.replace(/\/$/, '')}/api/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ donations, requirements }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OR-Tools backend error (${response.status}): ${text}`);
  }

  return (await response.json()) as OptimizationRunResult;
}
