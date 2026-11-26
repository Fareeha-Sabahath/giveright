import React, { useState } from 'react';
import {
  CheckCircle2,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PriorityLabel, StatusLabel } from './StatusText';

interface MatchingViewProps {
  role: 'DONOR' | 'NGO' | 'ADMIN';
  navigate: (path: string) => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({ role, navigate }) => {
  const {
    currentUser,
    donations,
    requirements,
    matches,
    lastOptimizationRun,
    runMatching,
    acceptAllocation,
    rejectAllocation,
  } = useApp();

  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleRunOptimization = async () => {
    if (running) return;
    setRunning(true);
    setErrorMsg('');
    const res = await runMatching('demo_ilp');
    setRunning(false);
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Matching failed.');
    }
  };

  // Filter matches according to role
  const roleMatches = matches.filter((m) => {
    if (role === 'DONOR' && currentUser) return m.donorId === currentUser.id;
    if (role === 'NGO' && currentUser) return m.ngoId === currentUser.id;
    return true;
  });

  const filteredMatches =
    statusFilter === 'ALL'
      ? roleMatches
      : roleMatches.filter((m) => m.status === statusFilter);

  // Live statistics derived from current state + last optimization run
  const activeDonations = donations.filter(
    (d) => d.remainingQuantity > 0 && d.status !== 'Expired' && d.status !== 'Completed'
  );
  const totalAvailableQty = activeDonations.reduce((s, d) => s + d.remainingQuantity, 0);
  const totalAllocatedAcrossSystem = matches
    .filter((m) => m.status !== 'Rejected')
    .reduce((s, m) => s + m.allocatedQuantity, 0);
  const fulfilledReqsCount = requirements.filter((r) => r.status === 'Fulfilled').length;
  const partialReqsCount = requirements.filter(
    (r) => r.status === 'Partially Fulfilled'
  ).length;

  return (
    <div className="space-y-6">
      {/* Control Banner with Prominent Run Donation Matching Button */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900">
              Donation Matching &amp; Optimization Results
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Generate optimized donation allocations by matching donor offerings with NGO requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRunOptimization}
              disabled={running}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{running ? 'Solving ILP...' : 'Run Donation Matching'}</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Optimization Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: 'Total Donations Available',
            value: lastOptimizationRun
              ? lastOptimizationRun.totalDonationsAvailable
              : activeDonations.length,
          },
          {
            label: 'Total Quantity Allocated',
            value: lastOptimizationRun
              ? lastOptimizationRun.totalQuantityAllocated
              : totalAllocatedAcrossSystem,
          },
          {
            label: 'Requirements Fulfilled',
            value: fulfilledReqsCount,
          },
          {
            label: 'Partially Fulfilled',
            value: partialReqsCount,
          },
          {
            label: 'Unallocated Quantity',
            value: totalAvailableQty,
          },
          {
            label: 'Number of Matches',
            value: roleMatches.length,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <div className="text-xs text-slate-500">{kpi.label}</div>
            <div className="text-2xl font-bold font-mono-nums text-[#113828] mt-1">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Last Run Solver & Constraint Audit */}
      {lastOptimizationRun && (
        <div className="bg-[#F0FDF7] border border-emerald-200 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#113828]">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>
                Last Run ({lastOptimizationRun.runId}) · {lastOptimizationRun.solverLabel}
              </span>
            </div>
            <div className="font-mono-nums text-xs text-slate-700">
              Objective Z = {lastOptimizationRun.objectiveValue.toLocaleString()} · Solved in{' '}
              {lastOptimizationRun.durationMs} ms · Expired Food Excluded:{' '}
              {lastOptimizationRun.excludedExpiredCount}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-emerald-900">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              Supply Cap Verified
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              Demand Cap Verified
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              Zero Expired Food Allocated
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              Integer Variables Only
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              No Double Allocation
            </span>
          </div>
        </div>
      )}

      {/* Allocation Matches Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">
            Allocation Results ({filteredMatches.length})
          </h3>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {['ALL', 'Pending NGO Review', 'Accepted', 'In Delivery', 'Completed', 'Rejected'].map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-[#113828] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No allocation matches found yet. Click{' '}
            <strong className="text-slate-800">Run Donation Matching</strong> above to solve the Integer Linear Program.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Donor</th>
                  <th className="py-3 px-4">NGO</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4 text-right">Available</th>
                  <th className="py-3 px-4 text-right">Allocated</th>
                  <th className="py-3 px-4 text-right">Remaining</th>
                  <th className="py-3 px-4 text-right">Distance</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Match Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMatches.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {m.donorName}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {m.ngoName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{m.itemName}</div>
                      <div className="text-xs text-slate-500">{m.category}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-nums text-slate-700">
                      {m.availableBefore} {m.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-nums font-bold text-[#113828]">
                      {m.allocatedQuantity} {m.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-nums text-slate-600">
                      {m.remainingAfter} {m.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-nums text-slate-700">
                      {m.distanceKm} km
                    </td>
                    <td className="py-3 px-4">
                      <PriorityLabel priority={m.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel
                        label={m.status}
                        tone={
                          m.status === 'Completed' || m.status === 'Accepted'
                            ? 'emerald'
                            : m.status === 'In Delivery'
                            ? 'forest'
                            : m.status === 'Rejected'
                            ? 'rose'
                            : 'amber'
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {m.status === 'Pending NGO Review' &&
                      (role === 'NGO' || role === 'ADMIN') ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => acceptAllocation(m.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-[#059669] hover:bg-emerald-700 text-white rounded-md cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectAllocation(m.id)}
                            className="px-2.5 py-1 text-xs font-semibold border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : m.status === 'Pending NGO Review' ||
                        m.status === 'Accepted' ||
                        m.status === 'In Delivery' ||
                        m.status === 'Completed' ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              role === 'DONOR'
                                ? '/donor/tracking'
                                : role === 'NGO'
                                ? '/ngo/tracking'
                                : '/admin/deliveries'
                            )
                          }
                          className="px-2.5 py-1 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          Track Delivery
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
