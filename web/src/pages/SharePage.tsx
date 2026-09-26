import React from 'react';
import { useParams } from 'react-router-dom';
import { useShareData } from '../hooks/useShareData';
import { DevParcelHeader } from '../components/DevParcelHeader';
import { HeroProjectInfo } from '../components/HeroProjectInfo';
import { HeroDownloadVisual } from '../components/HeroDownloadVisual';
import { DevParcelPromo } from '../components/DevParcelPromo';
import { ShareStatusCard, ShareStatusKind } from '../components/ShareStatusCard';
import { ProductFeatures } from '../components/ProductFeatures';
import { AvailabilitySection } from '../components/AvailabilitySection';
import { QuoteSection } from '../components/QuoteSection';
import { DeveloperCard } from '../components/DeveloperCard';
import { DevParcelFooter } from '../components/DevParcelFooter';
import { SkeletonView } from '../components/StatusViews';
import { PasswordProtectedView } from '../components/PasswordProtectedView';

export const SharePage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();

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

  const isValidActiveShare = status === 'ready' && Boolean(share);

  return (
    <div className="app-shell min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden">
      {/* Decorative ambient background glows (pointer-events: none) */}
      <div
        className="ambient-glow fixed -top-24 left-1/4 w-[32rem] h-[32rem] bg-gradient-to-br from-blue-100/60 to-indigo-100/40 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="ambient-glow fixed top-1/3 -right-24 w-[28rem] h-[28rem] bg-gradient-to-bl from-purple-100/50 to-blue-50/30 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="ambient-glow fixed bottom-1/4 left-10 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />

      <DevParcelHeader />

      <main
        className="app-main flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
        id="main-content"
      >
        {/* Loading skeleton while fetching metadata */}
        {status === 'loading' && <SkeletonView />}

        {/* Password prompt if protected */}
        {status === 'password_required' && (
          <PasswordProtectedView
            projectName={share?.projectName}
            isVerifying={isVerifyingPassword}
            errorMessage={passwordError}
            onSubmitPassword={verifyPassword}
          />
        )}

        {/* Valid Active Share: 3-column Layout + Redesigned sections matching screenshots 2-5 */}
        {isValidActiveShare && share && (
          <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 py-4 sm:py-6">
            {/* Top Row: Horizontal 2-Column Pair (Project Ready & Direct Download) */}
            <section
              className="hero-section w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch"
              aria-label="DevParcel Project Download"
            >
              <HeroProjectInfo share={share} />
              <HeroDownloadVisual
                downloadState={downloadState}
                downloadError={downloadError}
                onDownload={startDownload}
                onRetryDownload={resetDownloadError}
              />
            </section>

            {/* Below Top Row: Built for Developers vertical design div */}
            <section className="w-full max-w-6xl mx-auto" aria-label="DevParcel Editor Extension">
              <DevParcelPromo />
            </section>
            <ProductFeatures />
            <AvailabilitySection />
            <QuoteSection />
            <DeveloperCard />
          </div>
        )}

        {/* Share Route with Invalid, Expired, Revoked, Not Found, or Error Status */}
        {!isValidActiveShare &&
          status !== 'loading' &&
          status !== 'password_required' && (
            <div className="w-full max-w-2xl mx-auto py-8 sm:py-12">
              <ShareStatusCard
                status={status as ShareStatusKind}
                message={errorMessage}
                onRetry={fetchMetadata}
              />
            </div>
          )}
      </main>

      <DevParcelFooter />
    </div>
  );
};

export default SharePage;
