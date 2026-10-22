import { Module } from '@nestjs/common';
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
import { SessionService } from './session.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  controllers: [
    AuthController,
    MeController,
    AdminAuthController,
    AdminMeController,
    AdminUsersController,
    AdminJobsController,
    AdminFinanceController,
    AdminCommunesController,
  ],
  providers: [
    JwtService,
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
    AuthGuard,
    PhoneRequiredGuard,
    AccountResolverService,
    AdminAuthGuard,
    AdminScopeGuard,
    AdminJwtService,
  ],
})
export class IdentityModule {}
