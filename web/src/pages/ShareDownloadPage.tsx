import React from 'react';
import { useParams } from 'react-router-dom';
import { useShareData } from '../hooks/useShareData';
import { Header } from '../components/Header';
import { HeroProjectInfo } from '../components/HeroProjectInfo';
import { HeroDownloadVisual } from '../components/HeroDownloadVisual';
import { DevParcelPromo } from '../components/DevParcelPromo';
import { TrustStrip } from '../components/TrustStrip';
import { QuoteSection } from '../components/QuoteSection';
import { CreatorCard } from '../components/CreatorCard';
import { Footer } from '../components/Footer';
import {
  SkeletonView,
  ExpiredView,
  RevokedView,
  NotFoundView,
  ServerErrorView,
} from '../components/StatusViews';
import { PasswordProtectedView } from '../components/PasswordProtectedView';

export const ShareDownloadPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const {
    status,
    share,
    errorMessage,
    downloadState,
    downloadError,
    passwordError,
    isVerifyingPassword,
    fetchMetadata,
    verifyPassword,
    startDownload,
    resetDownloadError,
  } = useShareData(token);

  return (
    <div className="app-shell">
      {/* Decorative ambient background glows (pointer-events: none) */}
      <div className="ambient-glow ambient-glow--top-left" aria-hidden="true" />
      <div className="ambient-glow ambient-glow--top-right" aria-hidden="true" />
      <div className="ambient-glow ambient-glow--center" aria-hidden="true" />

      <Header />

      <main className="app-main" id="main-content">
        {status === 'loading' && <SkeletonView />}

        {status === 'password_required' && (
          <PasswordProtectedView
            projectName={share?.projectName}
            isVerifying={isVerifyingPassword}
            errorMessage={passwordError}
            onSubmitPassword={verifyPassword}
          />
        )}

        {status === 'ready' && share && (
          <>
            {/* Desktop 3-Column Hero / Priority-Reordered on Mobile */}
            <section className="hero-section" aria-label="DevParcel Project Download">
              <HeroProjectInfo share={share} />

              <HeroDownloadVisual
                downloadState={downloadState}
                downloadError={downloadError}
                onDownload={startDownload}
                onRetryDownload={resetDownloadError}
              />

              <DevParcelPromo />
            </section>

            {/* 4-Column Trust & Benefits Strip */}
            <TrustStrip />

            {/* Brand Quote Philosophy */}
            <QuoteSection />

            {/* Wide Creator Panel */}
            <CreatorCard />
          </>
        )}

        {status === 'expired' && <ExpiredView message={errorMessage} />}

        {status === 'revoked' && <RevokedView message={errorMessage} />}

        {status === 'not_found' && <NotFoundView message={errorMessage} />}

        {status === 'error' && (
          <ServerErrorView
            message={errorMessage}
            onRetry={fetchMetadata}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};
