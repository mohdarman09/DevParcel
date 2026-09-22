import { useState, useEffect } from 'react';
import { formatTimeRemaining } from '../utils/formatters';

export interface CountdownResult {
  formatted: string;
  isExpired: boolean;
}

/**
 * Informational countdown hook for expiration display.
 * The backend remains the source of truth for authorization.
 */
export function useCountdown(expiresAt: string | undefined): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(() => {
    if (!expiresAt) {
      return { formatted: '', isExpired: false };
    }
    const current = formatTimeRemaining(expiresAt);
    return { formatted: current.text, isExpired: current.isExpired };
  });

  useEffect(() => {
    if (!expiresAt) {
      setResult({ formatted: '', isExpired: false });
      return;
    }

    const update = () => {
      const current = formatTimeRemaining(expiresAt);
      setResult({ formatted: current.text, isExpired: current.isExpired });
    };

    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  return result;
}
