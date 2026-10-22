import { Module } from '@nestjs/common';
import { AccountResolverService } from './account-resolver.service';
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
  controllers: [AuthController, MeController],
  providers: [
    JwtService,
    SessionService,
    OauthRateLimitService,
    TokenBlacklistService,
    OauthTokenVerifierService,
    AccountResolverService,
    AuthGuard,
    PhoneRequiredGuard,
  ],
  exports: [
    JwtService,
    SessionService,
    AuthGuard,
    PhoneRequiredGuard,
    AccountResolverService,
  ],
})
export class IdentityModule {}
