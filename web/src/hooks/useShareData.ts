import { useState, useEffect, useCallback, useRef } from 'react';
import { SharePublicMetadata, PageStatus, DownloadState } from '../types/share';
import {
  fetchShareMetadata,
  requestDownloadUrl,
  verifySharePassword,
  ShareApiError,
} from '../services/shareApi';
import { triggerBrowserDownload } from '../utils/download';

export interface UseShareDataReturn {
  status: PageStatus;
  share: SharePublicMetadata | null;
  errorMessage: string | null;
  downloadState: DownloadState;
  downloadError: string | null;
  accessTicket: string | null;
  passwordError: string | null;
  isVerifyingPassword: boolean;
  fetchMetadata: () => Promise<void>;
  verifyPassword: (password: string) => Promise<void>;
  startDownload: () => Promise<void>;
  resetDownloadError: () => void;
}

export function useShareData(token: string | undefined): UseShareDataReturn {
  const [status, setStatus] = useState<PageStatus>('loading');
  const [share, setShare] = useState<SharePublicMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [accessTicket, setAccessTicket] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState<boolean>(false);

  // Track active AbortController across effects to prevent race conditions on token change
  const activeAbortRef = useRef<AbortController | null>(null);

  const fetchMetadata = useCallback(async () => {
    // Abort any ongoing request before starting a new one
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    // IMMEDIATE STATE RESET: Ensure no previous project data is visible while loading
    setShare(null);
    setErrorMessage(null);
    setDownloadError(null);
    setDownloadState('idle');
    setAccessTicket(null);
    setPasswordError(null);
    setIsVerifyingPassword(false);

    if (!token || token.trim().length === 0) {
      setStatus('not_found');
      setErrorMessage('A share token was not provided.');
      return;
    }

    setStatus('loading');

    try {
      const data = await fetchShareMetadata(token.trim(), abortController.signal);

      // If this request was aborted, ignore result
      if (abortController.signal.aborted) {
        return;
      }

      setShare(data);
      if (data.isPasswordProtected) {
        setStatus('password_required');
      } else {
        setStatus('ready');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }

      setShare(null); // Guarantee no stale project data on error

      if (err instanceof ShareApiError) {
        if (err.statusCode === 404) {
          setStatus('not_found');
        } else if (err.statusCode === 410) {
          if (err.message.toLowerCase().includes('revoked')) {
            setStatus('revoked');
          } else {
            setStatus('expired');
          }
        } else if (err.statusCode === 401 || err.statusCode === 403) {
          setStatus('revoked');
        } else {
          setStatus('error');
        }
        setErrorMessage(err.userFriendlyMessage);
      } else {
        setStatus('error');
        setErrorMessage(
          'Unable to connect to DevParcel. Please check your connection and try again.'
        );
      }
    }
  }, [token]);

  useEffect(() => {
    fetchMetadata();
    return () => {
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
    };
  }, [fetchMetadata]);

  // Dynamic SEO Page Title
  useEffect(() => {
    if (status === 'loading') {
      document.title = 'DevParcel — Loading Package...';
    } else if (status === 'password_required') {
      document.title = 'DevParcel — Password Protected';
    } else if (status === 'ready' && share) {
      document.title = `DevParcel — ${share.projectName}`;
    } else if (status === 'expired') {
      document.title = 'DevParcel — Share Unavailable';
    } else if (status === 'revoked') {
      document.title = 'DevParcel — Share Unavailable';
    } else {
      document.title = 'DevParcel — Share Unavailable';
    }
  }, [status, share]);

  const verifyPassword = useCallback(
    async (password: string) => {
      if (!token || isVerifyingPassword) return;

      setIsVerifyingPassword(true);
      setPasswordError(null);

      try {
        const result = await verifySharePassword(token.trim(), password);
        setAccessTicket(result.accessTicket);
        setShare(result.metadata);
        setStatus('ready');
        setPasswordError(null);
      } catch (err: any) {
        if (err instanceof ShareApiError) {
          setPasswordError(err.userFriendlyMessage);
        } else {
          setPasswordError('Incorrect password.');
        }
      } finally {
        setIsVerifyingPassword(false);
      }
    },
    [token, isVerifyingPassword]
  );

  const startDownload = useCallback(async () => {
    if (!token || downloadState === 'preparing') {
      return;
    }

    setDownloadState('preparing');
    setDownloadError(null);

    try {
      const result = await requestDownloadUrl(token.trim(), accessTicket);
      setDownloadState('success');

      // Trigger native browser download using the pre-signed/authorized URL
      triggerBrowserDownload(result.downloadUrl, result.fileName);

      // Revert download button back to idle after a brief feedback period
      setTimeout(() => {
        setDownloadState('idle');
      }, 3500);
    } catch (err) {
      if (err instanceof ShareApiError) {
        if (err.statusCode === 410) {
          setStatus('expired');
          setErrorMessage(err.userFriendlyMessage);
          setDownloadState('idle');
          setShare(null);
          return;
        } else if (err.statusCode === 401 || err.statusCode === 403) {
          setStatus('revoked');
          setErrorMessage(err.userFriendlyMessage);
          setDownloadState('idle');
          setShare(null);
          return;
        }
        setDownloadError(err.userFriendlyMessage);
      } else {
        setDownloadError('Unable to prepare the download. Please try again.');
      }
      setDownloadState('error');
    }
  }, [token, downloadState, accessTicket]);

  const resetDownloadError = useCallback(() => {
    setDownloadError(null);
    setDownloadState('idle');
  }, []);

  return {
    status,
    share,
    errorMessage,
    downloadState,
    downloadError,
    accessTicket,
    passwordError,
    isVerifyingPassword,
    fetchMetadata,
    verifyPassword,
    startDownload,
    resetDownloadError,
  };
}
