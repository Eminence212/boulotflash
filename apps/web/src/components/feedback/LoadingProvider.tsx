'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
      <NavigationLoader showLoader={showLoader} hideLoader={hideLoader} />
      {visible ? <GlobalLoader fullscreen message={message} /> : null}
    </LoadingContext.Provider>
  );
}

const MIN_VISIBLE_MS = 350;

/** Overlay dès qu’une navigation interne démarre, jusqu’à l’arrivée sur la page. */
function NavigationLoader({
  showLoader,
  hideLoader,
}: {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}) {
  const generation = useRef(0);
  const expected = useRef<string | null>(null);
  const shownAt = useRef(0);

  const begin = useCallback(
    (target: string | null) => {
      generation.current += 1;
      expected.current = target;
      shownAt.current = Date.now();
      showLoader();
      return generation.current;
    },
    [showLoader],
  );

  const scheduleHide = useCallback(
    (gen: number) => {
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
      window.setTimeout(() => {
        if (generation.current !== gen) return;
        expected.current = null;
        hideLoader();
      }, wait);
    },
    [hideLoader],
  );

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const next = `${url.pathname}${url.search}`;
      if (next === `${window.location.pathname}${window.location.search}`) return;
      begin(next);
    }

    function onPopState() {
      const gen = begin(null);
      scheduleHide(gen);
    }

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [begin, scheduleHide]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const target = expected.current;
      if (!target) return;
      const current = `${window.location.pathname}${window.location.search}`;
      if (current === target) {
        scheduleHide(generation.current);
        expected.current = null;
        return;
      }
      if (Date.now() - shownAt.current > 8000) {
        scheduleHide(generation.current);
        expected.current = null;
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [scheduleHide]);

  return null;
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading doit être utilisé dans LoadingProvider.');
  }
  return ctx;
}
