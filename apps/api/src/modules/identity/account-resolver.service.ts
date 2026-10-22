import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DomainError } from './domain-error';
import { linkOauthProvider, resolveOauthLogin } from './oauth-account';
import type { VerifiedOauthProfile } from './oauth-types';

@Injectable()
export class AccountResolverService {
  private readonly logger = new Logger(AccountResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveLogin(profile: VerifiedOauthProfile): Promise<{ userId: string }> {
    try {
      return await resolveOauthLogin(this.prisma.client, profile, (msg) =>
        this.logger.log(msg),
      );
    } catch (err) {
      throw toHttp(err);
    }
  }

  async linkProvider(
    userId: string,
    profile: VerifiedOauthProfile,
  ): Promise<void> {
    try {
      await linkOauthProvider(this.prisma.client, userId, profile);
    } catch (err) {
      throw toHttp(err);
    }
  }
}

function toHttp(err: unknown): never {
  if (err instanceof DomainError) {
    throw new HttpException(
      { code: err.code, message: err.message },
      err.httpStatus,
    );
  }
  throw err;
}
