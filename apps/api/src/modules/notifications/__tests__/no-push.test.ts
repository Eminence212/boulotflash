/**
 * Étape 19 — aucun éditeur de push dans le graphe (D36, CDC §8.1).
 * Lit les dépendances déclarées et les imports du code source de l’API, du worker, du web et des
 * paquets partagés présents sur le disque, puis le Compose et les fichiers d’environnement s’ils existent.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../../../..');
const WORKSPACES = ['apps/api', 'apps/worker', 'apps/web', 'packages/database', 'packages/contracts'];
const PUSH_PACKAGE = /firebase|web-push|onesignal|expo-notifications|@pusher\/push|node-pushnotifications|apn/i;
const PUSH_SOURCE =
  /from ['"](?:firebase|firebase-admin|web-push)[^'"]*['"]|require\(['"](?:firebase|web-push)|getMessaging\(|Notification\.requestPermission|pushManager\.subscribe/;

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === 'dist' || name === '.next' || name === '__tests__') return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|js|mjs)$/.test(name) ? [path] : [];
  });
}

describe('aucun push au pilote', () => {
  const present = WORKSPACES.filter((w) => existsSync(join(ROOT, w, 'package.json')));

  it('trouve au moins l’API et le paquet database', () => {
    expect(present).toEqual(expect.arrayContaining(['apps/api', 'packages/database']));
  });

  it('aucune dépendance de push déclarée', () => {
    const offenders: string[] = [];
    for (const w of present) {
      const pkg = JSON.parse(readFileSync(join(ROOT, w, 'package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>;
      for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        for (const name of Object.keys(pkg[field] ?? {})) {
          if (PUSH_PACKAGE.test(name)) offenders.push(`${w} : ${name}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('aucun import Firebase ou Web Push, aucune demande de permission navigateur', () => {
    const offenders = present.flatMap((w) =>
      sourceFiles(join(ROOT, w, 'src')).filter((file) => PUSH_SOURCE.test(readFileSync(file, 'utf8'))),
    );
    expect(offenders).toEqual([]);
  });

  it('le schéma n’a ni canal FCM ni table device_tokens', () => {
    const schema = readFileSync(join(ROOT, 'packages/database/prisma/schema.prisma'), 'utf8');
    const channel = schema.match(/enum NotificationChannel \{([^}]*)\}/)?.[1] ?? '';
    expect(channel.split(/\s+/).filter(Boolean)).toEqual(['IN_APP', 'EMAIL']);
    expect(schema).not.toMatch(/@@map\("device_tokens"\)/);
  });

  it('ni le Compose ni les fichiers d’environnement ne déclarent de clé FCM ou Firebase', () => {
    const files = ['docker-compose.yml', '.env.example', '.env.development'].map((f) => join(ROOT, f)).filter(existsSync);
    const offenders = files.filter((f) => /^\s*-?\s*(FCM_|[A-Z_]*FIREBASE)/m.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
