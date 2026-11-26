import React, { useEffect, useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { AppProvider, useApp } from './context/AppContext';
import { AdminRouterView } from './pages/AdminPages';
import { DonorRouterView } from './pages/DonorPages';
import { NGORouterView } from './pages/NGOPages';
import {
  AboutPage,
  HowItWorksPage,
  LandingPage,
  LoginPage,
  RegisterPage,
} from './pages/PublicPages';

function getHashPath(): string {
  const raw = window.location.hash.replace(/^#/, '');
  return raw || '/';
}

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/donor/dashboard': { title: 'Donor Dashboard', subtitle: 'Overview of your donations, allocations, and active deliveries' },
  '/donor/add-donation': { title: 'Add Donation', subtitle: 'Register single or multi-item donations with perishable expiry data' },
  '/donor/donations': { title: 'My Donations', subtitle: 'Edit, manage, and inspect all registered donations' },
  '/donor/matching': { title: 'Matching Results', subtitle: 'Integer Linear Programming allocations for your donated items' },
  '/donor/tracking': { title: 'Delivery Tracking', subtitle: 'Live OpenStreetMap route telemetry & delivery stages' },
  '/donor/perishable': { title: 'Perishable Food', subtitle: 'Real-time expiry countdowns and urgency status' },
  '/donor/notifications': { title: 'Notifications', subtitle: 'Matches, expiry warnings, and delivery updates' },
  '/donor/profile': { title: 'Donor Profile', subtitle: 'Manage contact information and pickup coordinates' },
  '/ngo/dashboard': { title: 'NGO Dashboard', subtitle: 'Requirements, pending allocation reviews, and incoming deliveries' },
  '/ngo/add-requirement': { title: 'Add Requirement', subtitle: 'Publish prioritized item needs for ILP matching' },
  '/ngo/requirements': { title: 'My Requirements', subtitle: 'Manage open and fulfilled organizational requirements' },
  '/ngo/matched': { title: 'Matched Donations', subtitle: 'Accept or reject incoming ILP allocation proposals' },
  '/ngo/incoming': { title: 'Incoming Deliveries', subtitle: 'Monitor shipments and confirm final receipt' },
  '/ngo/tracking': { title: 'Delivery Tracking', subtitle: 'Live OpenStreetMap courier view and receipt confirmation' },
  '/ngo/notifications': { title: 'Notifications', subtitle: 'Allocations, transit alerts, and expiry notifications' },
  '/ngo/profile': { title: 'NGO Profile', subtitle: 'Organization credentials, registration ID, and center address' },
  '/admin/dashboard': { title: 'Admin Operations Dashboard', subtitle: 'System-wide telemetry, analytics, and matching control' },
  '/admin/donors': { title: 'Donor Management', subtitle: 'Verified donors and contribution counts' },
  '/admin/ngos': { title: 'NGO Management', subtitle: 'Registered NGOs and verification status' },
  '/admin/donations': { title: 'Donation Management', subtitle: 'All donor inventory across categories' },
  '/admin/requirements': { title: 'Requirement Management', subtitle: 'All NGO requirements and priority tiers' },
  '/admin/matching': { title: 'ILP Matching Engine', subtitle: 'Run optimization and inspect mathematical allocation constraints' },
  '/admin/deliveries': { title: 'Delivery Management', subtitle: 'Dispatch stages, live GPS, and simulated demo telemetry' },
  '/admin/perishable': { title: 'Perishable Food Monitoring', subtitle: 'Expiry status tracking and safety locks' },
  '/admin/demo-accounts': { title: 'Demo Account Management', subtitle: 'Protected credential governance for sample evaluation accounts' },
  '/admin/reports': { title: 'Reports & Export', subtitle: 'Downloadable allocation audit logs and summary statistics' },
};

const AppShell: React.FC = () => {
  const { currentUser, authChecked } = useApp();
  const [path, setPath] = useState<string>(() => getHashPath());

  useEffect(() => {
    const onHashChange = () => setPath(getHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (nextPath: string) => {
    const normalized = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
    window.location.hash = normalized;
    setPath(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Public routes
  if (path === '/' || path === '') {
    return <LandingPage currentPath="/" navigate={navigate} />;
  }
  if (path === '/about') {
    return <AboutPage currentPath={path} navigate={navigate} />;
  }
  if (path === '/how-it-works') {
    return <HowItWorksPage currentPath={path} navigate={navigate} />;
  }
  if (path === '/login') {
    return <LoginPage currentPath={path} navigate={navigate} />;
  }
  if (path === '/register') {
    return <RegisterPage currentPath={path} navigate={navigate} />;
  }

  // Protected role-based routing guard
  const isDonorRoute = path.startsWith('/donor');
  const isNGORoute = path.startsWith('/ngo');
  const isAdminRoute = path.startsWith('/admin');

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8F7] text-sm text-slate-600">
        Verifying session...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage currentPath="/login" navigate={navigate} />;
  }

  if (isDonorRoute && currentUser.role !== 'DONOR') {
    const fallback =
      currentUser.role === 'NGO' ? '/ngo/dashboard' : '/admin/dashboard';
    return (
      <DashboardLayout
        currentPath={fallback}
        navigate={navigate}
        title="Redirected to Your Role Workspace"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <p className="text-sm text-slate-700">
            You are signed in as <strong>{currentUser.role}</strong>. Access to Donor routes requires a Donor account.
          </p>
          <button
            type="button"
            onClick={() => navigate(fallback)}
            className="px-4 py-2 text-xs font-semibold bg-[#113828] text-white rounded-lg cursor-pointer"
          >
            Go to {currentUser.role} Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (isNGORoute && currentUser.role !== 'NGO') {
    const fallback =
      currentUser.role === 'DONOR' ? '/donor/dashboard' : '/admin/dashboard';
    return (
      <DashboardLayout
        currentPath={fallback}
        navigate={navigate}
        title="Role Access Notice"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <p className="text-sm text-slate-700">
            You are signed in as <strong>{currentUser.role}</strong>. Access to NGO routes requires an NGO account.
          </p>
          <button
            type="button"
            onClick={() => navigate(fallback)}
            className="px-4 py-2 text-xs font-semibold bg-[#113828] text-white rounded-lg cursor-pointer"
          >
            Go to {currentUser.role} Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (isAdminRoute && currentUser.role !== 'ADMIN') {
    const fallback =
      currentUser.role === 'DONOR' ? '/donor/dashboard' : '/ngo/dashboard';
    return (
      <DashboardLayout
        currentPath={fallback}
        navigate={navigate}
        title="Role Access Notice"
      >
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <p className="text-sm text-slate-700">
            You are signed in as <strong>{currentUser.role}</strong>. Admin routes require an Admin account.
          </p>
          <button
            type="button"
            onClick={() => navigate(fallback)}
            className="px-4 py-2 text-xs font-semibold bg-[#113828] text-white rounded-lg cursor-pointer"
          >
            Go to {currentUser.role} Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const headerInfo =
    ROUTE_TITLES[path] ??
    (path.startsWith('/donor/donations/')
      ? {
          title: 'Donation Details',
          subtitle: 'Allocated quantities, matched NGOs, and expiry monitoring',
        }
      : { title: 'GiveRight Workspace', subtitle: 'Donation Allocation System' });

  return (
    <DashboardLayout
      currentPath={path}
      navigate={navigate}
      title={headerInfo.title}
      subtitle={headerInfo.subtitle}
    >
      {isDonorRoute && <DonorRouterView path={path} navigate={navigate} />}
      {isNGORoute && <NGORouterView path={path} navigate={navigate} />}
      {isAdminRoute && <AdminRouterView path={path} navigate={navigate} />}
      {!isDonorRoute && !isNGORoute && !isAdminRoute && (
        <LandingPage currentPath="/" navigate={navigate} />
      )}
    </DashboardLayout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
