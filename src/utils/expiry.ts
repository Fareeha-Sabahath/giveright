import { ExpiryStatus } from '../types';

export interface ExpiryEvaluation {
  status: ExpiryStatus;
  remainingMs: number;
  hoursRemaining: number;
  countdownLabel: string;
  urgencyScore: number;
  isExpired: boolean;
}

export function evaluateExpiry(
  expiryDateTime?: string,
  nowMs: number = Date.now()
): ExpiryEvaluation {
  if (!expiryDateTime) {
    return {
      status: 'Fresh',
      remainingMs: Number.MAX_SAFE_INTEGER,
      hoursRemaining: 999,
      countdownLabel: 'No expiry set',
      urgencyScore: 0,
      isExpired: false,
    };
  }

  const expiryMs = new Date(expiryDateTime).getTime();
  const remainingMs = expiryMs - nowMs;
  const hoursRemaining = remainingMs / (1000 * 60 * 60);

  if (remainingMs <= 0) {
    const overdueHours = Math.abs(Math.floor(hoursRemaining));
    const overdueMins = Math.abs(Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)));
    return {
      status: 'Expired',
      remainingMs: 0,
      hoursRemaining: 0,
      countdownLabel: `Expired ${overdueHours}h ${overdueMins}m ago`,
      urgencyScore: -1,
      isExpired: true,
    };
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const countdownLabel =
    days > 0
      ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  if (hoursRemaining < 6) {
    return {
      status: 'Critical',
      remainingMs,
      hoursRemaining,
      countdownLabel,
      urgencyScore: 350,
      isExpired: false,
    };
  }
  if (hoursRemaining < 24) {
    return {
      status: 'Urgent',
      remainingMs,
      hoursRemaining,
      countdownLabel,
      urgencyScore: 220,
      isExpired: false,
    };
  }
  if (hoursRemaining < 48) {
    return {
      status: 'Approaching Expiry',
      remainingMs,
      hoursRemaining,
      countdownLabel,
      urgencyScore: 100,
      isExpired: false,
    };
  }
  return {
    status: 'Fresh',
    remainingMs,
    hoursRemaining,
    countdownLabel,
    urgencyScore: 20,
    isExpired: false,
  };
}

export function getExpiryVisualStyle(status: ExpiryStatus): {
  text: string;
  bg: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'Expired':
      return {
        text: 'text-red-800',
        bg: 'bg-red-50',
        border: 'border-red-200',
        dot: 'bg-red-600',
      };
    case 'Critical':
      return {
        text: 'text-rose-800',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        dot: 'bg-rose-600',
      };
    case 'Urgent':
      return {
        text: 'text-amber-800',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'Approaching Expiry':
      return {
        text: 'text-yellow-800',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        dot: 'bg-yellow-500',
      };
    case 'Fresh':
    default:
      return {
        text: 'text-emerald-800',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        dot: 'bg-emerald-600',
      };
  }
}
