import type { PrismaClient } from '@prisma/client';
import {
  CATEGORIES,
  CITY_NAME,
  COMMUNE_NAMES,
  DEMO_ACTIVE_COMMUNES,
  FORBIDDEN_TERMS,
} from './data';

export type SeedReferentielOptions = {
  activateDemoCommunes?: boolean;
};

/**
 * Seed idempotent : ville, 24 communes, 26 catégories, platform_settings, forbidden_terms.
 */
export async function seedReferentiel(
  prisma: PrismaClient,
  options: SeedReferentielOptions = {},
): Promise<void> {
  const city = await prisma.city.upsert({
    where: { name: CITY_NAME },
    create: { name: CITY_NAME, isActive: false },
    update: { isActive: false },
  });

  for (const name of COMMUNE_NAMES) {
    await prisma.commune.upsert({
      where: { cityId_name: { cityId: city.id, name } },
      create: {
        cityId: city.id,
        name,
        isActive: false,
        latitude: null,
        longitude: null,
      },
      update: {
        latitude: null,
        longitude: null,
      },
    });
  }

  if (options.activateDemoCommunes) {
    await prisma.commune.updateMany({
      where: { cityId: city.id, name: { in: [...DEMO_ACTIVE_COMMUNES] } },
      data: { isActive: true },
    });
    await prisma.commune.updateMany({
      where: {
        cityId: city.id,
        name: { notIn: [...DEMO_ACTIVE_COMMUNES] },
      },
      data: { isActive: false },
    });
  }

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: cat.name,
        family: cat.family,
        isSensitive: cat.isSensitive,
        sensitiveIfHome: cat.sensitiveIfHome,
        isActive: true,
        sortOrder: cat.sortOrder,
      },
      update: {
        name: cat.name,
        family: cat.family,
        isSensitive: cat.isSensitive,
        sensitiveIfHome: cat.sensitiveIfHome,
        isActive: true,
        sortOrder: cat.sortOrder,
      },
    });
  }

  await prisma.platformSetting.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      servicesPayants: false,
      disputeWindowHours: 48,
      reminderHoursBefore: 3,
      proposalMinHours: 2,
      applicationsPerRollingDay: 5,
    },
    update: {
      servicesPayants: false,
      disputeWindowHours: 48,
      reminderHoursBefore: 3,
      proposalMinHours: 2,
      applicationsPerRollingDay: 5,
    },
  });

  for (const term of FORBIDDEN_TERMS) {
    await prisma.forbiddenTerm.upsert({
      where: { term },
      create: { term },
      update: {},
    });
  }
}
