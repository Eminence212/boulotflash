/**
 * Feedback UI :
 * - AppAlert → Mantine Alert (attirer l’attention, messages inline)
 * - Notifications dynamiques → @mantine/notifications (hors scope ici)
 * - AppButton → loader dots réutilisable
 * - GlobalLoader → overlay plein écran
 */
export { AppAlert, type AppAlertProps, type AppAlertTone } from './AppAlert';
export { AppButton, type AppButtonProps } from './AppButton';
export { GlobalLoader } from './GlobalLoader';
export { LoadingProvider, useLoading } from './LoadingProvider';
