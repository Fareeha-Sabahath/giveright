import React, { useState } from 'react';
import { Bell, CheckCheck, CircleAlert, PackageCheck, Sparkles, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppNotification } from '../types';
import { StatusLabel } from './StatusText';

export const NotificationsView: React.FC = () => {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead } =
    useApp();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!currentUser) return null;

  const visible = notifications.filter((n) => {
    if (currentUser.role === 'ADMIN') return true;
    return (
      n.targetRole === 'ALL' ||
      (n.targetRole === currentUser.role &&
        (!n.targetUserId || n.targetUserId === currentUser.id))
    );
  });

  const displayed =
    filter === 'unread' ? visible.filter((n) => !n.read) : visible;
  const unreadCount = visible.filter((n) => !n.read).length;

  const getTypeVisual = (type: AppNotification['type']) => {
    if (type.startsWith('EXPIRY')) {
      return {
        icon: <CircleAlert className="w-4 h-4 text-rose-700" />,
        tone: 'rose' as const,
        label: 'Expiry Alert',
      };
    }
    if (type.startsWith('DELIVERY') || type === 'PICKUP_SCHEDULED') {
      return {
        icon: <Truck className="w-4 h-4 text-emerald-700" />,
        tone: 'emerald' as const,
        label: 'Delivery Update',
      };
    }
    if (type === 'ALLOCATION_REJECTED') {
      return {
        icon: <PackageCheck className="w-4 h-4 text-amber-700" />,
        tone: 'amber' as const,
        label: 'Allocation Update',
      };
    }
    return {
      icon: <Sparkles className="w-4 h-4 text-[#113828]" />,
      tone: 'forest' as const,
      label: 'Matching Alert',
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#113828]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Notification Centre
            </h2>
            <p className="text-xs text-slate-500">
              {unreadCount} unread alerts across matches, deliveries, and perishable food monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({visible.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-sm">
          No notifications match the selected view.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
          {displayed.map((n) => {
            const vis = getTypeVisual(n.type);
            return (
              <div
                key={n.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  n.read ? 'bg-white' : 'bg-[#F0FDF7]'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {vis.icon}
                    <span className="text-sm font-bold text-slate-900">
                      {n.title}
                    </span>
                    <StatusLabel label={vis.label} tone={vis.tone} />
                    {!n.read && (
                      <span className="text-xs font-semibold text-emerald-800">
                        · Unread
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <div className="text-xs text-slate-400 font-mono-nums">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>

                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-white text-[#113828] hover:bg-emerald-50 transition-colors cursor-pointer"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
