'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { GlobalLoader } from './GlobalLoader';

type LoadingContextValue = {
  /** Affiche l’overlay plein écran. */
  showLoader: (message?: string) => void;
  hideLoader: () => void;
  visible: boolean;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('Chargement en cours…');

  const showLoader = useCallback((msg?: string) => {
    if (msg) setMessage(msg);
    setVisible(true);
  }, []);

  const hideLoader = useCallback(() => {
    setVisible(false);
  }, []);

  const value = useMemo(
    () => ({ showLoader, hideLoader, visible }),
    [showLoader, hideLoader, visible],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {visible ? <GlobalLoader fullscreen message={message} /> : null}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading doit être utilisé dans LoadingProvider.');
  }
  return ctx;
}
