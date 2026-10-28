import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { fail, info, ok, step, warn } from '../lib/log.mjs';
import { ROOT_DIR, cloneUrl, loadManifest, migratingUnits } from '../lib/manifest.mjs';
import { capture, hasCommand, run } from '../lib/proc.mjs';
import { generateCerts } from './certs.mjs';
import { doctorCommand } from './doctor.mjs';
import { infraUp } from './infra.mjs';
import { migrateCommand } from './migrate.mjs';

/**
 * @typedef {{ ssh: boolean, skipInfra: boolean, skipMigrations: boolean, buildPackages: boolean, apps: boolean, shell: boolean }} SetupFlags
 */

/**
 * Les etapes facultatives et interactives (applications, shell) n'existent qu'en terminal sans --yes.
 * @param {string[]} args
 * @param {boolean} [interactive]
 * @returns {SetupFlags}
 */
export function parseSetupFlags(args, interactive = process.stdin.isTTY === true && !args.includes('--yes')) {
  return {
    ssh: args.includes('--ssh'),
    skipInfra: args.includes('--skip-infra'),
    skipMigrations: args.includes('--skip-migrations'),
    buildPackages: args.includes('--build-packages'),
    apps: interactive && !args.includes('--no-apps'),
    shell: interactive && !args.includes('--no-shell'),
  };
}

/**
 * Noms des etapes dans l'ordre, selon les drapeaux.
 * @param {SetupFlags} flags
 */
export function planSetupSteps(flags) {
  /** @type {string[]} */
  const steps = [];
  if (flags.apps) steps.push('apps');
  if (flags.shell) steps.push('shell');
  steps.push('prerequis', 'clone', 'dependances');
  if (flags.buildPackages) steps.push('build-packages');
  steps.push('certificats');
  if (!flags.skipInfra) steps.push('infra');
  if (!flags.skipInfra && !flags.skipMigrations) steps.push('migrations');
  steps.push('verification');
  return steps;
}

/** @param {string} script */
async function stepOptionalScript(script) {
  const path = join(ROOT_DIR, 'scripts', script);
  if (!hasCommand('bash') || process.platform === 'win32') {
    warn(`${script} ignore (bash indisponible) : voir SETUP.md pour l'installation manuelle`);
    return;
  }
  await run('bash', [path], { cwd: ROOT_DIR });
}

async function stepPrerequisites() {
  const code = await doctorCommand();
  if (code !== 0) throw new Error('prerequis manquants (voir ci-dessus et SETUP.md)');
}

/** @param {SetupFlags} flags */
async function stepClone(flags) {
  const manifest = loadManifest();
  if (!flags.ssh && capture('gh', ['auth', 'status']).status === 0) {
    await run('gh', ['auth', 'setup-git']);
  }
  for (const repo of manifest.repos) {
    if (existsSync(join(ROOT_DIR, repo.name, '.git'))) {
      ok(`${repo.name} deja clone`);
      continue;
    }
    info(`clone de ${repo.name}`);
    await run('git', ['clone', cloneUrl(manifest, repo.name, flags.ssh ? 'ssh' : 'https'), repo.name], { cwd: ROOT_DIR });
  }
  if (hasCommand('bash') && existsSync(join(ROOT_DIR, 'scripts', 'install-skill-hooks.sh'))) {
    await run('bash', [join(ROOT_DIR, 'scripts', 'install-skill-hooks.sh')], { cwd: ROOT_DIR });
  } else {
    warn('hooks de skills non installes (bash absent) : voir SETUP.md');
  }
}

/** @param {SetupFlags} flags */
async function stepDependencies() {
  const manifest = loadManifest();
  const targets = [{ name: 'meta', dir: ROOT_DIR }, ...manifest.repos.filter((repo) => repo.install === true).map((repo) => ({ name: repo.name, dir: join(ROOT_DIR, repo.name) }))];
  for (const target of targets) {
    // Toujours lancer yarn install : un node_modules present peut etre incomplet ou perime
    // (la presence du dossier ne prouve rien) ; Yarn Berry est un no-op quand tout est a jour.
    info(`yarn install dans ${target.name}`);
    await run('yarn', ['install'], { cwd: target.dir });
  }
}

async function stepBuildPackages() {
  const manifest = loadManifest();
  for (const repo of manifest.repos.filter((candidate) => candidate.build === true)) {
    info(`yarn build dans ${repo.name}`);
    await run('yarn', ['build'], { cwd: join(ROOT_DIR, repo.name) });
  }
}

function stepCerts() {
  const result = generateCerts();
  if (result.generated) ok(`${result.written.length} fichiers de cles generes`);
  else ok('certificats deja presents');
}

/**
 * Setup complet et idempotent. Chaque etape verifie son etat avant d'agir ;
 * la premiere erreur arrete le processus avec un code non nul.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function setupCommand(args) {
  const flags = parseSetupFlags(args);
  const steps = planSetupSteps(flags);
  const actions = /** @type {Record<string, () => Promise<unknown> | unknown>} */ ({
    apps: () => stepOptionalScript('install_apps.sh'),
    shell: () => stepOptionalScript('install_shell.sh'),
    prerequis: stepPrerequisites,
    clone: () => stepClone(flags),
    dependances: () => stepDependencies(),
    'build-packages': stepBuildPackages,
    certificats: stepCerts,
    infra: () => infraUp(),
    migrations: () => migrateCommand(['--all']).then((code) => {
      if (code !== 0) throw new Error('migrations en echec');
    }),
    verification: async () => {
      const manifest = loadManifest();
      const missing = manifest.repos.filter((repo) => !existsSync(join(ROOT_DIR, repo.name, '.git'))).map((repo) => repo.name);
      if (missing.length > 0) throw new Error(`repos absents apres setup: ${missing.join(', ')}`);
      ok(`${manifest.repos.length} repos presents, ${migratingUnits(manifest).length} services avec migrations`);
    },
  });

  for (const [index, name] of steps.entries()) {
    step(index + 1, steps.length, name);
    try {
      await actions[name]?.();
    } catch (error) {
      fail(`etape ${name}: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }
  ok('setup termine : `yarn meta start` pour demarrer la stack');
  return 0;
}
