import React from 'react';
import { useCountdown } from '../hooks/useCountdown';

export interface ExpiryBadgeProps {
  expiresAt: string;
}

export const ExpiryBadge: React.FC<ExpiryBadgeProps> = ({ expiresAt }) => {
  const { formatted, isExpired } = useCountdown(expiresAt);

  const isUrgent = formatted.includes('m') && !formatted.includes('d') && !formatted.includes('h');

  const badgeClass = [
    'expiry-indicator',
    isExpired ? 'expiry-expired' : '',
    !isExpired && isUrgent ? 'expiry-urgent' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={badgeClass} aria-label={`Expiration: ${formatted}`} role="timer">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>{formatted}</span>
    </div>
  );
};
