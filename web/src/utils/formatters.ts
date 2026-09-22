/**
 * Formats byte values into human-readable strings (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeIndex = Math.min(i, sizes.length - 1);

  const value = bytes / Math.pow(k, safeIndex);
  // Don't show decimal places for bytes
  const formattedDecimals = safeIndex === 0 ? 0 : decimals;
  return `${parseFloat(value.toFixed(formattedDecimals))} ${sizes[safeIndex]}`;
}

/**
 * Formats ISO date strings or Date objects into human-friendly localized dates.
 */
export function formatDate(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Unknown date';
  }
}

/**
 * Formats ISO date string to date only (e.g. 'Sep 22, 2026').
 */
export function formatDateOnly(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Unknown date';
  }
}

export interface TimeRemaining {
  text: string;
  isExpired: boolean;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Calculates human-readable time remaining until expiration.
 */
export function formatTimeRemaining(
  expiresAtInput: string | Date,
  nowMs: number = Date.now()
): TimeRemaining {
  try {
    const expiresAt =
      typeof expiresAtInput === 'string' ? new Date(expiresAtInput) : expiresAtInput;
    const diffMs = expiresAt.getTime() - nowMs;

    if (diffMs <= 0 || isNaN(diffMs)) {
      return {
        text: 'Expired',
        isExpired: true,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let text = '';
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      text = remainingHours > 0 ? `Expires in ${days}d ${remainingHours}h` : `Expires in ${days}d`;
    } else if (hours > 0) {
      text = minutes > 0 ? `Expires in ${hours}h ${minutes}m` : `Expires in ${hours}h`;
    } else if (minutes > 0) {
      text = `Expires in ${minutes}m`;
    } else {
      text = `Expires in ${seconds}s`;
    }

    return {
      text,
      isExpired: false,
      hours,
      minutes,
      seconds,
    };
  } catch {
    return {
      text: 'Expired',
      isExpired: true,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }
}
