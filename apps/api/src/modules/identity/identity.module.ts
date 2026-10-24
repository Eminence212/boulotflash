import { Module } from '@nestjs/common';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { AccountResolverService } from './account-resolver.service';
import { AdminAuthController } from './admin-auth/admin-auth.controller';
import { AdminAuthGuard } from './admin-auth/admin-auth.guard';
import { AdminAuthService } from './admin-auth/admin-auth.service';
import { AdminCommunesController } from './admin-auth/admin-communes.controller';
import { AdminFinanceController } from './admin-auth/admin-finance.controller';
import { AdminJobsController } from './admin-auth/admin-jobs.controller';
import { AdminJwtService } from './admin-auth/admin-jwt.service';
import { AdminLockoutService } from './admin-auth/admin-lockout.service';
import { AdminMeController } from './admin-auth/admin-me.controller';
import { AdminSettingsController } from './admin-auth/admin-settings.controller';
import { AdminScopeGuard } from './admin-auth/admin-scope.guard';
import { AdminSessionService } from './admin-auth/admin-session.service';
import { AdminUsersController } from './admin-auth/admin-users.controller';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { JwtService } from './jwt.service';
import { MeController } from './me.controller';
import { OauthRateLimitService } from './oauth-rate-limit.service';
import { OauthTokenVerifierService } from './oauth-token-verifier.service';
import { PhoneRequiredGuard } from './phone-required.guard';
import { ProfileService } from './profile.service';
import { SessionService } from './session.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  imports: [RedisCacheModule],
  controllers: [
    AuthController,
    MeController,
    AdminAuthController,
    AdminMeController,
    AdminUsersController,
    AdminJobsController,
    AdminFinanceController,
    AdminCommunesController,
    AdminSettingsController,
  ],
  providers: [
    JwtService,
    ProfileService,
    SessionService,
    OauthRateLimitService,
    TokenBlacklistService,
    OauthTokenVerifierService,
    AccountResolverService,
    AuthGuard,
    PhoneRequiredGuard,
    AdminJwtService,
    AdminSessionService,
    AdminLockoutService,
    AdminAuthService,
    AdminAuthGuard,
    AdminScopeGuard,
  ],
  exports: [
    JwtService,
    SessionService,
    ProfileService,
    TokenBlacklistService,
    AuthGuard,
    PhoneRequiredGuard,
    AccountResolverService,
    AdminAuthGuard,
    AdminScopeGuard,
    AdminJwtService,
  ],
})
export class IdentityModule {}
