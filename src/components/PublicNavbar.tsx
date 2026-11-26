import React from 'react';
import { useApp } from '../context/AppContext';

interface PublicNavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentPath,
  navigate,
}) => {
  const { currentUser } = useApp();

  const getDashboardPath = () => {
    if (!currentUser) return '/register';
    if (currentUser.role === 'DONOR') return '/donor/dashboard';
    if (currentUser.role === 'NGO') return '/ngo/dashboard';
    return '/admin/dashboard';
  };

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
      currentPath === path
        ? 'text-[#113828] border-[#059669]'
        : 'text-slate-600 border-transparent hover:text-[#113828] hover:border-emerald-300'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-xl font-bold tracking-tight text-[#113828] whitespace-nowrap shrink-0 cursor-pointer"
        >
          GiveRight
        </button>

        <nav className="hidden md:flex items-center gap-7">
          <button type="button" onClick={() => navigate('/')} className={linkClass('/')}>
            Home
          </button>
          <button type="button" onClick={() => navigate('/about')} className={linkClass('/about')}>
            About
          </button>
          <button
            type="button"
            onClick={() => navigate('/how-it-works')}
            className={linkClass('/how-it-works')}
          >
            How It Works
          </button>
          <button type="button" onClick={() => navigate('/login')} className={linkClass('/login')}>
            {currentUser ? 'Switch Account' : 'Sign In'}
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate(getDashboardPath())}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#113828] hover:bg-[#0B261B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {currentUser ? 'Open Dashboard' : 'Get Started'}
          </button>
        </div>
      </div>
    </header>
  );
};
