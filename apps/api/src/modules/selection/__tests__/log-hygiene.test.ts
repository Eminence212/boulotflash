/**
 * Étape 17 — aucune adresse ni aucun numéro dans les journaux de l’API.
 * Garde-fou statique : chaque appel de journalisation du code source est relu, et aucun ne doit
 * interpoler une adresse, un numéro ou des coordonnées privées. La vérification à l’exécution se
 * fait en recette, sur `docker logs`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../..');
const LOG_CALL = /(?:logger\.(?:log|warn|error|debug|verbose)|console\.(?:log|warn|error|info|debug))\(([\s\S]*?)\);/g;
const SENSITIVE = /address|phone|latitude|longitude|contact\b|counterpart/i;

/** Ce qui est réellement évalué : interpolations `${…}` et arguments hors chaînes littérales. */
function evaluatedCode(args: string): string {
  const interpolations = [...args.matchAll(/\$\{([^}]*)\}/g)].map((m) => m[1]);
  const outsideLiterals = args.replace(/`[^`]*`|'[^']*'|"[^"]*"/g, '');
  return [...interpolations, outsideLiterals].join(' ');
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

describe('journaux sans coordonnées', () => {
  it('aucun appel de journalisation n’interpole une adresse, un numéro ou un point privé', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      for (const match of readFileSync(file, 'utf8').matchAll(LOG_CALL)) {
        if (SENSITIVE.test(evaluatedCode(match[1]))) offenders.push(`${file.slice(SRC.length + 1)} : ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('le journal d’ouverture admin ne porte que l’identifiant de participation', () => {
    const service = readFileSync(join(SRC, 'modules/selection/participation.service.ts'), 'utf8');
    expect(service).toContain('this.logger.log(`OPEN_CONTACT participation=${participationId}`)');
    expect(service).toMatch(/metadata: \{ participationId \}/);
  });
});
