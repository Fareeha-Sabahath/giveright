import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  MapPin,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import { DeliveryMapPanel } from '../components/DeliveryMap';
import { MatchingView } from '../components/MatchingView';
import { NotificationsView } from '../components/NotificationsView';
import { ProfileView } from '../components/ProfileView';
import { PriorityLabel, StatusLabel } from '../components/StatusText';
import { useApp } from '../context/AppContext';
import { DonationCategory, NGOPriority, NGORequirement } from '../types';

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

const PRIORITIES: NGOPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const NGODashboardPage: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { currentUser, requirements, matches, deliveries } = useApp();
  if (!currentUser) return null;

  const myReqs = [...requirements.filter((r) => r.ngoId === currentUser.id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const seenMatchIds = new Set<string>();
  const myMatches = [...matches.filter((m) => m.ngoId === currentUser.id)]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((m) => {
      if (seenMatchIds.has(m.id)) return false;
      seenMatchIds.add(m.id);
      return true;
    });
  const myDeliveries = [...deliveries.filter((d) => d.ngoId === currentUser.id)].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  const pendingReqs = myReqs.filter(
    (r) => r.status === 'Open' || r.status === 'Partially Fulfilled'
  ).length;
  const fulfilledReqs = myReqs.filter((r) => r.status === 'Fulfilled').length;
  const receivedDeliveries = myDeliveries.filter(
    (d) => d.stage === 'Delivered' || d.stage === 'Receipt Confirmed'
  ).length;
  const pendingReviews = myMatches.filter(
    (m) => m.status === 'Pending NGO Review'
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Requirements', value: myReqs.length },
          { label: 'Pending Requirements', value: pendingReqs },
          { label: 'Matched Donations', value: myMatches.length },
          { label: 'Received Donations', value: receivedDeliveries },
          { label: 'Fulfilled Requirements', value: fulfilledReqs },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500">{k.label}</div>
            <div className="text-3xl font-bold font-mono-nums text-[#113828] mt-1">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {pendingReviews > 0 && (
        <div className="bg-[#F0FDF7] border border-emerald-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-[#113828]">
              {pendingReviews} new donation allocation(s) awaiting your confirmation
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Accept matched items to initiate pickup and live delivery tracking, or reject to return inventory to the pool.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/ngo/matched')}
            className="px-4 py-2 text-xs font-semibold bg-[#059669] hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
          >
            Review Matched Donations
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            NGO Relief Operations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register urgent community requirements or inspect incoming shipments on OpenStreetMap.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/ngo/add-requirement')}
            className="px-4 py-2 text-xs font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg cursor-pointer"
          >
            + Add Requirement
          </button>
          <button
            type="button"
            onClick={() => navigate('/ngo/incoming')}
            className="px-4 py-2 text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Incoming Deliveries ({myDeliveries.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Active Requirements</h3>
            <button
              type="button"
              onClick={() => navigate('/ngo/requirements')}
              className="text-xs font-semibold text-[#059669] cursor-pointer"
            >
              Manage All
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {myReqs.slice(0, 5).map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {r.itemName}
                  </div>
                  <div className="text-xs text-slate-500 font-mono-nums mt-0.5">
                    Fulfilled {r.fulfilledQuantity}/{r.requiredQuantity} {r.unit} · Due {r.requiredByDate}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityLabel priority={r.priority} />
                  <StatusLabel label={r.status} tone={r.status === 'Fulfilled' ? 'emerald' : 'slate'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Incoming Deliveries</h3>
            <button
              type="button"
              onClick={() => navigate('/ngo/tracking')}
              className="text-xs font-semibold text-[#059669] cursor-pointer"
            >
              Open Map
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {myDeliveries.slice(0, 5).map((d) => (
              <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {d.itemName} ({d.quantity} {d.unit})
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    From {d.donorName} · {d.distanceKm} km
                  </div>
                </div>
                <StatusLabel
                  label={d.stage}
                  tone={
                    d.stage === 'Receipt Confirmed' || d.stage === 'Delivered'
                      ? 'emerald'
                      : d.stage === 'Awaiting NGO Acceptance'
                      ? 'amber'
                      : 'forest'
                  }
                />
              </div>
            ))}
            {myDeliveries.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                No incoming deliveries yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Matched Donations (consistent with Donor Dashboard) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recent Matched Donations</h3>
          <button
            type="button"
            onClick={() => navigate('/ngo/matched')}
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
                  {m.itemName} ← {m.donorName}
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
              No matched donations yet. Use Save Requirement &amp; Run Matching or visit Matched Donations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AddRequirementPage: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { addRequirement, runMatching } = useApp();
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<DonationCategory>('Food');
  const [requiredQuantity, setRequiredQuantity] = useState(25);
  const [unit, setUnit] = useState('kg');
  const [priority, setPriority] = useState<NGOPriority>('High');
  const [requiredByDate, setRequiredByDate] = useState(
    new Date(Date.now() + 2 * 86400 * 1000).toISOString().split('T')[0]
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isMatchingRunning, setIsMatchingRunning] = useState(false);

  const validateRequirement = (): boolean => {
    if (!itemName.trim() || !Number.isFinite(requiredQuantity) || requiredQuantity <= 0 || !unit.trim() || !requiredByDate) {
      setError('Please enter item name, positive quantity, unit, and required-by date.');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMatchingRunning) return;
    setError('');
    setSuccess('');
    setInfoMsg('');

    if (!validateRequirement()) return;

    const res = addRequirement({
      itemName,
      category,
      requiredQuantity,
      unit,
      priority,
      requiredByDate,
    });
    if (!res) {
      setError('Unable to save requirement. Please verify your session and try again.');
      return;
    }
    setSuccess(`Requirement "${res.itemName}" (${res.requiredQuantity} ${res.unit}) published.`);
    setItemName('');
  };

  const handleSaveAndRunMatching = async () => {
    if (isMatchingRunning) return;
    setError('');
    setSuccess('');
    setInfoMsg('');

    if (!validateRequirement()) return;

    setIsMatchingRunning(true);
    const created = addRequirement({
      itemName,
      category,
      requiredQuantity,
      unit,
      priority,
      requiredByDate,
    });
    if (!created) {
      setIsMatchingRunning(false);
      setError('Unable to save requirement. Matching was not executed.');
      return;
    }

    const res = await runMatching('demo_ilp', { extraRequirements: [created] });
    setIsMatchingRunning(false);
    setItemName('');

    if (!res.ok || !res.result) {
      setInfoMsg(
        `Your requirement was saved, but matching encountered an issue: ${res.error ?? 'Unknown error'}.`
      );
      return;
    }

    const matchedForNew = res.result.matches.filter(
      (m) => m.requirementId === created.id
    );

    if (matchedForNew.length > 0) {
      const totalMatchedQty = matchedForNew.reduce(
        (sum, m) => sum + m.allocatedQuantity,
        0
      );
      setSuccess(
        `Requirement saved and matched! Allocated ${totalMatchedQty} ${created.unit} across ${matchedForNew.length} donation(s). Opening Matched Donations...`
      );
      window.setTimeout(() => {
        navigate('/ngo/matched');
      }, 900);
    } else {
      setInfoMsg(
        `Requirement "${created.itemName}" (${created.requiredQuantity} ${created.unit}) has been saved, but no suitable donation is available yet. It remains open for future matching runs.`
      );
    }
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h2 className="text-lg font-bold text-slate-900">Post NGO Requirement</h2>
        <p className="text-xs text-slate-500 mt-1">
          Priority and required-by date guide the Integer Linear Programming optimizer when allocating scarce supplies.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Required Item Name
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Rice, Food Packets, Notebooks"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DonationCategory)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Required Quantity
            </label>
            <input
              type="number"
              min={1}
              value={requiredQuantity}
              onChange={(e) => setRequiredQuantity(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-mono-nums border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Unit
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="kg / packets / kits / bundles"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as NGOPriority)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Required-By Date
            </label>
            <input
              type="date"
              value={requiredByDate}
              onChange={(e) => setRequiredByDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono-nums border border-slate-300 rounded-lg"
              required
            />
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
                onClick={() => navigate('/ngo/requirements')}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-950 rounded-md font-semibold cursor-pointer"
              >
                View My Requirements
              </button>
              <button
                type="button"
                onClick={() => navigate('/ngo/matched')}
                className="px-3 py-1.5 bg-[#113828] text-white rounded-md font-semibold cursor-pointer"
              >
                Matched Donations
              </button>
            </div>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              {success}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/ngo/matched')}
                className="px-3 py-1.5 bg-[#059669] text-white rounded-md font-semibold cursor-pointer"
              >
                Matched Donations
              </button>
              <button
                type="button"
                onClick={() => navigate('/ngo/requirements')}
                className="px-3 py-1.5 bg-[#113828] text-white rounded-md font-semibold cursor-pointer"
              >
                View My Requirements
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
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
                : 'Save Requirement & Run Matching'}
            </span>
          </button>
          <button
            type="submit"
            disabled={isMatchingRunning}
            className="px-6 py-2.5 text-sm font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg disabled:opacity-60 cursor-pointer"
          >
            Submit Requirement
          </button>
          <button
            type="button"
            onClick={() => navigate('/ngo/requirements')}
            disabled={isMatchingRunning}
            className="px-4 py-2.5 text-sm font-semibold border border-slate-300 rounded-lg disabled:opacity-60 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export const MyRequirementsPage: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { currentUser, requirements, updateRequirement, deleteRequirement } = useApp();
  const [editing, setEditing] = useState<NGORequirement | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editPriority, setEditPriority] = useState<NGOPriority>('Medium');
  const [feedback, setFeedback] = useState('');

  if (!currentUser) return null;
  const mine = requirements.filter((r) => r.ngoId === currentUser.id);

  const openEdit = (r: NGORequirement) => {
    setEditing(r);
    setEditQty(r.requiredQuantity);
    setEditPriority(r.priority);
    setFeedback('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateRequirement(editing.id, {
      requiredQuantity: editQty,
      priority: editPriority,
    });
    setEditing(null);
    setFeedback('Requirement updated.');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div className="text-sm font-bold text-slate-900">
          My Registered Requirements ({mine.length})
        </div>
        <button
          type="button"
          onClick={() => navigate('/ngo/add-requirement')}
          className="px-4 py-2 text-xs font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg cursor-pointer"
        >
          + Add Requirement
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {feedback}
        </div>
      )}

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-emerald-300 rounded-xl p-5 space-y-4"
        >
          <div className="text-sm font-bold text-[#113828]">
            Edit Requirement: {editing.itemName}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Quantity (min {editing.fulfilledQuantity} fulfilled)
              </label>
              <input
                type="number"
                min={Math.max(1, editing.fulfilledQuantity)}
                value={editQty}
                onChange={(e) => setEditQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-nums border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as NGOPriority)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#059669] text-white rounded-lg cursor-pointer"
            >
              Save
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
                <th className="py-3 px-4 text-right">Required</th>
                <th className="py-3 px-4 text-right">Fulfilled</th>
                <th className="py-3 px-4 text-right">Remaining</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Required By</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mine.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {r.itemName}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{r.category}</td>
                  <td className="py-3 px-4 text-right font-mono-nums">
                    {r.requiredQuantity} {r.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-nums font-semibold text-[#059669]">
                    {r.fulfilledQuantity} {r.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-nums">
                    {r.remainingQuantity} {r.unit}
                  </td>
                  <td className="py-3 px-4">
                    <PriorityLabel priority={r.priority} />
                  </td>
                  <td className="py-3 px-4 font-mono-nums text-xs text-slate-600">
                    {r.requiredByDate}
                  </td>
                  <td className="py-3 px-4">
                    <StatusLabel
                      label={r.status}
                      tone={r.status === 'Fulfilled' ? 'emerald' : 'slate'}
                    />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                    {r.status !== 'Fulfilled' && (
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                    {r.fulfilledQuantity === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = deleteRequirement(r.id);
                          if (!res.ok && res.error) setFeedback(res.error);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-rose-300 text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const IncomingDeliveriesPage: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { currentUser, deliveries, acceptAllocation, updateDeliveryStage } = useApp();
  if (!currentUser) return null;

  const mine = [...deliveries.filter((d) => d.ngoId === currentUser.id)].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Incoming &amp; Received Deliveries ({mine.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor matched allocations, live courier positions, and confirm receipt once supplies arrive at your NGO center.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ngo/tracking')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#113828] text-white rounded-lg cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Open Live Map</span>
        </button>
      </div>

      {mine.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          No incoming deliveries yet. Once a requirement is matched to a donation, delivery tracking appears here.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {mine.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">
                    From {d.donorName} · {d.id}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {d.itemName} ({d.quantity} {d.unit})
                  </h3>
                </div>
                <StatusLabel
                  label={d.stage}
                  tone={
                    d.stage === 'Receipt Confirmed' || d.stage === 'Delivered'
                      ? 'emerald'
                      : d.stage === 'Awaiting NGO Acceptance'
                      ? 'amber'
                      : 'forest'
                  }
                />
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div>Pickup: {d.pickupLocation}</div>
                <div className="font-mono-nums">
                  Distance remaining: {d.distanceKm} km · GPS:{' '}
                  {d.gpsSource === 'REAL_BROWSER_GPS'
                    ? 'Live Browser GPS'
                    : d.stage === 'Awaiting NGO Acceptance'
                    ? 'Initial Pickup Hub (Awaiting Acceptance)'
                    : 'Simulated Demo GPS'}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/ngo/tracking')}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  View on Map
                </button>
                {d.stage === 'Awaiting NGO Acceptance' && (
                  <button
                    type="button"
                    onClick={() => acceptAllocation(d.matchId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#059669] hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept Allocation</span>
                  </button>
                )}
                {d.stage !== 'Awaiting NGO Acceptance' && d.stage !== 'Receipt Confirmed' && (
                  <button
                    type="button"
                    onClick={() =>
                      updateDeliveryStage(
                        d.id,
                        'Receipt Confirmed',
                        `Receipt confirmed by ${currentUser.ngoName || currentUser.name}.`,
                        { lat: d.dropLat, lng: d.dropLng },
                        d.gpsSource
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#059669] hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Receipt</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const NGOTrackingPage: React.FC = () => {
  const { currentUser, deliveries } = useApp();
  const mine = [...deliveries.filter((d) => !currentUser || d.ngoId === currentUser.id)].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );
  const [selectedId, setSelectedId] = useState(mine[0]?.id ?? '');
  const active = mine.find((d) => d.id === selectedId) ?? mine[0];

  if (!active) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
        No deliveries assigned to your NGO yet. Once a requirement is matched to a donation, delivery tracking appears here.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {mine.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 mr-2">
            Select Shipment:
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
              {d.itemName} from {d.donorName} ({d.stage})
            </button>
          ))}
        </div>
      )}
      <DeliveryMapPanel
        delivery={active}
        canUpdateStage={false}
        canConfirmReceipt={true}
      />
    </div>
  );
};

export const NGORouterView: React.FC<{
  path: string;
  navigate: (p: string) => void;
}> = ({ path, navigate }) => {
  if (path === '/ngo/add-requirement') return <AddRequirementPage navigate={navigate} />;
  if (path === '/ngo/requirements') return <MyRequirementsPage navigate={navigate} />;
  if (path === '/ngo/matched') return <MatchingView role="NGO" navigate={navigate} />;
  if (path === '/ngo/incoming') return <IncomingDeliveriesPage navigate={navigate} />;
  if (path === '/ngo/tracking') return <NGOTrackingPage />;
  if (path === '/ngo/notifications') return <NotificationsView />;
  if (path === '/ngo/profile') return <ProfileView />;
  return <NGODashboardPage navigate={navigate} />;
};
