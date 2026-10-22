import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthedRequest } from './auth.guard';

/**
 * Bloque candidature / publication tant que users.phone est null (D31).
 */
@Injectable()
export class PhoneRequiredGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const userId = req.userId;
    if (!userId) {
      throw new HttpException(
        { code: 'UNAUTHORIZED', message: 'Session requise.' },
        401,
      );
    }
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user?.phone) {
      throw new HttpException(
        {
          code: 'PHONE_REQUIRED',
          message:
            'Un numéro de téléphone est requis avant de postuler ou publier. Renseignez-le dans votre profil.',
        },
        403,
      );
    }
    return true;
  }
}
