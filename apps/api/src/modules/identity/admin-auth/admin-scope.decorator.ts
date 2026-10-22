import { SetMetadata } from '@nestjs/common';
import type { AdminScopeClaim } from './admin-jwt.service';

export const ADMIN_SCOPES_KEY = 'adminScopes';

/** Scopes autorisés sur la route. SUPER est toujours inclus implicitement. */
export const RequireAdminScopes = (...scopes: AdminScopeClaim[]) =>
  SetMetadata(ADMIN_SCOPES_KEY, scopes);
