import React from 'react';
import { useParams } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { SharePage } from './SharePage';

/**
 * ShareDownloadPage router component.
 * Automatically delegates to LandingPage when accessed on base route '/' (no token),
 * and delegates to SharePage when accessed on '/share/:token'.
 */
export const ShareDownloadPage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();

  if (!token || token.trim().length === 0) {
    return <LandingPage />;
  }

  return <SharePage />;
};

export default ShareDownloadPage;
