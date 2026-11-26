import React, { useState } from 'react';
import {
  Activity,
  Apple,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Cpu,
  Gift,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  PlusCircle,
  RotateCcw,
  User,
  Users,
  X,
} from 'lucide-react';
import { isFirebaseConfigured } from '../config/firebase';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

interface DashboardLayoutProps {
  currentPath: string;
  navigate: (path: string) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPath,
  navigate,
  title,
  subtitle,
  children,
}) => {
  const { currentUser, logout, notifications, resetDemoData } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!currentUser) return null;

  const unreadCount = notifications.filter((n) => {
    if (n.read) return false;
    if (currentUser.role === 'ADMIN') return true;
    return (
      n.targetRole === 'ALL' ||
      (n.targetRole === currentUser.role &&
        (!n.targetUserId || n.targetUserId === currentUser.id))
    );
  }).length;

  const roleNavs: Record<UserRole, NavItem[]> = {
    DONOR: [
      { label: 'Dashboard', path: '/donor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Add Donation', path: '/donor/add-donation', icon: <PlusCircle className="w-4 h-4" /> },
      { label: 'My Donations', path: '/donor/donations', icon: <Gift className="w-4 h-4" /> },
      { label: 'Matching Results', path: '/donor/matching', icon: <Cpu className="w-4 h-4" /> },
      { label: 'Delivery Tracking', path: '/donor/tracking', icon: <MapPin className="w-4 h-4" /> },
      { label: 'Perishable Food', path: '/donor/perishable', icon: <Apple className="w-4 h-4" /> },
      { label: 'Notifications', path: '/donor/notifications', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
      { label: 'Profile', path: '/donor/profile', icon: <User className="w-4 h-4" /> },
    ],
    NGO: [
      { label: 'Dashboard', path: '/ngo/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Add Requirement', path: '/ngo/add-requirement', icon: <PlusCircle className="w-4 h-4" /> },
      { label: 'My Requirements', path: '/ngo/requirements', icon: <ClipboardList className="w-4 h-4" /> },
      { label: 'Matched Donations', path: '/ngo/matched', icon: <Cpu className="w-4 h-4" /> },
      { label: 'Incoming Deliveries', path: '/ngo/incoming', icon: <PackageCheck className="w-4 h-4" /> },
      { label: 'Delivery Tracking', path: '/ngo/tracking', icon: <MapPin className="w-4 h-4" /> },
      { label: 'Notifications', path: '/ngo/notifications', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
      { label: 'Profile', path: '/ngo/profile', icon: <User className="w-4 h-4" /> },
    ],
    ADMIN: [
      { label: 'Admin Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Matching Engine', path: '/admin/matching', icon: <Cpu className="w-4 h-4" /> },
      { label: 'Donors', path: '/admin/donors', icon: <Users className="w-4 h-4" /> },
      { label: 'NGOs', path: '/admin/ngos', icon: <Building2 className="w-4 h-4" /> },
      { label: 'Donations', path: '/admin/donations', icon: <Gift className="w-4 h-4" /> },
      { label: 'Requirements', path: '/admin/requirements', icon: <ClipboardList className="w-4 h-4" /> },
      { label: 'Deliveries', path: '/admin/deliveries', icon: <MapPin className="w-4 h-4" /> },
      { label: 'Perishable Food', path: '/admin/perishable', icon: <Apple className="w-4 h-4" /> },
      { label: 'Demo Accounts', path: '/admin/demo-accounts', icon: <KeyRound className="w-4 h-4" /> },
      { label: 'Reports', path: '/admin/reports', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  };

  const navItems = roleNavs[currentUser.role];
  const notificationRoute =
    currentUser.role === 'DONOR'
      ? '/donor/notifications'
      : currentUser.role === 'NGO'
      ? '/ngo/notifications'
      : '/admin/perishable';

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#113828] text-emerald-50">
      <div className="px-5 h-16 flex items-center justify-between border-b border-emerald-900/60">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap cursor-pointer"
        >
          GiveRight
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-emerald-200 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-emerald-900/60">
        <div className="text-xs text-emerald-300 font-medium">
          {currentUser.role === 'NGO' ? 'NGO Workspace' : currentUser.role === 'DONOR' ? 'Donor Workspace' : 'Operations Admin'}
        </div>
        <div className="text-sm font-semibold text-white truncate mt-0.5">
          {currentUser.ngoName || currentUser.name}
        </div>
        <div className="text-xs text-emerald-200/80 truncate mt-0.5">
          {currentUser.city}, {currentUser.state}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active =
            currentPath === item.path ||
            (item.path === '/donor/donations' && currentPath.startsWith('/donor/donations/'));
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-100/85 hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 truncate">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="font-mono-nums text-xs px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-semibold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-emerald-900/60 space-y-1.5">
        <div className="px-3 py-2 rounded-lg bg-emerald-950/60 text-xs text-emerald-200/90">
          Storage: {isFirebaseConfigured() ? 'Firebase Connected' : 'Local Demo Mode'}
        </div>
        {currentUser.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => {
              resetDemoData();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-200 hover:bg-emerald-900/60 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sample Data</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-emerald-100/85 hover:bg-emerald-900/60 hover:text-white transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Public Site</span>
        </button>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-200 hover:bg-rose-950/50 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F6F8F7]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-full h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-slate-500 truncate hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate(notificationRoute)}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Open Notification Centre"
            >
              <Bell className="w-4 h-4 text-[#113828]" />
              <span className="hidden sm:inline">Alerts</span>
              {unreadCount > 0 && (
                <span className="font-mono-nums text-xs px-1.5 py-0.5 rounded bg-rose-600 text-white font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-xs font-semibold text-[#113828] hover:bg-emerald-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-700" />
              <span>{currentUser.role}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
