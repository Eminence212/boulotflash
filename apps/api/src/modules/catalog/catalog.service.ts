import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(activeOnly: boolean) {
    return this.prisma.client.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        family: true,
        isSensitive: true,
        sensitiveIfHome: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  listCommunes(activeOnly: boolean) {
    return this.prisma.client.commune.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        isActive: true,
        cityId: true,
        latitude: true,
        longitude: true,
      },
    });
  }

  listCities(activeOnly: boolean) {
    return this.prisma.client.city.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
  }
}
