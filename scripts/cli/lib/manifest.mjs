import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

/** Racine du repo meta (scripts/cli/lib -> racine). */
export const ROOT_DIR = dirname(dirname(CLI_DIR));

/**
 * @typedef {{ name: string, role: string, description: string, install?: boolean, build?: boolean }} Repo
 * @typedef {{ name: string, repo: string, path: string, kind: string, order: number, migrations?: boolean, certs?: boolean }} Unit
 * @typedef {{ compose: string, services: string[], optional: string[], init: string[] }} Infra
 * @typedef {{ version: number, org: string, repos: Repo[], units: Unit[], profiles: Record<string, string[]>, envs: Record<string, string>, infra: Infra }} Manifest
 */

/**
 * Valide la structure du manifeste et renvoie la liste des erreurs (vide si valide).
 * @param {Manifest} manifest
 * @returns {string[]}
 */
export function validateManifest(manifest) {
  const errors = [];
  const repoNames = new Set();
  for (const repo of manifest.repos) {
    if (repoNames.has(repo.name)) errors.push(`repo en double: ${repo.name}`);
    repoNames.add(repo.name);
  }
  const unitNames = new Set();
  const orders = new Set();
  for (const unit of manifest.units) {
    if (unitNames.has(unit.name)) errors.push(`unit en double: ${unit.name}`);
    unitNames.add(unit.name);
    if (!repoNames.has(unit.repo)) errors.push(`unit ${unit.name}: repo inconnu ${unit.repo}`);
    if (orders.has(unit.order)) errors.push(`unit ${unit.name}: ordre ${unit.order} deja utilise`);
    orders.add(unit.order);
  }
  const kinds = new Set(manifest.units.map((unit) => unit.kind));
  for (const [profile, profileKinds] of Object.entries(manifest.profiles)) {
    for (const kind of profileKinds) {
      if (!kinds.has(kind)) errors.push(`profil ${profile}: kind inconnu ${kind}`);
    }
  }
  return errors;
}

/**
 * @param {string} [rootDir]
 * @returns {Manifest}
 */
export function loadManifest(rootDir = ROOT_DIR) {
  const manifest = /** @type {Manifest} */ (
    JSON.parse(readFileSync(join(rootDir, 'repos.json'), 'utf8'))
  );
  const errors = validateManifest(manifest);
  if (errors.length > 0) {
    throw new Error(`repos.json invalide:\n  - ${errors.join('\n  - ')}`);
  }
  return manifest;
}

/**
 * @param {Manifest} manifest
 * @param {string} repoName
 * @param {'https' | 'ssh'} [protocol]
 */
export function cloneUrl(manifest, repoName, protocol = 'https') {
  return protocol === 'ssh'
    ? `git@github.com:${manifest.org}/${repoName}.git`
    : `https://github.com/${manifest.org}/${repoName}.git`;
}

/**
 * Unites d'un profil, triees par ordre de demarrage.
 * @param {Manifest} manifest
 * @param {string} profile
 * @returns {Unit[]}
 */
export function unitsForProfile(manifest, profile) {
  const kinds = manifest.profiles[profile];
  if (!kinds) {
    throw new Error(
      `profil inconnu: ${profile} (disponibles: ${Object.keys(manifest.profiles).join(', ')})`,
    );
  }
  return manifest.units.filter((unit) => kinds.includes(unit.kind)).sort((a, b) => a.order - b.order);
}

/**
 * Unites portant des migrations, triees par ordre.
 * @param {Manifest} manifest
 */
export function migratingUnits(manifest) {
  return manifest.units.filter((unit) => unit.migrations === true).sort((a, b) => a.order - b.order);
}

/**
 * Commande yarn de demarrage d'une unite pour un environnement.
 * @param {Manifest} manifest
 * @param {string} env
 */
export function startScript(manifest, env) {
  const script = manifest.envs[env];
  if (!script) {
    throw new Error(`environnement inconnu: ${env} (disponibles: ${Object.keys(manifest.envs).join(', ')})`);
  }
  return script;
}

/**
 * Lignes `/<repo>` attendues dans .gitignore pour les repos clones (hors `.github`, ignore sans slash).
 * @param {Manifest} manifest
 */
export function expectedGitignoreEntries(manifest) {
  return manifest.repos.map((repo) => (repo.name === '.github' ? '.github' : `/${repo.name}`));
}
