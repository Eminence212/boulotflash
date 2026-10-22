import {
  createPrismaClient,
  seedReferentiel,
  CITY_NAME,
  COMMUNE_NAMES,
  CATEGORIES,
  DEMO_ACTIVE_COMMUNES,
} from '../index';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('seed référentiel (étape 06)', () => {
  const prisma = createPrismaClient(databaseUrl);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('est idempotent : 1 Kinshasa, 24 communes, 26 catégories après deux passes', async () => {
    await seedReferentiel(prisma, { activateDemoCommunes: false });
    await seedReferentiel(prisma, { activateDemoCommunes: false });

    const cities = await prisma.city.findMany({ where: { name: CITY_NAME } });
    expect(cities).toHaveLength(1);

    const communes = await prisma.commune.findMany({
      where: { cityId: cities[0].id },
    });
    expect(communes).toHaveLength(COMMUNE_NAMES.length);
    expect(communes.every((c) => !c.isActive)).toBe(true);
    expect(communes.every((c) => c.latitude == null && c.longitude == null)).toBe(
      true,
    );

    const categories = await prisma.category.findMany();
    expect(categories).toHaveLength(CATEGORIES.length);

    const settings = await prisma.platformSetting.findUnique({ where: { id: 1 } });
    expect(settings?.servicesPayants).toBe(false);

    const activePrices = await prisma.commercialPrice.count({
      where: { active: true },
    });
    expect(activePrices).toBe(0);
  });

  it('filtre active : 0 commune active sans drapeau ; 3 avec SEED_ACTIVATE_DEMO_COMMUNES', async () => {
    await seedReferentiel(prisma, { activateDemoCommunes: false });
    const inactive = await prisma.commune.findMany({ where: { isActive: true } });
    expect(inactive).toHaveLength(0);

    await seedReferentiel(prisma, { activateDemoCommunes: true });
    const active = await prisma.commune.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    expect(active.map((c) => c.name).sort()).toEqual(
      [...DEMO_ACTIVE_COMMUNES].sort(),
    );
    expect(active).toHaveLength(3);

    // Remettre inactives pour ne pas polluer la suite / Compose
    await seedReferentiel(prisma, { activateDemoCommunes: false });
    await prisma.commune.updateMany({ data: { isActive: false } });
  });

  it('marque les sensibilités CDC (électricité, garde, vente, ménage)', async () => {
    await seedReferentiel(prisma);

    const elec = await prisma.category.findFirst({ where: { name: 'Électricité' } });
    const garde = await prisma.category.findFirst({
      where: { name: "Garde d'enfants" },
    });
    const vente = await prisma.category.findFirst({
      where: { name: 'Vente, promotion et distribution' },
    });
    const menage = await prisma.category.findFirst({
      where: { name: 'Ménage et nettoyage' },
    });
    const lessive = await prisma.category.findFirst({
      where: { name: 'Lessive, repassage et cuisine domestique' },
    });

    expect(elec?.isSensitive).toBe(true);
    expect(garde?.isSensitive).toBe(true);
    expect(vente?.isSensitive).toBe(false);
    expect(menage?.sensitiveIfHome).toBe(true);
    expect(lessive?.sensitiveIfHome).toBe(true);
  });
});
