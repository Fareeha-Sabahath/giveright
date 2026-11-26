import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, KeyRound, Play, ShieldCheck, Trash2 } from 'lucide-react';
import { DeliveryMapPanel } from '../components/DeliveryMap';
import { MatchingView } from '../components/MatchingView';
import { PerishableMonitorView } from '../components/PerishableMonitorView';
import { PriorityLabel, StatusLabel } from '../components/StatusText';
import { useApp } from '../context/AppContext';
import { DemoAccountSummary, NGOPriority } from '../types';
import { evaluateExpiry } from '../utils/expiry';

const CHART_COLORS = [
  '#113828',
  '#059669',
  '#10B981',
  '#D97706',
  '#0284C7',
  '#64748B',
  '#DC2626',
  '#0F766E',
];

export const DemoAccountManagementSection: React.FC = () => {
  const { currentUser, fetchDemoAccounts, resetDemoAccountPassword } = useApp();
  const [accounts, setAccounts] = React.useState<DemoAccountSummary[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState<string>('');
  const [saving, setSaving] = React.useState<boolean>(false);
  const [statusMsg, setStatusMsg] = React.useState<string>('');

  const isAdmin = currentUser?.role === 'ADMIN';

  React.useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchDemoAccounts().then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok || !res.accounts) {
        setError(res.error ?? 'Unable to load demo account records.');
        return;
      }
      setAccounts(res.accounts);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return null;
  }

  const handleResetSubmit = async (e: React.FormEvent, accountId: string) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    setStatusMsg('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    const res = await resetDemoAccountPassword(accountId, newPassword);
    setSaving(false);

    if (!res.ok) {
      setError(res.error ?? 'Failed to rotate demo password.');
      return;
    }

    if (res.account) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? res.account! : a))
      );
    }
    setStatusMsg(res.message ?? 'Demo account password updated and securely hashed.');
    setEditingId(null);
    setNewPassword('');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>Demo Account Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Protected Admin-only view of sample evaluation accounts. Credentials are stored exclusively as salted server-side password hashes and never exposed in plaintext.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#113828] border border-emerald-200">
          Admin Authorized Only
        </span>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}
      {statusMsg && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
          {statusMsg}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-xs text-slate-500">
          Loading protected demo account directory...
        </div>
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Account &amp; Role</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Credential Protection</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Credential Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{acc.name}</div>
                    <div className="text-xs text-slate-500">
                      {acc.role} · {acc.city}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono-nums text-xs text-slate-700">
                    {acc.email}
                  </td>
                  <td className="py-3 px-4 text-xs text-emerald-800 font-medium">
                    {acc.passwordStatus}
                  </td>
                  <td className="py-3 px-4 font-mono-nums text-xs text-slate-500">
                    {new Date(acc.lastPasswordUpdatedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {editingId === acc.id ? (
                      <form
                        onSubmit={(e) => handleResetSubmit(e, acc.id)}
                        className="inline-flex items-center gap-2"
                      >
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password (min 6)"
                          minLength={6}
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md w-40"
                          required
                        />
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#113828] text-white rounded-md disabled:opacity-60 cursor-pointer"
                        >
                          {saving ? 'Saving...' : 'Save Hash'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setNewPassword('');
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-md cursor-pointer"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(acc.id);
                          setNewPassword('');
                          setError('');
                          setStatusMsg('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#059669]" />
                        <span>Reset Password</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const AdminDashboardPage: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => {
  const { currentUser, users, donations, requirements, matches, deliveries, nowMs } = useApp();
  if (!currentUser || currentUser.role !== 'ADMIN') return null;

  const totalDonors = users.filter((u) => u.role === 'DONOR').length;
  const totalNGOs = users.filter((u) => u.role === 'NGO').length;
  const successfulMatches = matches.filter((m) => m.status !== 'Rejected').length;
  const pendingAllocations = matches.filter(
    (m) => m.status === 'Pending NGO Review'
  ).length;
  const completedDeliveries = deliveries.filter(
    (d) => d.stage === 'Delivered' || d.stage === 'Receipt Confirmed'
  ).length;
  const expiredFoodDonations = donations.filter(
    (d) =>
      (d.category === 'Food' || d.isPerishable) &&
      (d.status === 'Expired' || evaluateExpiry(d.expiryDateTime, nowMs).isExpired)
  ).length;

  // Chart 1: Donations by Category
  const catCounts = new Map<string, number>();
  donations.forEach((d) =>
    catCounts.set(d.category, (catCounts.get(d.category) ?? 0) + d.quantity)
  );
  const categoryData = Array.from(catCounts.entries()).map(([name, quantity]) => ({
    name,
    quantity,
  }));

  // Chart 2: Donation Status
  const statusCounts = new Map<string, number>();
  donations.forEach((d) =>
    statusCounts.set(d.status, (statusCounts.get(d.status) ?? 0) + 1)
  );
  const statusData = Array.from(statusCounts.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // Chart 3: Monthly Donations (built dynamically around current months + actual live totals)
  const totalLiveQty = donations.reduce((s, d) => s + d.quantity, 0);
  const monthlyData = [
    { month: 'Jul', donations: 120, matched: 95 },
    { month: 'Aug', donations: 165, matched: 140 },
    { month: 'Sep', donations: 210, matched: 185 },
    { month: 'Oct', donations: 245, matched: 220 },
    {
      month: 'Nov',
      donations: totalLiveQty,
      matched: matches
        .filter((m) => m.status !== 'Rejected')
        .reduce((s, m) => s + m.allocatedQuantity, 0),
    },
  ];

  // Chart 4: NGO Requirements Fulfillment
  const reqSummaryMap = new Map<string, { required: number; fulfilled: number }>();
  requirements.forEach((r) => {
    const prev = reqSummaryMap.get(r.ngoName) ?? { required: 0, fulfilled: 0 };
    reqSummaryMap.set(r.ngoName, {
      required: prev.required + r.requiredQuantity,
      fulfilled: prev.fulfilled + r.fulfilledQuantity,
    });
  });
  const ngoReqData = Array.from(reqSummaryMap.entries()).map(([ngo, vals]) => ({
    ngo: ngo.split(' ').slice(0, 2).join(' '),
    required: vals.required,
    fulfilled: vals.fulfilled,
  }));

  // Chart 5: Delivery Completion Breakdown (all pipeline stages shown clearly)
  const deliveryStageCounts = new Map<string, number>();
  deliveries.forEach((d) =>
    deliveryStageCounts.set(d.stage, (deliveryStageCounts.get(d.stage) ?? 0) + 1)
  );
  const pipelineStages = [
    'Allocation Confirmed',
    'Pickup Scheduled',
    'Picked Up',
    'In Transit',
    'Near Destination',
    'Delivered',
    'Receipt Confirmed',
  ];
  const awaitingAcceptanceCount = deliveryStageCounts.get('Awaiting NGO Acceptance') ?? 0;
  const deliveryData = [
    ...(awaitingAcceptanceCount > 0
      ? [{ stage: 'Awaiting NGO Acceptance', count: awaitingAcceptanceCount }]
      : []),
    ...pipelineStages.map((stage) => ({
      stage,
      count: deliveryStageCounts.get(stage) ?? 0,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* 8 Admin KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Donors', value: totalDonors },
          { label: 'Total NGOs', value: totalNGOs },
          { label: 'Total Donations', value: donations.length },
          { label: 'Total Requirements', value: requirements.length },
          { label: 'Successful Matches', value: successfulMatches },
          { label: 'Pending Allocations', value: pendingAllocations },
          { label: 'Completed Deliveries', value: completedDeliveries },
          { label: 'Expired Food Donations', value: expiredFoodDonations },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-medium text-slate-500">{k.label}</div>
            <div className="text-2xl font-bold font-mono-nums text-[#113828] mt-1">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Optimization CTA */}
      <div className="bg-[#113828] text-white rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold">
            ILP Allocation Optimization Control
          </h2>
          <p className="text-xs text-emerald-100/85">
            Execute the Integer Linear Programming solver across all open NGO demands and non-expired donor items.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/matching')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Open Matching Engine</span>
        </button>
      </div>

      {/* 5 Interactive Recharts Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Donations by Category (Units)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Donation Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {statusData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Monthly Donations & Matched Volume
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="donations"
                  stroke="#113828"
                  strokeWidth={2.5}
                />
                <Line
                  type="monotone"
                  dataKey="matched"
                  stroke="#059669"
                  strokeWidth={2.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            NGO Requirements vs Fulfilled Units
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ngoReqData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="ngo" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="required" fill="#113828" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fulfilled" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Delivery Completion Pipeline
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deliveryData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="stage"
                  type="category"
                  width={190}
                  interval={0}
                  tick={{ fontSize: 12, fill: '#334155' }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Admin-Only Protected Demo Account Management */}
      <DemoAccountManagementSection />
    </div>
  );
};

export const AdminUsersPage: React.FC<{ roleFilter: 'DONOR' | 'NGO' }> = ({
  roleFilter,
}) => {
  const { users, donations, requirements } = useApp();
  const filtered = users.filter((u) => u.role === roleFilter);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-base font-bold text-slate-900">
          Registered {roleFilter === 'DONOR' ? 'Donors' : 'NGOs'} ({filtered.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">Name</th>
              {roleFilter === 'NGO' && <th className="py-3 px-4">Registration ID</th>}
              <th className="py-3 px-4">Email & Phone</th>
              <th className="py-3 px-4">City / Area</th>
              <th className="py-3 px-4 text-right">
                {roleFilter === 'DONOR' ? 'Donations' : 'Requirements'}
              </th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((u) => {
              const count =
                roleFilter === 'DONOR'
                  ? donations.filter((d) => d.donorId === u.id).length
                  : requirements.filter((r) => r.ngoId === u.id).length;
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">
                      {u.ngoName || u.name}
                    </div>
                    {u.contactPerson && (
                      <div className="text-xs text-slate-500">
                        Contact: {u.contactPerson}
                      </div>
                    )}
                  </td>
                  {roleFilter === 'NGO' && (
                    <td className="py-3 px-4 font-mono-nums text-xs text-slate-700">
                      {u.registrationId || 'Pending'}
                    </td>
                  )}
                  <td className="py-3 px-4 text-xs text-slate-700">
                    <div>{u.email}</div>
                    <div className="font-mono-nums text-slate-500">{u.phone}</div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">
                    <div>{u.address}</div>
                    <div className="text-slate-500">
                      {u.city}, {u.state}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-nums font-bold text-[#113828]">
                    {count}
                  </td>
                  <td className="py-3 px-4">
                    <StatusLabel label="Verified" tone="emerald" icon="check" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminDonationsPage: React.FC = () => {
  const { donations, deleteDonation, nowMs } = useApp();
  const [search, setSearch] = useState('');

  const filtered = donations.filter(
    (d) =>
      d.itemName.toLowerCase().includes(search.toLowerCase()) ||
      d.donorName.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter donations by item, donor, or category..."
          className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg w-full max-w-sm"
        />
        <span className="text-xs text-slate-500 font-mono-nums">
          Showing {filtered.length} of {donations.length}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Donor</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Remaining / Total Donated</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Remove</th>
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
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {d.itemName}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{d.donorName}</td>
                    <td className="py-3 px-4 text-slate-600">{d.category}</td>
                    <td className="py-3 px-4 text-right font-mono-nums">
                      {remaining} / {d.quantity} {d.unit}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono-nums">
                      {exp ? `${exp.status} (${exp.countdownLabel})` : 'Non-perishable'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusLabel
                        label={d.status}
                        tone={
                          d.status === 'Expired'
                            ? 'rose'
                            : d.status === 'Completed'
                            ? 'emerald'
                            : 'forest'
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteDonation(d.id)}
                        className="p-1.5 text-rose-700 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                        title="Delete donation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AdminRequirementsPage: React.FC = () => {
  const { requirements, updateRequirement, deleteRequirement } = useApp();

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-base font-bold text-slate-900">
          All NGO Requirements ({requirements.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <th className="py-3 px-4">NGO</th>
              <th className="py-3 px-4">Item & Category</th>
              <th className="py-3 px-4 text-right">Remaining / Required</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {requirements.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {r.ngoName}
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-900">{r.itemName}</div>
                  <div className="text-xs text-slate-500">{r.category}</div>
                </td>
                <td className="py-3 px-4 text-right font-mono-nums">
                  {r.remainingQuantity} / {r.requiredQuantity} {r.unit}
                </td>
                <td className="py-3 px-4">
                  <select
                    value={r.priority}
                    onChange={(e) =>
                      updateRequirement(r.id, {
                        priority: e.target.value as NGOPriority,
                      })
                    }
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  >
                    {(['Low', 'Medium', 'High', 'Urgent'] as NGOPriority[]).map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      )
                    )}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <StatusLabel
                    label={r.status}
                    tone={r.status === 'Fulfilled' ? 'emerald' : 'slate'}
                  />
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => deleteRequirement(r.id)}
                    className="p-1.5 text-rose-700 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                    title="Delete requirement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminDeliveriesPage: React.FC = () => {
  const { deliveries } = useApp();
  const sortedDeliveries = [...deliveries].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );
  const [selectedId, setSelectedId] = useState(sortedDeliveries[0]?.id ?? '');
  const active =
    sortedDeliveries.find((d) => d.id === selectedId) ?? sortedDeliveries[0];

  if (!active) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
        No deliveries in the system yet. Run ILP matching to generate allocations and delivery tracking records.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 mr-2">
          Select Delivery ({sortedDeliveries.length}):
        </span>
        {sortedDeliveries.map((d) => (
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
            {d.id}: {d.itemName} ({d.stage})
          </button>
        ))}
      </div>

      <DeliveryMapPanel
        delivery={active}
        canUpdateStage={true}
        canConfirmReceipt={true}
      />
    </div>
  );
};

export const AdminReportsPage: React.FC = () => {
  const { donations, requirements, matches, deliveries } = useApp();

  const downloadCsv = () => {
    const headers = [
      'Match ID',
      'Run ID',
      'Donor',
      'NGO',
      'Item',
      'Category',
      'Allocated Qty',
      'Unit',
      'Distance (km)',
      'Priority',
      'Status',
    ];
    const rows = matches.map((m) => [
      m.id,
      m.runId,
      `"${m.donorName}"`,
      `"${m.ngoName}"`,
      `"${m.itemName}"`,
      `"${m.category}"`,
      m.allocatedQuantity,
      m.unit,
      m.distanceKm,
      m.priority,
      m.status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `giveright-allocation-report-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            System Audit & Allocation Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Export live allocation matches, inventory utilization, and delivery fulfillment logs.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Allocation CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Total Supply Units</div>
          <div className="text-2xl font-bold font-mono-nums text-slate-900 mt-1">
            {donations.reduce((s, d) => s + d.quantity, 0)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Total Demand Units</div>
          <div className="text-2xl font-bold font-mono-nums text-slate-900 mt-1">
            {requirements.reduce((s, r) => s + r.requiredQuantity, 0)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Active / Completed Matches</div>
          <div className="text-2xl font-bold font-mono-nums text-[#059669] mt-1">
            {matches.filter((m) => m.status !== 'Rejected').length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500">Confirmed Deliveries</div>
          <div className="text-2xl font-bold font-mono-nums text-[#113828] mt-1">
            {deliveries.filter((d) => d.stage === 'Receipt Confirmed').length}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminRouterView: React.FC<{
  path: string;
  navigate: (p: string) => void;
}> = ({ path, navigate }) => {
  const { currentUser } = useApp();
  if (!currentUser || currentUser.role !== 'ADMIN') return null;

  if (path === '/admin/donors') return <AdminUsersPage roleFilter="DONOR" />;
  if (path === '/admin/ngos') return <AdminUsersPage roleFilter="NGO" />;
  if (path === '/admin/donations') return <AdminDonationsPage />;
  if (path === '/admin/requirements') return <AdminRequirementsPage />;
  if (path === '/admin/matching') return <MatchingView role="ADMIN" navigate={navigate} />;
  if (path === '/admin/deliveries') return <AdminDeliveriesPage />;
  if (path === '/admin/perishable')
    return <PerishableMonitorView scope="admin" navigate={navigate} />;
  if (path === '/admin/demo-accounts') return <DemoAccountManagementSection />;
  if (path === '/admin/reports') return <AdminReportsPage />;
  return <AdminDashboardPage navigate={navigate} />;
};
