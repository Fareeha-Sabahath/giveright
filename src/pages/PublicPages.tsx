import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { evaluateExpiry } from '../utils/expiry';
import { HYDERABAD_LOCATIONS } from '../utils/geo';

interface PublicPageProps {
  currentPath: string;
  navigate: (path: string) => void;
}

const HERO_IMG = '/src/assets/images/hero_donation_hub_1795668776610.jpg';
const KITCHEN_IMG = '/src/assets/images/about_community_kitchen_1795668777646.jpg';
const COLD_CHAIN_IMG = '/src/assets/images/feature_cold_chain_1795668777464.jpg';
const DELIVERY_VAN_IMG = '/src/assets/images/feature_delivery_van_1795668778682.jpg';

const ResilientImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
}> = ({ src, alt, className = '', fallbackTitle }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`bg-gradient-to-br from-[#113828] to-[#059669] text-white flex flex-col items-center justify-center p-6 text-center ${className}`}
      >
        <ShieldCheck className="w-10 h-10 mb-2 opacity-90" />
        <span className="text-sm font-semibold">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const PublicFooter: React.FC<{ navigate: (path: string) => void }> = ({
  navigate,
}) => (
  <footer className="bg-[#0F2F22] text-emerald-100 border-t border-emerald-900">
    <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="md:col-span-2 space-y-3">
        <div className="text-xl font-bold text-white">GiveRight</div>
        <p className="text-sm text-emerald-200/80 max-w-md leading-relaxed">
          Connecting Generosity with Genuine Needs. An Integer Linear Programming
          donation allocation, live route tracking, and perishable food rescue
          platform built for urban NGO networks.
        </p>
      </div>
      <div className="space-y-2 text-sm">
        <div className="font-semibold text-white">Platform</div>
        <div className="flex flex-col gap-1.5 text-emerald-200/80">
          <button type="button" onClick={() => navigate('/about')} className="text-left hover:text-white cursor-pointer">
            About GiveRight
          </button>
          <button type="button" onClick={() => navigate('/how-it-works')} className="text-left hover:text-white cursor-pointer">
            How It Works
          </button>
          <button type="button" onClick={() => navigate('/login')} className="text-left hover:text-white cursor-pointer">
            Demo Login Portal
          </button>
          <button type="button" onClick={() => navigate('/register')} className="text-left hover:text-white cursor-pointer">
            Donor & NGO Registration
          </button>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="font-semibold text-white">Hyderabad Pilot Hubs</div>
        <p className="text-emerald-200/80 leading-relaxed">
          Ameerpet · Gachibowli · Kukatpally · Secunderabad · Uppal · Abids
        </p>
      </div>
    </div>
    <div className="border-t border-emerald-900/70">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-200/70">
        <span>&copy; {new Date().getFullYear()} GiveRight Donation Allocation Platform</span>
        <span>Connecting Generosity with Genuine Needs</span>
      </div>
    </div>
  </footer>
);

export const LandingPage: React.FC<PublicPageProps> = ({
  currentPath,
  navigate,
}) => {
  const { donations, requirements, users, matches, deliveries, nowMs } = useApp();

  const totalDonors = users.filter((u) => u.role === 'DONOR').length;
  const totalNGOs = users.filter((u) => u.role === 'NGO').length;
  const totalItemsAvailable = donations.reduce(
    (s, d) => s + (d.status !== 'Expired' ? d.quantity : 0),
    0
  );
  const completedDeliveries = deliveries.filter(
    (d) => d.stage === 'Delivered' || d.stage === 'Receipt Confirmed'
  ).length;
  const criticalFoodCount = donations.filter(
    (d) =>
      d.isPerishable &&
      d.remainingQuantity > 0 &&
      ['Critical', 'Urgent'].includes(evaluateExpiry(d.expiryDateTime, nowMs).status)
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8F7]">
      <PublicNavbar currentPath={currentPath} navigate={navigate} />

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="text-xs font-semibold text-[#059669] tracking-wide">
              Integer Linear Programming · Perishable Rescue · Live Route Telemetry
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#113828] leading-[1.1] [text-wrap:balance]">
              Connecting Generosity with Genuine Needs.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              GiveRight matches surplus food, clothing, medicines, and school essentials from verified donors to high-priority NGOs using mathematical optimization, live delivery GPS tracking, and real-time food expiry monitoring.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#113828] hover:bg-[#0B261B] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Launch Demo Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#113828] bg-[#ECFDF5] hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Register as Donor or NGO</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <ResilientImage
                src={HERO_IMG}
                alt="Volunteers sorting rice sacks and hygiene kits at a Hyderabad NGO donation logistics hub"
                fallbackTitle="GiveRight Relief & Logistics Hub"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Live Platform Impact Strip */}
        <div className="border-t border-slate-200 bg-[#F0FDF7]">
          <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <div className="text-xs font-medium text-slate-600">Verified Donors</div>
              <div className="text-2xl font-bold font-mono-nums text-[#113828] mt-1">
                {totalDonors}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">Partner NGOs</div>
              <div className="text-2xl font-bold font-mono-nums text-[#113828] mt-1">
                {totalNGOs}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">Active Supply Units</div>
              <div className="text-2xl font-bold font-mono-nums text-[#113828] mt-1">
                {totalItemsAvailable}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">NGO Requirements</div>
              <div className="text-2xl font-bold font-mono-nums text-[#113828] mt-1">
                {requirements.length}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">
                Matches & Deliveries
              </div>
              <div className="text-2xl font-bold font-mono-nums text-[#059669] mt-1">
                {matches.length} / {completedDeliveries}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About GiveRight */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-5 rounded-xl overflow-hidden border border-slate-200 bg-white">
          <ResilientImage
            src={KITCHEN_IMG}
            alt="Fresh vegetables, grain sacks, and community meal kits prepared for distribution"
            fallbackTitle="Community Kitchen Distribution"
            className="w-full h-80 object-cover"
          />
        </div>
        <div className="lg:col-span-7 space-y-5">
          <div className="text-xs font-semibold text-[#059669]">About GiveRight</div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
            Replacing guesswork in charitable logistics with constrained optimization
          </h2>
          <p className="text-slate-600 leading-relaxed">
            In traditional donation drives, perishable meals expire in transit while urgent shelters run short of staple grains. GiveRight coordinates donors, non-governmental organizations, and logistics coordinators on a unified workspace.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Our optimization engine formulates every allocation cycle as an Integer Linear Program—maximizing requirement fulfillment, elevating high-urgency NGOs, rescuing near-expiry food batches, and minimizing last-mile travel across Hyderabad neighborhoods.
          </p>
          <div className="pt-2 flex flex-wrap gap-6 text-sm font-medium text-slate-800">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              Zero double-allocation guarantee
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              Split-donation support across NGOs
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              Expired food strictly blocked
            </span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10 space-y-2">
            <div className="text-xs font-semibold text-[#059669]">How It Works</div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Four coordinated stages from surplus pledge to verified NGO receipt
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '01. Donors Register Surplus',
                desc: 'Donors submit one or multiple items—rice, cooked meals, notebooks, hygiene kits—with pickup coordinates and food expiry timestamps.',
              },
              {
                num: '02. NGOs Post Priorities',
                desc: 'Verified NGOs register item quantities, units, required-by dates, and priority tiers (Low, Medium, High, Urgent).',
              },
              {
                num: '03. ILP Engine Optimizes',
                desc: 'Integer decision variables allocate compatible items while prioritizing urgent NGOs, near-expiry food, and shortest distance.',
              },
              {
                num: '04. Tracked Delivery & Receipt',
                desc: 'NGOs accept allocations, couriers advance 7-stage delivery updates on Leaflet OpenStreetMap, and NGOs confirm final receipt.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="p-6 rounded-xl border border-slate-200 bg-[#F6F8F7] space-y-3"
              >
                <h3 className="text-base font-bold text-[#113828]">{step.num}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Features (Asymmetric Bento Layout) */}
      <section className="max-w-7xl mx-auto px-6 py-16 space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <div className="text-xs font-semibold text-[#059669]">Core Capabilities</div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Built for accountable last-mile NGO operations
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/how-it-works')}
            className="text-sm font-semibold text-[#113828] hover:text-[#059669] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Explore ILP & Architecture</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Primary Feature Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="h-60 bg-slate-100">
              <ResilientImage
                src={COLD_CHAIN_IMG}
                alt="Fresh produce and dairy crates with expiry labels in cold-storage rescue shelf"
                fallbackTitle="Perishable Food Expiry Rescue"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-3 flex-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                <Clock className="w-4 h-4" />
                <span>
                  Perishable Food Monitoring · {criticalFoodCount} active urgent/critical food batches
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Real-Time Expiry Countdowns & Automatic Safety Blocking
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Cooked food, dairy, fresh fruits, and vegetables are tracked down to the second using donor-entered expiry timestamps. Batches under 6 hours trigger Critical alerts and priority ILP weights; expired food is strictly locked out from allocation.
              </p>
            </div>
          </div>

          {/* Secondary Stacked Cards */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1 flex flex-col">
              <div className="h-44 bg-slate-100">
                <ResilientImage
                  src={DELIVERY_VAN_IMG}
                  alt="Urban relief van being loaded with donation cartons in daylight"
                  fallbackTitle="Live Leaflet Route Tracking"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#059669]">
                  <Truck className="w-4 h-4" />
                  <span>OpenStreetMap & Geolocation API</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  7-Stage Live Delivery Tracking
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Shared donor-NGO Leaflet maps display pickup hubs, drop centers, live browser GPS coordinates (or clearly labeled simulated demo GPS), and ETA.
                </p>
              </div>
            </div>

            <div className="bg-[#113828] text-white border border-emerald-900 rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <Cpu className="w-4 h-4" />
                <span>Mathematical Allocation Engine</span>
              </div>
              <h3 className="text-lg font-bold">
                Exact Integer Linear Programming
              </h3>
              <p className="text-sm text-emerald-100/85 leading-relaxed">
                Supports splitting one large donation across multiple NGOs and combining multiple donors for one NGO demand—backed by both our client-side Demo ILP solver and a Google OR-Tools FastAPI service.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter navigate={navigate} />
    </div>
  );
};

export const AboutPage: React.FC<PublicPageProps> = ({
  currentPath,
  navigate,
}) => (
  <div className="min-h-screen flex flex-col bg-[#F6F8F7]">
    <PublicNavbar currentPath={currentPath} navigate={navigate} />
    <main className="flex-1 max-w-5xl mx-auto px-6 py-12 space-y-10 w-full">
      <div className="space-y-4">
        <div className="text-xs font-semibold text-[#059669]">About GiveRight</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#113828] tracking-tight">
          Built to bridge surplus generosity and verified grassroots demand
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          GiveRight is an end-to-end NGO donation allocation and logistics platform designed to eliminate food waste, prevent mismatched relief deliveries, and give both donors and charitable organizations transparent visibility from pledge to receipt confirmation.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
        <ResilientImage
          src={KITCHEN_IMG}
          alt="NGO volunteers sorting grain sacks and fresh vegetables"
          fallbackTitle="GiveRight Community Distribution"
          className="w-full h-72 object-cover"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Fair Mathematical Matching</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Allocations are solved with integer decision variables so partial quantities can be split accurately across multiple NGOs without over-committing inventory.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. Perishable Food Safety</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every food item carries a donor-specified preparation and expiry timestamp. Automated timers trigger <span className="font-semibold">Critical (&lt;6h)</span>, <span className="font-semibold">Urgent (&lt;24h)</span>, and <span className="font-semibold">Expired</span> rules.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Shared Accountability</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            NGOs explicitly accept or reject proposed matches, track incoming couriers on OpenStreetMap, and sign off final receipt to close the audit trail.
          </p>
        </div>
      </div>

      <div className="bg-[#113828] text-white rounded-xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">Ready to test the full workflow?</h3>
          <p className="text-sm text-emerald-100/85">
            Sign in with our pre-configured Donor, NGO, or Admin demo accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          Open Demo Login
        </button>
      </div>
    </main>
    <PublicFooter navigate={navigate} />
  </div>
);

export const HowItWorksPage: React.FC<PublicPageProps> = ({
  currentPath,
  navigate,
}) => (
  <div className="min-h-screen flex flex-col bg-[#F6F8F7]">
    <PublicNavbar currentPath={currentPath} navigate={navigate} />
    <main className="flex-1 max-w-5xl mx-auto px-6 py-12 space-y-10 w-full">
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#059669]">How It Works</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#113828] tracking-tight">
          Four simple steps from surplus pledge to verified NGO delivery
        </h1>
        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          GiveRight connects donors with verified NGOs using smart matching, expiry monitoring, and transparent delivery tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            step: 'Step 1',
            title: 'Donors submit available donation items and quantities',
            desc: 'Donors register surplus food, books, clothing, medicines, or essential kits with accurate quantities, units, pickup locations, and perishable food expiry dates.',
            icon: <CheckCircle2 className="w-5 h-5 text-[#059669]" />,
          },
          {
            step: 'Step 2',
            title: 'NGOs submit their required items and quantities',
            desc: 'Verified NGOs publish their needed items, required quantities, priority levels, and target delivery dates.',
            icon: <Clock className="w-5 h-5 text-[#059669]" />,
          },
          {
            step: 'Step 3',
            title: 'GiveRight optimizes donation allocation',
            desc: 'GiveRight matches donors and NGOs automatically based on item compatibility, available and required quantities, NGO priority, food expiry urgency, and location distance.',
            icon: <Cpu className="w-5 h-5 text-[#059669]" />,
          },
          {
            step: 'Step 4',
            title: 'Donors and NGOs monitor allocation and delivery progress',
            desc: 'NGOs review and confirm matched donations while donors and NGOs follow live route updates and delivery milestones through final receipt confirmation.',
            icon: <Truck className="w-5 h-5 text-[#059669]" />,
          },
        ].map((item) => (
          <div
            key={item.step}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#059669] bg-[#ECFDF5] border border-emerald-200 px-2.5 py-1 rounded-md">
                  {item.step}
                </span>
                {item.icon}
              </div>
              <h2 className="text-lg font-bold text-[#113828]">{item.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-center">
        <div className="md:col-span-5 h-56 md:h-full bg-slate-100">
          <ResilientImage
            src={DELIVERY_VAN_IMG}
            alt="Community relief vehicle transporting sorted donations"
            fallbackTitle="Accountable NGO Delivery"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="md:col-span-7 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#059669]">
            <MapPin className="w-4 h-4" />
            <span>Safe Perishable Handling &amp; Live Tracking</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Built for food safety and end-to-end visibility
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Perishable food batches are monitored with live countdowns so urgent items are prioritized early and expired food is automatically prevented from being allocated.
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg transition-colors cursor-pointer"
            >
              <span>Sign In to Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
    <PublicFooter navigate={navigate} />
  </div>
);

export const LoginPage: React.FC<PublicPageProps> = ({
  currentPath,
  navigate,
}) => {
  const { login } = useApp();
  const [role, setRole] = useState<UserRole>('DONOR');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const routeForRole = (r: UserRole) =>
    r === 'DONOR'
      ? '/donor/dashboard'
      : r === 'NGO'
      ? '/ngo/dashboard'
      : '/admin/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    const res = await login(email, password, role);
    setSubmitting(false);
    if (!res.ok || !res.user) {
      setError(res.error ?? 'Sign in failed.');
      return;
    }
    navigate(routeForRole(res.user.role));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8F7]">
      <PublicNavbar currentPath={currentPath} navigate={navigate} />

      <main className="flex-1 max-w-lg mx-auto px-6 py-12 w-full">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sign in to GiveRight</h1>
            <p className="text-sm text-slate-500 mt-1">
              Select your role and enter your account credentials.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            {(['DONOR', 'NGO', 'ADMIN'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  role === r
                    ? 'bg-white text-[#113828] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.org"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 text-sm font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Signing In...' : `Sign In as ${role}`}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>New to GiveRight?</span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-semibold text-[#059669] hover:text-[#113828] cursor-pointer"
            >
              Create Donor or NGO Account
            </button>
          </div>
        </div>
      </main>
      <PublicFooter navigate={navigate} />
    </div>
  );
};

export const RegisterPage: React.FC<PublicPageProps> = ({
  currentPath,
  navigate,
}) => {
  const { registerDonor, registerNGO } = useApp();
  const [role, setRole] = useState<'DONOR' | 'NGO'>('DONOR');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Shared fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('SR Nagar Cross Roads, Ameerpet');
  const [city, setCity] = useState('Hyderabad');
  const [stateName, setStateName] = useState('Telangana');
  const [lat, setLat] = useState(17.4375);
  const [lng, setLng] = useState(78.4483);

  // Donor-specific
  const [donorName, setDonorName] = useState('');

  // NGO-specific
  const [ngoName, setNgoName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [description, setDescription] = useState('');

  const handleHubChange = (idxStr: string) => {
    const loc = HYDERABAD_LOCATIONS[Number(idxStr)];
    if (!loc) return;
    setAddress(loc.address);
    setCity(loc.city);
    setStateName(loc.state);
    setLat(loc.lat);
    setLng(loc.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (role === 'DONOR') {
      if (!donorName.trim() || !email.trim() || !phone.trim() || !address.trim()) {
        setError('Please complete all Donor registration fields.');
        return;
      }
      setSubmitting(true);
      const res = await registerDonor({
        name: donorName,
        email,
        phone,
        password,
        address,
        city,
        state: stateName,
        lat,
        lng,
      });
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? 'Registration failed.');
        return;
      }
      navigate('/donor/dashboard');
    } else {
      if (
        !ngoName.trim() ||
        !contactPerson.trim() ||
        !email.trim() ||
        !phone.trim() ||
        !registrationId.trim() ||
        !address.trim() ||
        !description.trim()
      ) {
        setError('Please complete all NGO registration fields.');
        return;
      }
      setSubmitting(true);
      const res = await registerNGO({
        ngoName,
        contactPerson,
        email,
        phone,
        password,
        registrationId,
        address,
        city,
        state: stateName,
        description,
        lat,
        lng,
      });
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? 'Registration failed.');
        return;
      }
      navigate('/ngo/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8F7]">
      <PublicNavbar currentPath={currentPath} navigate={navigate} />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Register with GiveRight
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Choose your account role to begin donating or posting verified NGO needs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setRole('DONOR');
                  setError('');
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  role === 'DONOR'
                    ? 'bg-white text-[#113828] shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                Donor Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('NGO');
                  setError('');
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  role === 'NGO'
                    ? 'bg-white text-[#113828] shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                NGO Account
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'DONOR' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="e.g. Rohan Kulkarni"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98490 00000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      NGO Name
                    </label>
                    <input
                      type="text"
                      value={ngoName}
                      onChange={(e) => setNgoName(e.target.value)}
                      placeholder="e.g. Seva Bharati Hyderabad"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Sunita Rao"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      NGO Registration ID
                    </label>
                    <input
                      type="text"
                      value={registrationId}
                      onChange={(e) => setRegistrationId(e.target.value)}
                      placeholder="TG/NGO/2024/00123"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98490 00000"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Organization Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your NGO's community programs and beneficiaries..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.org"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700">
                  Address & Area Coordinates
                </label>
                <select
                  onChange={(e) => handleHubChange(e.target.value)}
                  defaultValue=""
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="" disabled>
                    Select Hyderabad Area Preset...
                  </option>
                  {HYDERABAD_LOCATIONS.map((loc, idx) => (
                    <option key={loc.label} value={idx}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street Address"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                required
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-sm font-semibold bg-[#113828] hover:bg-[#0B261B] text-white rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? 'Creating Account...'
                : `Complete ${role === 'DONOR' ? 'Donor' : 'NGO'} Registration`}
            </button>
          </form>
        </div>
      </main>

      <PublicFooter navigate={navigate} />
    </div>
  );
};
