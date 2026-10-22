/** Données référentiel — jeux-de-donnees.md / CDC §6–7. Aucune latitude inventée. */

export const CITY_NAME = 'Kinshasa';

export const COMMUNE_NAMES = [
  'Bandalungwa',
  'Barumbu',
  'Bumbu',
  'Gombe',
  'Kalamu',
  'Kasa-Vubu',
  'Kimbanseke',
  'Kinshasa',
  'Kintambo',
  'Kisenso',
  'Lemba',
  'Limete',
  'Lingwala',
  'Makala',
  'Maluku',
  'Masina',
  'Matete',
  'Mont-Ngafula',
  'Ndjili',
  'Ngaba',
  'Ngaliema',
  'Ngiri-Ngiri',
  "N'sele",
  'Selembao',
] as const;

/** Communes activables uniquement avec SEED_ACTIVATE_DEMO_COMMUNES (pas la décision pilote). */
export const DEMO_ACTIVE_COMMUNES = ['Gombe', 'Ngaliema', 'Lemba'] as const;

export type CategorySeed = {
  sortOrder: number;
  family: string;
  name: string;
  slug: string;
  isSensitive: boolean;
  sensitiveIfHome: boolean;
};

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const RAW_CATEGORIES: Array<{
  sortOrder: number;
  family: string;
  name: string;
  sensitive: 'yes' | 'no' | 'home';
}> = [
  { sortOrder: 1, family: 'Maison et personne', name: 'Ménage et nettoyage', sensitive: 'home' },
  {
    sortOrder: 2,
    family: 'Maison et personne',
    name: 'Lessive, repassage et cuisine domestique',
    sensitive: 'home',
  },
  { sortOrder: 3, family: 'Maison et personne', name: "Garde d'enfants", sensitive: 'yes' },
  { sortOrder: 4, family: 'Maison et personne', name: 'Aide aux personnes âgées', sensitive: 'yes' },
  {
    sortOrder: 5,
    family: 'Maison et personne',
    name: 'Coiffure, esthétique et soins non médicaux',
    sensitive: 'no',
  },
  { sortOrder: 6, family: 'Commerce et rue', name: 'Vente, promotion et distribution', sensitive: 'no' },
  { sortOrder: 7, family: 'Commerce et rue', name: 'Caisse, accueil et tenue de boutique', sensitive: 'no' },
  { sortOrder: 8, family: 'Commerce et rue', name: 'Inventaire et rangement', sensitive: 'no' },
  { sortOrder: 9, family: 'Salle et événement', name: 'Service, plonge et cuisine', sensitive: 'no' },
  { sortOrder: 10, family: 'Salle et événement', name: 'Événementiel', sensitive: 'no' },
  { sortOrder: 11, family: 'Déplacement', name: 'Livraison et coursier', sensitive: 'no' },
  { sortOrder: 12, family: 'Déplacement', name: 'Déménagement et chargement', sensitive: 'no' },
  { sortOrder: 13, family: 'Déplacement', name: 'Chauffeur', sensitive: 'no' },
  { sortOrder: 14, family: 'Chantier et technique', name: 'Manœuvre', sensitive: 'no' },
  {
    sortOrder: 15,
    family: 'Chantier et technique',
    name: 'Peinture, bricolage et jardinage',
    sensitive: 'no',
  },
  { sortOrder: 16, family: 'Chantier et technique', name: 'Plomberie', sensitive: 'yes' },
  { sortOrder: 17, family: 'Chantier et technique', name: 'Électricité', sensitive: 'yes' },
  { sortOrder: 18, family: 'Chantier et technique', name: 'Mécanique légère', sensitive: 'no' },
  {
    sortOrder: 19,
    family: 'Bureau et connaissance',
    name: 'Saisie, secrétariat et accueil',
    sensitive: 'no',
  },
  { sortOrder: 20, family: 'Bureau et connaissance', name: 'Cours et aide aux devoirs', sensitive: 'no' },
  {
    sortOrder: 21,
    family: 'Bureau et connaissance',
    name: 'Traduction et interprétation',
    sensitive: 'no',
  },
  { sortOrder: 22, family: 'Bureau et connaissance', name: 'Photo, vidéo et son', sensitive: 'no' },
  { sortOrder: 23, family: 'Terrain', name: 'Enquête et collecte de données', sensitive: 'no' },
  { sortOrder: 24, family: 'Terrain', name: 'Sensibilisation communautaire', sensitive: 'yes' },
  { sortOrder: 25, family: 'Terrain', name: 'Sécurité ponctuelle', sensitive: 'yes' },
  { sortOrder: 26, family: 'Terrain', name: 'Couture et retouche', sensitive: 'no' },
];

export const CATEGORIES: CategorySeed[] = RAW_CATEGORIES.map((c) => ({
  sortOrder: c.sortOrder,
  family: c.family,
  name: c.name,
  slug: slugify(c.name),
  isSensitive: c.sensitive === 'yes',
  sensitiveIfHome: c.sensitive === 'home',
}));

export const FORBIDDEN_TERMS = [
  'versement préalable',
  'acompte',
  'frais de dossier',
  'visa',
  'travail en hauteur',
  'chantier lourd',
  'acte médical',
  'mineur',
] as const;

export const ADMIN_PASSWORD = 'BoulotFlash-Admin-Test-1';
export const TOTP_TEST_SECRET = 'JBSWY3DPEHPK3PXP';
export const RECOVERY_CODE_TEST = 'BF-RECOVERY-TEST-1';
/** Téléphone C-FERME — stocké uniquement en empreinte dans closed_identifiers. */
export const CLOSED_PHONE_C_FERME = '+243810000099';
