import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { fail, info, ok } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest, migratingUnits } from '../lib/manifest.mjs';
import { run } from '../lib/proc.mjs';

/**
 * Selectionne les unites a migrer. `--all` ou aucun filtre : toutes celles qui ont des migrations.
 * `--services user,ms-post` accepte les noms avec ou sans prefixe `ms-`.
 * @param {import('../lib/manifest.mjs').Unit[]} available
 * @param {string[]} args
 */
export function selectMigrationUnits(available, args) {
  const index = args.indexOf('--services');
  if (index === -1 || args.includes('--all')) return available;
  const requested = (args[index + 1] ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
  if (requested.length === 0) throw new Error('--services demande au moins un nom');
  return requested.map((name) => {
    const unit = available.find((candidate) => candidate.name === name || candidate.name === `ms-${name}`);
    if (!unit) {
      throw new Error(`service sans migrations ou inconnu: ${name} (disponibles: ${available.map((u) => u.name).join(', ')})`);
    }
    return unit;
  });
}

/**
 * Lance `yarn migration:run:<env>` dans chaque unite, s'arrete a la premiere erreur.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function migrateCommand(args) {
  const manifest = loadManifest();
  const envIndex = args.indexOf('--env');
  const env = envIndex === -1 ? 'local' : (args[envIndex + 1] ?? 'local');
  if (!(env in manifest.envs)) {
    fail(`environnement inconnu: ${env}`);
    return 2;
  }
  const units = selectMigrationUnits(migratingUnits(manifest), args);
  for (const unit of units) {
    const dir = join(ROOT_DIR, unit.path);
    if (!existsSync(dir)) {
      fail(`${unit.name}: dossier absent (lancer setup)`);
      return 1;
    }
    info(`migrations ${unit.name} (${env})`);
    await run('yarn', [`migration:run:${env}`], { cwd: dir });
  }
  ok(`${units.length} service(s) migre(s)`);
  return 0;
}
