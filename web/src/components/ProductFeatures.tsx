import React from 'react';

export const ProductFeatures: React.FC = () => {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-8 sm:my-10" aria-label="DevParcel Key Benefits">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Engineered for frictionless code sharing
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-xl mx-auto">
          Everything you need to deliver clean, secure packages directly from your terminal or editor.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Feature 1 */}
        <div className="flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mb-4 shrink-0 shadow-soft-sm" aria-hidden="true">
            <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">One-click project packaging</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Bundle your code and dependencies instantly from your IDE.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-600 flex items-center justify-center mb-4 shrink-0 shadow-soft-sm" aria-hidden="true">
            <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">Automatically exclude sensitive files</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Shield environment secrets (.env), keys, and node_modules by default.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center mb-4 shrink-0 shadow-soft-sm" aria-hidden="true">
            <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">Secure shareable download links</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Generate high-entropy, encrypted links recipients can open anywhere.
          </p>
        </div>

        {/* Feature 4 */}
        <div className="flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200/60 text-sky-600 flex items-center justify-center mb-4 shrink-0 shadow-soft-sm" aria-hidden="true">
            <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">Configurable link expiry</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Set dynamic expiration windows with automatic server-side cleanup.
          </p>
        </div>

        {/* Feature 5 */}
        <div className="flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center mb-4 shrink-0 shadow-soft-sm" aria-hidden="true">
            <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug" title="Works with VS Code and Antigravity">
            Works with VS Code, Cursor, and Antigravity
          </h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Integrated extensions tailored for traditional and agentic coding workflows.
          </p>
        </div>

        {/* Feature 6 */}
        <div className="flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center mb-4 shrink-0 shadow-soft-sm" aria-hidden="true">
            <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">Built for developers</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Zero recipient signup needed; quick, reliable downloads on any device.
          </p>
        </div>

        {/* Feature 7 */}
        <div className="flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center mb-4 shrink-0 shadow-soft-sm" aria-hidden="true">
            <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">No account required</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Recipients download packages instantly without creating an account or logging in.
          </p>
        </div>

        {/* Feature 8 */}
        <div className="flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-0.5 transition-all">
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center mb-4 shrink-0 shadow-soft-sm" aria-hidden="true">
            <svg className="w-5 h-5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">Open Source</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Transparent, extensible, and built for the global developer ecosystem.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProductFeatures;
