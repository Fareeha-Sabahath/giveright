import React, { useState } from 'react';
import { AlertTriangle, Apple, Clock, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExpiryStatus } from '../types';
import { evaluateExpiry } from '../utils/expiry';
import { ExpiryStatusLabel, StatusLabel } from './StatusText';

interface PerishableMonitorViewProps {
  scope: 'donor' | 'admin';
  navigate: (path: string) => void;
}

export const PerishableMonitorView: React.FC<PerishableMonitorViewProps> = ({
  scope,
  navigate,
}) => {
  const { currentUser, donations, nowMs, updateDonation } = useApp();
  const [filter, setFilter] = useState<'ALL' | ExpiryStatus>('ALL');

  const foodDonations = donations.filter((d) => {
    const isFood = d.category === 'Food' || d.isPerishable;
    if (!isFood) return false;
    if (scope === 'donor' && currentUser) {
      return d.donorId === currentUser.id;
    }
    return true;
  });

  const enriched = foodDonations
    .map((d) => ({
      donation: d,
      evalRes: evaluateExpiry(d.expiryDateTime, nowMs),
    }))
    .filter((item) => item.donation.isPerishable || item.donation.expiryDateTime);

  const counts = {
    Critical: enriched.filter((e) => e.evalRes.status === 'Critical').length,
    Urgent: enriched.filter((e) => e.evalRes.status === 'Urgent').length,
    Approaching: enriched.filter((e) => e.evalRes.status === 'Approaching Expiry').length,
    Fresh: enriched.filter((e) => e.evalRes.status === 'Fresh').length,
    Expired: enriched.filter((e) => e.evalRes.status === 'Expired').length,
  };

  const filtered =
    filter === 'ALL'
      ? enriched
      : enriched.filter((e) => e.evalRes.status === filter);

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Critical (<6h)', value: counts.Critical, tone: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
          { label: 'Urgent (<24h)', value: counts.Urgent, tone: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Approaching (<48h)', value: counts.Approaching, tone: 'text-yellow-800', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Fresh (>48h)', value: counts.Fresh, tone: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Expired (Blocked)', value: counts.Expired, tone: 'text-red-800', bg: 'bg-red-50 border-red-200' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`p-4 rounded-xl border ${stat.bg}`}
          >
            <div className="text-xs font-medium text-slate-600">{stat.label}</div>
            <div className={`text-2xl font-bold font-mono-nums mt-1 ${stat.tone}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['ALL', 'Critical', 'Urgent', 'Approaching Expiry', 'Fresh', 'Expired'] as const).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  filter === tab
                    ? 'bg-white text-[#113828] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? `All (${enriched.length})` : tab}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          {scope === 'donor' ? (
            <button
              type="button"
              onClick={() => navigate('/donor/add-donation')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg transition-colors cursor-pointer"
            >
              <Apple className="w-3.5 h-3.5" />
              <span>Log Perishable Food</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/admin/matching')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#059669] hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Prioritize in ILP Matcher</span>
            </button>
          )}
        </div>
      </div>

      {/* Perishable Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          No perishable food batches match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map(({ donation, evalRes }) => (
            <div
              key={donation.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">
                      {donation.foodType || 'Perishable Food'} · {donation.donorName}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {donation.itemName}
                    </h3>
                  </div>
                  <ExpiryStatusLabel
                    status={evalRes.status}
                    countdown={evalRes.countdownLabel}
                  />
                </div>

                {(evalRes.status === 'Critical' ||
                  evalRes.status === 'Urgent' ||
                  evalRes.status === 'Expired') && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      evalRes.isExpired
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {evalRes.isExpired ? (
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    )}
                    <span>
                      {evalRes.isExpired
                        ? 'Safety Lock: This batch has passed its expiry timestamp and is automatically excluded from ILP matching.'
                        : `Priority Warning: Expires in ${evalRes.countdownLabel}. ILP matching boosts urgency score by +${evalRes.urgencyScore}.`}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <div className="text-slate-500">Remaining / Total</div>
                    <div className="font-mono-nums font-semibold text-slate-900 mt-0.5">
                      {donation.remainingQuantity} / {donation.quantity} {donation.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Expiry Timestamp</div>
                    <div className="font-mono-nums text-slate-800 mt-0.5">
                      {donation.expiryDateTime
                        ? new Date(donation.expiryDateTime).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Allocation Status</div>
                    <div className="mt-0.5">
                      <StatusLabel
                        label={donation.status}
                        tone={
                          donation.status === 'Expired'
                            ? 'rose'
                            : donation.status === 'Completed'
                            ? 'emerald'
                            : 'slate'
                        }
                      />
                    </div>
                  </div>
                </div>

                {donation.storageInstructions && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-800">Storage: </span>
                    {donation.storageInstructions}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs">
                <span className="text-slate-500 truncate">{donation.pickupLocation}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {scope === 'admin' && evalRes.isExpired && donation.status !== 'Expired' && (
                    <button
                      type="button"
                      onClick={() => updateDonation(donation.id, { status: 'Expired' })}
                      className="px-3 py-1.5 font-semibold rounded-lg border border-red-300 text-red-800 hover:bg-red-50 cursor-pointer"
                    >
                      Mark Expired
                    </button>
                  )}
                  {scope === 'donor' && (
                    <button
                      type="button"
                      onClick={() => navigate(`/donor/donations/${donation.id}`)}
                      className="px-3 py-1.5 font-semibold rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
