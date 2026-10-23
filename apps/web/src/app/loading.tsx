import { GlobalLoader } from '@/components/feedback';

/** Suspense Next : même loader pendant le chargement de chaque segment. */
export default function Loading() {
  return <GlobalLoader fullscreen />;
}
