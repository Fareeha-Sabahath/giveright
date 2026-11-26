import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Eye,
  Play,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import { DeliveryMapPanel } from '../components/DeliveryMap';
import { MatchingView } from '../components/MatchingView';
import { NotificationsView } from '../components/NotificationsView';
import { PerishableMonitorView } from '../components/PerishableMonitorView';
import { ProfileView } from '../components/ProfileView';
import { ExpiryStatusLabel, StatusLabel } from '../components/StatusText';
import { NewDonationItemInput, useApp } from '../context/AppContext';
import {
  Donation,
  DonationCategory,
  DonationType,
  PerishableFoodType,
} from '../types';
import { evaluateExpiry } from '../utils/expiry';
import { HYDERABAD_LOCATIONS } from '../utils/geo';

const CATEGORIES: DonationCategory[] = [
  'Food',
  'Clothing',
  'Books and stationery',
  'Medicines',
  'Medical supplies',
  'Hygiene products',
  'Household essentials',
  'Other',
];

const FOOD_TYPES: PerishableFoodType[] = [
  'Cooked food',
  'Fresh vegetables',
  'Fresh fruits',
  'Dairy products',
  'Other perishable groceries',
];

const DONATION_TYPES: DonationType[] = [
  'One-time',
  'Recurring',
  'Emergency / Surplus',
];

export const DonorDashboardPage: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { currentUser, donations, matches, deliveries, nowMs } = useApp();
  if (!currentUser) return null;

  const myDonations = [...donations.filter((d) => d.donorId === currentUser.id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const seenMatchIds = new Set<string>();
  const myMatches = [...matches.filter((m) => m.donorId === currentUser.id)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((m) => {
      if (seenMatchIds.has(m.id)) return false;
      seenMatchIds.add(m.id);
      return true;
    });
  const myDeliveries = [...deliveries.filter((d) => d.donorId === currentUser.id)].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  const pendingCount = myDonations.filter((d) => d.status === 'Available').length;
  const matchedCount = myDonations.filter(
    (d) => d.status === 'Partially Allocated' || d.status === 'Allocated'
  ).length;
  const completedCount = myDonations.filter((d) => d.status === 'Completed').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Donations', value: myDonations.length },
          { label: 'Pending Donations', value: pendingCount },
          { label: 'Matched Donations', value: matchedCount },
          { label: 'Completed Donations', value: completedCount },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500">{k.label}</div>
            <div className="text-3xl font-bold font-mono-nums text-[#113828] mt-1">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Ready to contribute surplus items?
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit single or multi-item donations, monitor perishable expiry countdowns, or track live NGO deliveries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/donor/add-donation')}
            className="px-4 py-2 text-xs font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg cursor-pointer"
          >
            + Add Donation
          </button>
          <button
            type="button"
            onClick={() => navigate('/donor/matching')}
            className="px-4 py-2 text-xs font-semibold border border-emerald-300 bg-[#ECFDF5] text-[#113828] hover:bg-emerald-100 rounded-lg cursor-pointer"
          >
            View Matching Results
          </button>
          <button
            type="button"
            onClick={() => navigate('/donor/tracking')}
            className="px-4 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Track Deliveries ({myDeliveries.length})
          </button>
        </div>
      </div>

      {/* Recent Donations & Matched Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Donations</h3>
            <button
              type="button"
              onClick={() => navigate('/donor/donations')}
              className="text-xs font-semibold text-[#059669] hover:text-[#113828] cursor-pointer"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {myDonations.slice(0, 5).map((d) => {
              const exp = d.isPerishable
                ? evaluateExpiry(d.expiryDateTime, nowMs)
                : null;
              const remaining = Math.max(0, d.quantity - d.allocatedQuantity);
              return (
                <div
                  key={d.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {d.itemName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                      <div className="font-mono-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>
                          Total Donated:{' '}
                          <strong className="text-slate-700">
                            {d.quantity} {d.unit}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Allocated:{' '}
                          <strong className="text-[#059669]">
                            {d.allocatedQuantity} {d.unit}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Remaining:{' '}
                          <strong className="text-slate-700">
                            {remaining} {d.unit}
                          </strong>
                        </span>
                      </div>
                      <div>{d.category}</div>
                    </div>
                    {exp && (
                      <div className="mt-1.5">
                        <ExpiryStatusLabel
                          status={exp.status}
                          countdown={exp.countdownLabel}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusLabel
                      label={d.status}
                      tone={
                        d.status === 'Completed'
                          ? 'emerald'
                          : d.status === 'Expired'
                          ? 'rose'
                          : d.status === 'Available'
                          ? 'forest'
                          : 'amber'
                      }
                    />
                    <button
                      type="button"
                      onClick={() => navigate(`/donor/donations/${d.id}`)}
                      className="p-1.5 text-slate-600 hover:text-[#113828] rounded border border-slate-200 cursor-pointer"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {myDonations.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No donations registered yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent NGO Matches</h3>
            <button
              type="button"
              onClick={() => navigate('/donor/matching')}
              className="text-xs font-semibold text-[#059669] hover:text-[#113828] cursor-pointer"
            >
              All Matches
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {myMatches.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {m.itemName} → {m.ngoName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono-nums">
                    Allocated: {m.allocatedQuantity} {m.unit}
                    {typeof m.distanceKm === 'number' ? ` · ${m.distanceKm} km` : ''}
                  </div>
                </div>
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
              </div>
            ))}
            {myMatches.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No matches generated yet. Use Save Donation &amp; Run Matching or visit Matching Results.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DraftItemRow {
  itemName: string;
  category: DonationCategory;
  description: string;
  quantity: number;
  unit: string;
  isPerishable: boolean;
  foodType: PerishableFoodType;
  preparationDate: string;
  expiryDateTime: string;
  storageInstructions: string;
}

function createEmptyItemRow(): DraftItemRow {
  const now = new Date();
  const prep = new Date(now.getTime() - 3600 * 1000).toISOString().slice(0, 16);
  const exp = new Date(now.getTime() + 18 * 3600 * 1000).toISOString().slice(0, 16);
  return {
    itemName: '',
    category: 'Food',
    description: '',
    quantity: 10,
    unit: 'kg',
    isPerishable: false,
    foodType: 'Cooked food',
    preparationDate: prep,
    expiryDateTime: exp,
    storageInstructions: 'Store in clean airtight container at cool temperature.',
  };
}

export const AddDonationPage: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { currentUser, addDonationsBatch, runMatching } = useApp();
  const [items, setItems] = useState<DraftItemRow[]>([createEmptyItemRow()]);
  const [pickupLocation, setPickupLocation] = useState(currentUser?.address ?? '');
  const [city, setCity] = useState(currentUser?.city ?? 'Hyderabad');
  const [lat, setLat] = useState(currentUser?.lat ?? 17.4375);
  const [lng, setLng] = useState(currentUser?.lng ?? 78.4483);
  const [availabilityDate, setAvailabilityDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [donationType, setDonationType] = useState<DonationType>('One-time');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isMatchingRunning, setIsMatchingRunning] = useState(false);

  const updateRow = (idx: number, patch: Partial<DraftItemRow>) => {
    setItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  };

  const handlePreset = (idxStr: string) => {
    const loc = HYDERABAD_LOCATIONS[Number(idxStr)];
    if (!loc) return;
    setPickupLocation(loc.address);
    setCity(loc.city);
    setLat(loc.lat);
    setLng(loc.lng);
  };

  const validateAndBuildPayload = (): NewDonationItemInput[] | null => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.itemName.trim() || !Number.isFinite(it.quantity) || it.quantity <= 0 || !it.unit.trim()) {
        setError(`Item #${i + 1}: Please enter a valid item name, quantity, and unit.`);
        return null;
      }
      if (it.category === 'Food' && it.isPerishable && !it.expiryDateTime) {
        setError(`Item #${i + 1}: Perishable food requires an expiry date and time.`);
        return null;
      }
    }
    if (!pickupLocation.trim()) {
      setError('Pickup location is required.');
      return null;
    }

    return items.map((it) => ({
      itemName: it.itemName.trim(),
      category: it.category,
      description: it.description.trim() || `${it.itemName.trim()} donated via GiveRight`,
      quantity: it.quantity,
      unit: it.unit.trim(),
      pickupLocation,
      city,
      lat,
      lng,
      availabilityDate,
      donationType,
      isPerishable: it.category === 'Food' ? it.isPerishable : false,
      foodType: it.isPerishable ? it.foodType : undefined,
      preparationDate: it.isPerishable ? it.preparationDate : undefined,
      expiryDateTime:
        it.isPerishable && it.expiryDateTime
          ? new Date(it.expiryDateTime).toISOString()
          : undefined,
      storageInstructions: it.isPerishable ? it.storageInstructions : undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMatchingRunning) return;
    setError('');
    setSuccessMsg('');
    setInfoMsg('');

    const payload = validateAndBuildPayload();
    if (!payload) return;

    const created = addDonationsBatch(payload);
    if (!created || created.length === 0) {
      setError('Unable to save donation. Please verify your session and try again.');
      return;
    }
    setSuccessMsg(`Successfully registered ${created.length} donation item(s).`);
    setItems([createEmptyItemRow()]);
  };

  const handleSaveAndRunMatching = async () => {
    if (isMatchingRunning) return;
    setError('');
    setSuccessMsg('');
    setInfoMsg('');

    const payload = validateAndBuildPayload();
    if (!payload) return;

    setIsMatchingRunning(true);
    const created = addDonationsBatch(payload);
    if (!created || created.length === 0) {
      setIsMatchingRunning(false);
      setError('Unable to save donation. Matching was not executed.');
      return;
    }

    const res = await runMatching('demo_ilp', created);
    setIsMatchingRunning(false);
    setItems([createEmptyItemRow()]);

    if (!res.ok || !res.result) {
      setInfoMsg(
        `Your donation was saved, but matching encountered an issue: ${res.error ?? 'Unknown error'}.`
      );
      return;
    }

    const createdIds = new Set(created.map((d) => d.id));
    const matchedForNew = res.result.matches.filter((m) =>
      createdIds.has(m.donationId)
    );

    if (matchedForNew.length > 0) {
      const totalMatchedQty = matchedForNew.reduce(
        (sum, m) => sum + m.allocatedQuantity,
        0
      );
      setSuccessMsg(
        `Donation saved and matched! Generated ${matchedForNew.length} allocation(s) (${totalMatchedQty} units). Opening Matching Results...`
      );
      window.setTimeout(() => {
        navigate('/donor/matching');
      }, 900);
    } else {
      setInfoMsg(
        'Your donation was saved successfully, but no suitable NGO match was found for it yet. It remains available for future matching runs.'
      );
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Register New Donation (Multi-Item Supported)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Add one or more items. For perishable food, enter exact expiry date and time for automated countdown monitoring.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, createEmptyItemRow()])}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-emerald-300 bg-[#ECFDF5] text-[#113828] hover:bg-emerald-100 rounded-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Item</span>
          </button>
        </div>

        {/* Item Rows */}
        <div className="space-y-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-slate-200 bg-[#F6F8F7] space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#113828]">
                  Item #{idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                  >
                    Remove Item
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Item / Food Name
                  </label>
                  <input
                    type="text"
                    value={item.itemName}
                    onChange={(e) => updateRow(idx, { itemName: e.target.value })}
                    placeholder="e.g. Sona Masoori Rice, Cooked Meal Packets, School Notebooks"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) => {
                      const cat = e.target.value as DonationCategory;
                      updateRow(idx, {
                        category: cat,
                        isPerishable: cat === 'Food' ? item.isPerishable : false,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateRow(idx, { quantity: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm font-mono-nums bg-white border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateRow(idx, { unit: e.target.value })}
                      placeholder="kg / packets / kits"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateRow(idx, { description: e.target.value })}
                  placeholder="Condition, packaging, batch notes..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>

              {item.category === 'Food' && (
                <div className="pt-2 border-t border-slate-200 space-y-4">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#113828] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.isPerishable}
                      onChange={(e) =>
                        updateRow(idx, { isPerishable: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#059669]"
                    />
                    <span>
                      This is Perishable Food (enable live expiry countdown & ILP urgency prioritization)
                    </span>
                  </label>

                  {item.isPerishable && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-amber-200">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Food Type
                        </label>
                        <select
                          value={item.foodType}
                          onChange={(e) =>
                            updateRow(idx, {
                              foodType: e.target.value as PerishableFoodType,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        >
                          {FOOD_TYPES.map((ft) => (
                            <option key={ft} value={ft}>
                              {ft}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Preparation / Collection Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={item.preparationDate}
                          onChange={(e) =>
                            updateRow(idx, { preparationDate: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs font-mono-nums border border-slate-300 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Expiry Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={item.expiryDateTime}
                          onChange={(e) =>
                            updateRow(idx, { expiryDateTime: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs font-mono-nums border border-slate-300 rounded-lg"
                          required
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Storage Instructions
                        </label>
                        <input
                          type="text"
                          value={item.storageInstructions}
                          onChange={(e) =>
                            updateRow(idx, { storageInstructions: e.target.value })
                          }
                          placeholder="e.g. Refrigerate below 5°C or keep in hot-box"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Shared Pickup & Schedule */}
        <div className="pt-2 border-t border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900">
              Pickup Location & Schedule
            </span>
            <select
              onChange={(e) => handlePreset(e.target.value)}
              defaultValue=""
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50"
            >
              <option value="" disabled>
                Quick-fill Hyderabad Pickup Hub...
              </option>
              {HYDERABAD_LOCATIONS.map((loc, idx) => (
                <option key={loc.label} value={idx}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pickup Address
              </label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Availability Date
              </label>
              <input
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-nums border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Donation Type
              </label>
              <select
                value={donationType}
                onChange={(e) => setDonationType(e.target.value as DonationType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                {DONATION_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {error}
          </div>
        )}
        {infoMsg && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              {infoMsg}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/donor/donations')}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-950 rounded-md font-semibold cursor-pointer"
              >
                View My Donations
              </button>
              <button
                type="button"
                onClick={() => navigate('/donor/matching')}
                className="px-3 py-1.5 bg-[#113828] text-white rounded-md font-semibold cursor-pointer"
              >
                Matching Results
              </button>
            </div>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              {successMsg}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/donor/matching')}
                className="px-3 py-1.5 bg-[#059669] text-white rounded-md font-semibold cursor-pointer"
              >
                View Matching Results
              </button>
              <button
                type="button"
                onClick={() => navigate('/donor/donations')}
                className="px-3 py-1.5 bg-[#113828] text-white rounded-md font-semibold cursor-pointer"
              >
                View My Donations
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAndRunMatching}
            disabled={isMatchingRunning}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-[#059669] hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isMatchingRunning
                ? 'Saving & Running Matching...'
                : 'Save Donation & Run Matching'}
            </span>
          </button>
          <button
            type="submit"
            disabled={isMatchingRunning}
            className="px-6 py-2.5 text-sm font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            Submit Donation ({items.length} {items.length === 1 ? 'Item' : 'Items'})
          </button>
          <button
            type="button"
            onClick={() => navigate('/donor/donations')}
            disabled={isMatchingRunning}
            className="px-4 py-2.5 text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-60 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export const MyDonationsPage: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { currentUser, donations, updateDonation, deleteDonation, nowMs } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [editing, setEditing] = useState<Donation | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editName, setEditName] = useState('');
  const [feedback, setFeedback] = useState('');

  if (!currentUser) return null;

  const mine = donations.filter((d) => d.donorId === currentUser.id);
  const filtered = mine.filter((d) => {
    const matchText =
      d.itemName.toLowerCase().includes(search.toLowerCase()) ||
      d.pickupLocation.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || d.category === categoryFilter;
    return matchText && matchCat;
  });

  const openEdit = (d: Donation) => {
    setEditing(d);
    setEditQty(d.quantity);
    setEditName(d.itemName);
    setFeedback('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateDonation(editing.id, {
      itemName: editName,
      quantity: editQty,
    });
    setEditing(null);
    setFeedback('Donation updated successfully.');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item or pickup location..."
            className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg w-full sm:w-64"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => navigate('/donor/add-donation')}
          className="px-4 py-2 text-xs font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg cursor-pointer"
        >
          + Add Donation
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {feedback}
        </div>
      )}

      {editing && (
        <form
          onSubmit={handleSaveEdit}
          className="bg-white border border-emerald-300 rounded-xl p-5 space-y-4"
        >
          <div className="text-sm font-bold text-[#113828]">
            Edit Donation: {editing.itemName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Quantity (min {editing.allocatedQuantity} allocated)
              </label>
              <input
                type="number"
                min={Math.max(1, editing.allocatedQuantity)}
                value={editQty}
                onChange={(e) => setEditQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-nums border border-slate-300 rounded-lg"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#059669] text-white rounded-lg cursor-pointer"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Total Donated</th>
                <th className="py-3 px-4 text-right">Allocated</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4">Expiry / Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((d) => {
                const exp = d.isPerishable
                  ? evaluateExpiry(d.expiryDateTime, nowMs)
                  : null;
                const remaining = Math.max(0, d.quantity - d.allocatedQuantity);
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{d.itemName}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[220px]">
                        {d.pickupLocation}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{d.category}</td>
                    <td className="py-3 px-4 text-right font-mono-nums">
                      {d.quantity} {d.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-nums font-semibold text-[#059669]">
                      {d.allocatedQuantity} {d.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-nums">
                      {remaining} {d.unit}
                    </td>
                    <td className="py-3 px-4">
                      {exp ? (
                        <ExpiryStatusLabel
                          status={exp.status}
                          countdown={exp.countdownLabel}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">{d.donationType}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel
                        label={d.status}
                        tone={
                          d.status === 'Completed'
                            ? 'emerald'
                            : d.status === 'Expired'
                            ? 'rose'
                            : d.status === 'Available'
                            ? 'forest'
                            : 'amber'
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/donor/donations/${d.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Details</span>
                      </button>
                      {d.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                      {d.allocatedQuantity === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const res = deleteDonation(d.id);
                            if (!res.ok && res.error) setFeedback(res.error);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-rose-300 text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-sm">
                    No donations match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const DonationDetailsPage: React.FC<{
  donationId: string;
  navigate: (path: string) => void;
}> = ({ donationId, navigate }) => {
  const { donations, matches, deliveries, nowMs } = useApp();
  const donation = donations.find((d) => d.id === donationId);

  if (!donation) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
        <div className="text-base font-bold text-slate-900">Donation not found</div>
        <button
          type="button"
          onClick={() => navigate('/donor/donations')}
          className="px-4 py-2 text-xs font-semibold bg-[#113828] text-white rounded-lg cursor-pointer"
        >
          Back to My Donations
        </button>
      </div>
    );
  }

  const relatedMatches = matches.filter((m) => m.donationId === donation.id);
  const relatedDeliveries = deliveries.filter((d) => d.donationId === donation.id);
  const exp = donation.isPerishable
    ? evaluateExpiry(donation.expiryDateTime, nowMs)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs text-slate-500">
              {donation.category} · {donation.donationType}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              {donation.itemName}
            </h2>
            <p className="text-sm text-slate-600 mt-1">{donation.description}</p>
          </div>
          <StatusLabel
            label={donation.status}
            tone={
              donation.status === 'Completed'
                ? 'emerald'
                : donation.status === 'Expired'
                ? 'rose'
                : 'forest'
            }
          />
        </div>

        {exp && (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Perishable Food Expiry Monitor ({donation.foodType})</span>
            </div>
            <ExpiryStatusLabel status={exp.status} countdown={exp.countdownLabel} />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[#F6F8F7] border border-slate-200">
            <div className="text-xs text-slate-500">Total Donated</div>
            <div className="text-xl font-bold font-mono-nums text-slate-900 mt-1">
              {donation.quantity} {donation.unit}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#F0FDF7] border border-emerald-200">
            <div className="text-xs text-slate-600">Allocated</div>
            <div className="text-xl font-bold font-mono-nums text-[#059669] mt-1">
              {donation.allocatedQuantity} {donation.unit}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#F6F8F7] border border-slate-200">
            <div className="text-xs text-slate-500">Remaining</div>
            <div className="text-xl font-bold font-mono-nums text-slate-900 mt-1">
              {Math.max(0, donation.quantity - donation.allocatedQuantity)} {donation.unit}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#F6F8F7] border border-slate-200">
            <div className="text-xs text-slate-500">Available Date</div>
            <div className="text-base font-bold font-mono-nums text-slate-900 mt-1">
              {donation.availabilityDate}
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          <strong className="text-slate-900">Pickup Hub:</strong> {donation.pickupLocation} (
          <span className="font-mono-nums text-xs">
            {donation.lat.toFixed(4)}, {donation.lng.toFixed(4)}
          </span>
          )
        </div>
      </div>

      {/* Matched NGOs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">
            Matched NGOs ({relatedMatches.length})
          </h3>
        </div>
        {relatedMatches.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No NGOs matched yet for this item.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {relatedMatches.map((m) => (
              <div
                key={m.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">{m.ngoName}</div>
                  <div className="text-xs text-slate-500 font-mono-nums mt-0.5">
                    Allocated: {m.allocatedQuantity} {m.unit} · Distance: {m.distanceKm} km
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusLabel label={m.status} tone="forest" />
                  {relatedDeliveries.some((del) => del.matchId === m.id) && (
                    <button
                      type="button"
                      onClick={() => navigate('/donor/tracking')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#113828] text-white rounded-lg cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Track Delivery</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DonorTrackingPage: React.FC = () => {
  const { currentUser, deliveries } = useApp();
  const mine = [...deliveries.filter((d) => !currentUser || d.donorId === currentUser.id)].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );
  const [selectedId, setSelectedId] = useState(mine[0]?.id ?? '');
  const active = mine.find((d) => d.id === selectedId) ?? mine[0];

  if (!active) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
        No deliveries found for your account yet. Once a donation is matched to an NGO, delivery tracking appears here.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {mine.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 mr-2">
            Select Delivery:
          </span>
          {mine.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedId(d.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                d.id === active.id
                  ? 'bg-[#113828] text-white border-[#113828]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {d.itemName} → {d.ngoName} ({d.stage})
            </button>
          ))}
        </div>
      )}
      <DeliveryMapPanel
        delivery={active}
        canUpdateStage={true}
        canConfirmReceipt={false}
      />
    </div>
  );
};

export const DonorRouterView: React.FC<{
  path: string;
  navigate: (p: string) => void;
}> = ({ path, navigate }) => {
  if (path === '/donor/add-donation') return <AddDonationPage navigate={navigate} />;
  if (path === '/donor/donations') return <MyDonationsPage navigate={navigate} />;
  if (path.startsWith('/donor/donations/')) {
    const id = path.replace('/donor/donations/', '');
    return <DonationDetailsPage donationId={id} navigate={navigate} />;
  }
  if (path === '/donor/matching') return <MatchingView role="DONOR" navigate={navigate} />;
  if (path === '/donor/tracking') return <DonorTrackingPage />;
  if (path === '/donor/perishable')
    return <PerishableMonitorView scope="donor" navigate={navigate} />;
  if (path === '/donor/notifications') return <NotificationsView />;
  if (path === '/donor/profile') return <ProfileView />;
  return <DonorDashboardPage navigate={navigate} />;
};
