import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { JwtService } from './jwt.service';
import { MeController } from './me.controller';
import { OauthRateLimitService } from './oauth-rate-limit.service';
import { SessionService } from './session.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    JwtService,
    SessionService,
    OauthRateLimitService,
    TokenBlacklistService,
    AuthGuard,
  ],
  exports: [JwtService, SessionService, AuthGuard],
})
export class IdentityModule {}
