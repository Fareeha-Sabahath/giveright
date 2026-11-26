import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react';
import { ExpiryStatus, NGOPriority } from '../types';

export const StatusLabel: React.FC<{
  label: string;
  tone?: 'emerald' | 'amber' | 'rose' | 'slate' | 'forest';
  icon?: 'check' | 'clock' | 'alert' | 'truck' | 'x';
}> = ({ label, tone = 'slate', icon }) => {
  const toneClasses: Record<string, string> = {
    emerald: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    forest: 'text-[#113828] bg-[#ECFDF5] border-emerald-300',
    amber: 'text-amber-800 bg-amber-50 border-amber-200',
    rose: 'text-rose-800 bg-rose-50 border-rose-200',
    slate: 'text-slate-700 bg-slate-100 border-slate-200',
  };

  const renderIcon = () => {
    switch (icon) {
      case 'check':
        return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
      case 'clock':
        return <Clock className="w-3.5 h-3.5 shrink-0" />;
      case 'alert':
        return <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
      case 'truck':
        return <Truck className="w-3.5 h-3.5 shrink-0" />;
      case 'x':
        return <XCircle className="w-3.5 h-3.5 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap ${toneClasses[tone]}`}
    >
      {renderIcon()}
      <span>{label}</span>
    </span>
  );
};

export const ExpiryStatusLabel: React.FC<{
  status: ExpiryStatus;
  countdown?: string;
}> = ({ status, countdown }) => {
  const map: Record<
    ExpiryStatus,
    { bg: string; icon: React.ReactNode }
  > = {
    Expired: {
      bg: 'text-red-800 bg-red-50 border-red-200',
      icon: <ShieldAlert className="w-3.5 h-3.5 shrink-0" />,
    },
    Critical: {
      bg: 'text-rose-800 bg-rose-50 border-rose-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    Urgent: {
      bg: 'text-amber-800 bg-amber-50 border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    'Approaching Expiry': {
      bg: 'text-yellow-800 bg-yellow-50 border-yellow-200',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    Fresh: {
      bg: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
  };

  const cfg = map[status];
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded border whitespace-nowrap ${cfg.bg}`}
      >
        {cfg.icon}
        <span>{status}</span>
      </span>
      {countdown && (
        <span className="font-mono-nums text-xs text-slate-700 font-medium">
          {countdown}
        </span>
      )}
    </div>
  );
};

export const PriorityLabel: React.FC<{ priority: NGOPriority }> = ({
  priority,
}) => {
  const tone =
    priority === 'Urgent'
      ? 'rose'
      : priority === 'High'
      ? 'amber'
      : priority === 'Medium'
      ? 'forest'
      : 'slate';
  return (
    <StatusLabel
      label={priority}
      tone={tone}
      icon={priority === 'Urgent' || priority === 'High' ? 'alert' : undefined}
    />
  );
};
