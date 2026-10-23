import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AvailabilitySlot = 'MORNING' | 'AFTERNOON' | 'EVENING';
type EmployerType = 'INDIVIDUAL' | 'BUSINESS' | 'ARTISAN' | 'ORGANIZATION';

const SLOTS = new Set<AvailabilitySlot>(['MORNING', 'AFTERNOON', 'EVENING']);
const EMPLOYER_TYPES = new Set<EmployerType>([
  'INDIVIDUAL',
  'BUSINESS',
  'ARTISAN',
  'ORGANIZATION',
]);

export type AvailabilityInput = { weekday: number; slot: string };

export type WorkerProfileInput = {
  displayName?: string;
  communeId?: string | null;
  mainCategoryId?: string | null;
  skillCategoryIds?: string[];
  isAvailable?: boolean;
  bio?: string | null;
  availability?: AvailabilityInput[];
};

export type EmployerProfileInput = {
  type?: string;
  displayName?: string;
  contactPerson?: string | null;
  communeId?: string | null;
  presentation?: string | null;
};

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async putWorkerProfile(userId: string, body: WorkerProfileInput) {
    await this.assertNotAdmin(userId);
    const displayName = (body.displayName ?? '').trim();
    if (displayName.length < 2 || displayName.length > 80) {
      throw validation('Le nom doit faire entre 2 et 80 caractères.');
    }

    const communeId = body.communeId?.trim() || null;
    const mainCategoryId = body.mainCategoryId?.trim() || null;

    if (communeId) await this.assertActiveCommune(communeId);
    if (mainCategoryId) await this.assertActiveCategory(mainCategoryId);

    const skillIds = [
      ...new Set(
        (body.skillCategoryIds ?? [])
          .map((id) => id?.trim())
          .filter((id): id is string => !!id),
      ),
    ];
    if (mainCategoryId && !skillIds.includes(mainCategoryId)) {
      skillIds.unshift(mainCategoryId);
    }
    for (const id of skillIds) {
      await this.assertActiveCategory(id);
    }

    const availability = normalizeAvailability(body.availability);

    await this.prisma.client.$transaction(async (tx) => {
      await tx.userRole.upsert({
        where: { userId_role: { userId, role: 'WORKER' } },
        create: { userId, role: 'WORKER' },
        update: {},
      });

      const profile = await tx.workerProfile.upsert({
        where: { userId },
        create: {
          userId,
          displayName,
          communeId,
          mainCategoryId,
          bio: body.bio?.trim() || null,
          isAvailable: body.isAvailable ?? true,
          termsAcceptedAt: new Date(),
        },
        update: {
          displayName,
          communeId,
          mainCategoryId,
          bio: body.bio === undefined ? undefined : body.bio?.trim() || null,
          isAvailable:
            body.isAvailable === undefined ? undefined : body.isAvailable,
        },
      });

      const slots =
        body.availability === undefined
          ? await tx.workerAvailability.count({
              where: { workerProfileId: profile.id },
            })
          : availability.length;
      const profileReady = Boolean(
        displayName && communeId && mainCategoryId && slots > 0,
      );
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          displayName,
          activeMode: 'WORKER',
          status:
            profileReady &&
            current?.status !== 'SUSPENDED' &&
            current?.status !== 'CLOSED'
              ? 'ACTIVE'
              : undefined,
        },
      });

      await tx.workerSkill.deleteMany({
        where: { workerProfileId: profile.id },
      });
      if (skillIds.length > 0) {
        await tx.workerSkill.createMany({
          data: skillIds.map((categoryId) => ({
            workerProfileId: profile.id,
            categoryId,
          })),
        });
      }

      if (body.availability !== undefined) {
        await tx.workerAvailability.deleteMany({
          where: { workerProfileId: profile.id },
        });
        if (availability.length > 0) {
          await tx.workerAvailability.createMany({
            data: availability.map((row) => ({
              workerProfileId: profile.id,
              weekday: row.weekday,
              slot: row.slot,
            })),
          });
        }
      }
    });

    return this.getWorkerProfileView(userId);
  }

  async putWorkerAvailability(
    userId: string,
    body: { isAvailable?: boolean; availability?: AvailabilityInput[] },
  ) {
    await this.assertNotAdmin(userId);
    const profile = await this.prisma.client.workerProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'Créez d’abord votre profil candidat.',
        },
        400,
      );
    }

    const availability = normalizeAvailability(body.availability);

    await this.prisma.client.$transaction(async (tx) => {
      if (body.isAvailable !== undefined) {
        await tx.workerProfile.update({
          where: { id: profile.id },
          data: { isAvailable: body.isAvailable },
        });
      }
      if (body.availability !== undefined) {
        await tx.workerAvailability.deleteMany({
          where: { workerProfileId: profile.id },
        });
        if (availability.length > 0) {
          await tx.workerAvailability.createMany({
            data: availability.map((row) => ({
              workerProfileId: profile.id,
              weekday: row.weekday,
              slot: row.slot,
            })),
          });
        }
      }
    });

    return this.getWorkerProfileView(userId);
  }

  async createEmployerProfile(userId: string, body: EmployerProfileInput) {
    await this.assertNotAdmin(userId);
    await this.assertHasPhone(userId);

    const displayName = (body.displayName ?? '').trim();
    if (displayName.length < 2 || displayName.length > 80) {
      throw validation('Le nom doit faire entre 2 et 80 caractères.');
    }
    const typeRaw = (body.type ?? 'INDIVIDUAL').trim().toUpperCase();
    if (!EMPLOYER_TYPES.has(typeRaw as EmployerType)) {
      throw validation('Type recruteur invalide.');
    }
    const type = typeRaw as EmployerType;
    const communeId = body.communeId?.trim() || null;
    if (communeId) await this.assertActiveCommune(communeId);

    const contactPerson = body.contactPerson?.trim() || null;

    const result = await this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.employerProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              subscription: true,
            },
          },
        },
      });

      if (existing) {
        const sub =
          existing.user.subscription ??
          (await tx.subscription.findUnique({ where: { employerId: userId } }));
        return {
          created: false as const,
          profileId: existing.id,
          subscriptionId: sub?.id ?? null,
          subscriptionStatus: sub?.status ?? null,
          endsAt: sub?.endsAt ?? null,
        };
      }

      await tx.userRole.upsert({
        where: { userId_role: { userId, role: 'EMPLOYER' } },
        create: { userId, role: 'EMPLOYER' },
        update: {},
      });

      const profile = await tx.employerProfile.create({
        data: {
          userId,
          type,
          displayName,
          contactPerson,
          communeId,
          presentation: body.presentation?.trim() || null,
          phoneConfirmed: true,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          employerId: userId,
          status: 'ACTIVE',
          endsAt: null,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          displayName: displayName,
          activeMode: 'EMPLOYER',
          status: 'ACTIVE',
        },
      });

      return {
        created: true as const,
        profileId: profile.id,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        endsAt: subscription.endsAt,
      };
    });

    const status = result.subscriptionStatus;
    return {
      ok: true as const,
      created: result.created,
      employerProfile: await this.getEmployerProfileView(userId),
      subscription: {
        status,
        endsAt: result.endsAt,
        label:
          status === 'ACTIVE'
            ? 'Services gratuits'
            : status === 'EXPIRED'
              ? 'Abonnement expiré'
              : 'Abonnement suspendu',
      },
    };
  }

  async putEmployerProfile(userId: string, body: EmployerProfileInput) {
    await this.assertNotAdmin(userId);
    const existing = await this.prisma.client.employerProfile.findUnique({
      where: { userId },
    });
    if (!existing) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message: 'Créez d’abord votre profil recruteur.',
        },
        400,
      );
    }

    const data: {
      displayName?: string;
      type?: EmployerType;
      contactPerson?: string | null;
      communeId?: string | null;
      presentation?: string | null;
    } = {};

    if (body.displayName !== undefined) {
      const name = body.displayName.trim();
      if (name.length < 2 || name.length > 80) {
        throw validation('Le nom doit faire entre 2 et 80 caractères.');
      }
      data.displayName = name;
    }
    if (body.type !== undefined) {
      const typeRaw = body.type.trim().toUpperCase();
      if (!EMPLOYER_TYPES.has(typeRaw as EmployerType)) {
        throw validation('Type recruteur invalide.');
      }
      data.type = typeRaw as EmployerType;
    }
    if (body.contactPerson !== undefined) {
      data.contactPerson = body.contactPerson?.trim() || null;
    }
    if (body.communeId !== undefined) {
      const communeId = body.communeId?.trim() || null;
      if (communeId) await this.assertActiveCommune(communeId);
      data.communeId = communeId;
    }
    if (body.presentation !== undefined) {
      data.presentation = body.presentation?.trim() || null;
    }

    await this.prisma.client.employerProfile.update({
      where: { userId },
      data,
    });
    if (data.displayName) {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { displayName: data.displayName },
      });
    }

    return this.getEmployerProfileView(userId);
  }

  async setMode(userId: string, modeRaw: string | undefined) {
    await this.assertNotAdmin(userId);
    const mode = (modeRaw ?? '').trim().toUpperCase();
    if (mode !== 'WORKER' && mode !== 'EMPLOYER') {
      throw validation('mode requis : WORKER ou EMPLOYER.');
    }

    const [worker, employer] = await Promise.all([
      this.prisma.client.workerProfile.findUnique({ where: { userId } }),
      this.prisma.client.employerProfile.findUnique({ where: { userId } }),
    ]);
    if (!worker || !employer) {
      throw new HttpException(
        {
          code: 'VALIDATION',
          message:
            'Le basculement de mode exige un profil candidat et un profil recruteur.',
        },
        400,
      );
    }

    await this.prisma.client.user.update({
      where: { id: userId },
      data: { activeMode: mode },
    });
    return { ok: true as const, activeMode: mode };
  }

  async getWorkerProfileView(userId: string) {
    const profile = await this.prisma.client.workerProfile.findUnique({
      where: { userId },
      include: {
        commune: { select: { id: true, name: true } },
        mainCategory: { select: { id: true, name: true, slug: true } },
        skills: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        availability: {
          select: { weekday: true, slot: true },
          orderBy: [{ weekday: 'asc' }, { slot: 'asc' }],
        },
      },
    });
    return profile;
  }

  async getEmployerProfileView(userId: string) {
    return this.prisma.client.employerProfile.findUnique({
      where: { userId },
      include: {
        commune: { select: { id: true, name: true } },
      },
    });
  }

  workerCompleteness(profile: {
    displayName: string | null;
    communeId: string | null;
    mainCategoryId: string | null;
    availability: { weekday: number; slot: string }[];
  } | null): {
    complete: boolean;
    gaps: string[];
    flags: {
      displayName: boolean;
      commune: boolean;
      category: boolean;
      availability: boolean;
    };
  } {
    if (!profile) {
      return {
        complete: false,
        gaps: [
          'Profil candidat à créer',
          'Commune',
          'Compétence principale',
          'Disponibilités',
        ],
        flags: {
          displayName: true,
          commune: true,
          category: true,
          availability: true,
        },
      };
    }
    const flags = {
      displayName: !profile.displayName || profile.displayName.trim().length < 2,
      commune: !profile.communeId,
      category: !profile.mainCategoryId,
      availability: profile.availability.length === 0,
    };
    const gaps: string[] = [];
    if (flags.displayName) gaps.push('Nom d’affichage');
    if (flags.commune) gaps.push('Commune');
    if (flags.category) gaps.push('Compétence principale');
    if (flags.availability) gaps.push('Disponibilités');
    return {
      complete: gaps.length === 0,
      gaps,
      flags,
    };
  }

  private async assertNotAdmin(userId: string): Promise<void> {
    const admin = await this.prisma.client.userRole.findFirst({
      where: { userId, role: 'ADMIN' },
    });
    if (admin) {
      throw new HttpException(
        {
          code: 'FORBIDDEN',
          message: 'Les comptes internes n’utilisent pas les profils publics.',
        },
        403,
      );
    }
  }

  private async assertHasPhone(userId: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (!user?.phone) {
      throw new HttpException(
        {
          code: 'PHONE_REQUIRED',
          message:
            'Un numéro de téléphone est requis avant de créer un profil recruteur.',
        },
        403,
      );
    }
  }

  private async assertActiveCommune(id: string): Promise<void> {
    const commune = await this.prisma.client.commune.findFirst({
      where: { id, isActive: true },
    });
    if (!commune) {
      throw validation('Commune inactive ou inconnue.');
    }
  }

  private async assertActiveCategory(id: string): Promise<void> {
    const category = await this.prisma.client.category.findFirst({
      where: { id, isActive: true },
    });
    if (!category) {
      throw validation('Catégorie inactive ou inconnue.');
    }
  }
}

function normalizeAvailability(
  rows: AvailabilityInput[] | undefined,
): { weekday: number; slot: AvailabilitySlot }[] {
  if (!rows) return [];
  const out: { weekday: number; slot: AvailabilitySlot }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const weekday = Number(row.weekday);
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      throw validation('weekday doit être un entier de 1 (lundi) à 7 (dimanche).');
    }
    const slot = String(row.slot ?? '')
      .trim()
      .toUpperCase() as AvailabilitySlot;
    if (!SLOTS.has(slot)) {
      throw validation('slot invalide (MORNING|AFTERNOON|EVENING).');
    }
    const key = `${weekday}:${slot}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ weekday, slot });
  }
  return out;
}

function validation(message: string): never {
  throw new HttpException({ code: 'VALIDATION', message }, 400);
}
