import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { dim, fail, info, ok, warn } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest, unitsForProfile } from '../lib/manifest.mjs';
import { hasCommand, run } from '../lib/proc.mjs';
import { hasScript } from './start.mjs';

const isWindows = process.platform === 'win32';

/**
 * Dossiers de travail cibles : unites d'un profil dedupliquees par chemin, plus npm-packages si demande.
 * @param {import('../lib/manifest.mjs').Manifest} manifest
 * @param {string} profile
 * @param {boolean} includePackages
 */
export function workTargets(manifest, profile, includePackages) {
  const dirs = unitsForProfile(manifest, profile).map((unit) => unit.path);
  if (includePackages) dirs.unshift('npm-packages');
  return [...new Set(dirs)];
}

/**
 * Lance une commande dans plusieurs dossiers en parallele, sortie prefixee.
 * @param {{ label: string, dir: string }[]} jobs
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<{ label: string, code: number }[]>}
 */
function runParallel(jobs, command, args) {
  return Promise.all(
    jobs.map(
      ({ label, dir }) =>
        new Promise((resolvePromise) => {
          const bin = isWindows && ['yarn', 'npm'].includes(command) ? `${command}.cmd` : command;
          const child = spawn(bin, args, { cwd: dir, env: process.env, shell: false });
          const prefix = dim(`[${label}]`);
          for (const stream of [child.stdout, child.stderr]) {
            stream.on('data', (chunk) => {
              for (const line of String(chunk).split('\n')) if (line.trim() !== '') console.log(`${prefix} ${line}`);
            });
          }
          child.on('error', () => resolvePromise({ label, code: 1 }));
          child.on('close', (code) => resolvePromise({ label, code: code ?? 1 }));
        }),
    ),
  );
}

/** @param {string[]} args @param {string} flag @param {string} fallback */
function option(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

/**
 * `run <script>` : lance `yarn <script>` dans chaque unite qui le declare (build, lint, test...).
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function runAllCommand(args) {
  const script = args.find((arg) => !arg.startsWith('--') && args[args.indexOf(arg) - 1] !== '--profile');
  if (!script) {
    fail('usage: run <script> [--profile all-no-mobile] [--with-packages]');
    return 2;
  }
  const manifest = loadManifest();
  const targets = workTargets(manifest, option(args, '--profile', 'all-no-mobile'), args.includes('--with-packages'))
    .filter((dir) => existsSync(join(ROOT_DIR, dir)) && hasScript(join(ROOT_DIR, dir), script))
    .map((dir) => ({ label: dir, dir: join(ROOT_DIR, dir) }));
  if (targets.length === 0) {
    warn(`aucune unite ne declare le script ${script}`);
    return 1;
  }
  info(`yarn ${script} dans ${targets.length} dossier(s)`);
  const results = await runParallel(targets, 'yarn', [script]);
  const failed = results.filter((result) => result.code !== 0);
  if (failed.length > 0) {
    fail(`echec: ${failed.map((result) => result.label).join(', ')}`);
    return 1;
  }
  ok(`${script} termine sans erreur`);
  return 0;
}

/**
 * `fix-peers` : nettoie puis complete les peerDependencies dans chaque repo applicatif.
 * @returns {Promise<number>}
 */
export async function fixPeersCommand() {
  const manifest = loadManifest();
  const repos = manifest.repos.filter((repo) => repo.install === true && repo.name !== 'npm-packages');
  for (const repo of repos) {
    const dir = join(ROOT_DIR, repo.name);
    if (!existsSync(dir)) continue;
    info(`peers: ${repo.name}`);
    for (const script of ['clean_peers.js', 'fix_peer_deps.js', 'clean_peers.js']) {
      await run('node', [join(ROOT_DIR, 'scripts', script)], { cwd: dir });
    }
  }
  warn('lancer `yarn install` dans chaque repo pour appliquer les changements');
  return 0;
}

/**
 * `audit` : rapport de vulnerabilites en lecture seule (aucune correction automatique).
 * @returns {Promise<number>}
 */
export async function auditCommand() {
  const manifest = loadManifest();
  const jobs = manifest.repos
    .filter((repo) => repo.install === true && existsSync(join(ROOT_DIR, repo.name)))
    .map((repo) => ({ label: repo.name, dir: join(ROOT_DIR, repo.name) }));
  const results = await runParallel(jobs, 'yarn', ['npm', 'audit', '--severity', 'high']);
  const vulnerable = results.filter((result) => result.code !== 0).map((result) => result.label);
  if (vulnerable.length > 0) {
    warn(`vulnerabilites high ou critical dans: ${vulnerable.join(', ')}`);
    return 1;
  }
  ok('aucune vulnerabilite high ou critical');
  return 0;
}

/**
 * `add-package <paquet> --to repo,repo` : ajoute une dependance (ex. @volontariapp/messaging@2.17.1).
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function addPackageCommand(args) {
  const pkg = args.find((arg) => !arg.startsWith('--') && args[args.indexOf(arg) - 1] !== '--to');
  const to = option(args, '--to', '').split(',').filter(Boolean);
  if (!pkg || to.length === 0) {
    fail('usage: add-package <paquet[@version]> --to repo1,repo2');
    return 2;
  }
  const manifest = loadManifest();
  for (const name of to) {
    const repo = manifest.repos.find((candidate) => candidate.name === name && candidate.install === true);
    if (!repo || !existsSync(join(ROOT_DIR, name))) {
      fail(`repo inconnu ou absent: ${name}`);
      return 1;
    }
    info(`yarn add ${pkg} dans ${name}`);
    await run('yarn', ['add', pkg], { cwd: join(ROOT_DIR, name) });
  }
  return 0;
}

const IDE_BINARIES = { cursor: 'cursor', code: 'code', idea: 'idea', antigravity: 'antigravity' };

/**
 * `ide [cursor|code|idea|antigravity] [filtre]` : ouvre un workspace de .workspaces/.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function ideCommand(args) {
  const dir = join(ROOT_DIR, '.workspaces');
  const files = existsSync(dir) ? readdirSync(dir).filter((file) => file.endsWith('.code-workspace')).sort() : [];
  const editor = args.find((arg) => arg in IDE_BINARIES);
  const filter = args.find((arg) => !(arg in IDE_BINARIES));
  if (!editor || !filter) {
    for (const file of files) console.log(file.replace('.code-workspace', ''));
    info('usage: ide <cursor|code|idea|antigravity> <filtre>');
    return editor || filter ? 2 : 0;
  }
  const matches = files.filter((file) => file.toLowerCase().includes(filter.toLowerCase()));
  if (matches.length !== 1) {
    fail(matches.length === 0 ? `aucun workspace pour "${filter}"` : `ambigu: ${matches.join(', ')}`);
    return 1;
  }
  const bin = IDE_BINARIES[/** @type {keyof typeof IDE_BINARIES} */ (editor)];
  if (!hasCommand(bin)) {
    fail(`${bin} introuvable dans le PATH`);
    return 1;
  }
  await run(bin, [join(dir, matches[0] ?? '')]);
  return 0;
}
