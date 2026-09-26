import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface InstallModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const InstallModalContext = createContext<InstallModalContextType>({
  isOpen: false,
  openModal: () => {},
  closeModal: () => {},
});

export const useInstallModal = (): InstallModalContextType => {
  return useContext(InstallModalContext);
};

export interface InstallModalProviderProps {
  children: React.ReactNode;
}

export const InstallModalProvider: React.FC<InstallModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return (
    <InstallModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
      <InstallEditorModal isOpen={isOpen} onClose={closeModal} />
    </InstallModalContext.Provider>
  );
};

export interface InstallEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallEditorModal: React.FC<InstallEditorModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyId = () => {
    navigator.clipboard?.writeText('mohdarman.devparcel');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 bg-gradient-to-br from-blue-200/40 to-indigo-200/30 rounded-full blur-2xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Close modal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header Block */}
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 shadow-soft-sm">
            ONE-CLICK INSTALL
          </span>
          <h2 id="install-modal-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Install in Your Code Editor
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Click your preferred editor below to directly launch and install the official DevParcel extension.
          </p>
        </div>

        {/* Editor Options List */}
        <div className="mt-6 space-y-3" role="list" aria-label="Editor installation options">
          {/* Option 1: VS Code */}
          <a
            href="vscode:extension/mohdarman.devparcel"
            onClick={onClose}
            className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 hover:border-blue-500 bg-white hover:bg-blue-50/40 shadow-soft-sm hover:shadow-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            role="listitem"
            id="modal-install-vscode"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-soft-sm" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.26a1 1 0 0 0-.005 1.415L3.98 12 .322 15.324a1 1 0 0 0 .005 1.416l1.322 1.201a1 1 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zM18 16.712l-6.832-5.112L18 6.488v10.224z" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors block">
                  Visual Studio Code
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  Launch VS Code extension installer
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-semibold shadow-soft-sm transition-colors shrink-0">
              <span>Install</span>
              <span aria-hidden="true">↗</span>
            </span>
          </a>

          {/* Option 2: Cursor */}
          <a
            href="cursor:extension/mohdarman.devparcel"
            onClick={onClose}
            className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 hover:border-slate-800 bg-white hover:bg-slate-50 shadow-soft-sm hover:shadow-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800"
            role="listitem"
            id="modal-install-cursor"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-300/70 text-slate-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-soft-sm" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 466.73 532.09" fill="currentColor">
                  <path d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.65,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.65-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors block">
                  Cursor
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  Launch Cursor AI extension installer
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 group-hover:bg-slate-800 text-white text-xs font-semibold shadow-soft-sm transition-colors shrink-0">
              <span>Install</span>
              <span aria-hidden="true">↗</span>
            </span>
          </a>

          {/* Option 3: Antigravity */}
          <a
            href="antigravity:extension/mohdarman.devparcel"
            onClick={onClose}
            className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 shadow-soft-sm hover:shadow-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            role="listitem"
            id="modal-install-antigravity"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-soft-sm" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 112 112" fill="currentColor">
                  <path d="M89.754 92.75c4.667 3.5 11.667 1.167 5.25-5.25-19.25-18.667-15.167-70-39.083-70-23.917 0-19.834 51.333-39.084 70-7 7 .584 8.75 5.25 5.25C40.171 80.5 39.004 58.917 55.921 58.917c16.916 0 15.75 21.583 33.833 33.833Z" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors block">
                  Antigravity
                </span>
                <span className="text-xs text-slate-500 font-medium block">
                  Launch Antigravity AI extension installer
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white text-xs font-semibold shadow-soft-sm transition-colors shrink-0">
              <span>Install</span>
              <span aria-hidden="true">↗</span>
            </span>
          </a>
        </div>

        {/* Footer / Extension ID Helper */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px] text-slate-600">ID: mohdarman.devparcel</span>
          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold focus-visible:outline-none"
          >
            {copied ? (
              <span className="text-emerald-600 font-bold">✓ Copied!</span>
            ) : (
              <span>Copy Extension ID</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallEditorModal;
