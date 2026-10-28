import { join } from 'node:path';

import { fail, info, ok, warn } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest } from '../lib/manifest.mjs';
import { capture, run } from '../lib/proc.mjs';

/**
 * @typedef {{ Service: string, State: string, Health?: string, ExitCode?: number }} ComposeRow
 */

/**
 * Parse la sortie `docker compose ps --format json` (un objet par ligne, ou un tableau).
 * @param {string} output
 * @returns {ComposeRow[]}
 */
export function parseComposePs(output) {
  const trimmed = output.trim();
  if (trimmed === '') return [];
  if (trimmed.startsWith('[')) return /** @type {ComposeRow[]} */ (JSON.parse(trimmed));
  return trimmed.split('\n').map((line) => /** @type {ComposeRow} */ (JSON.parse(line)));
}

/**
 * Renvoie les services pas encore prets : en cours avec health-check non "healthy",
 * ou arretes (un service ponctuel termine avec le code 0 est considere pret).
 * @param {ComposeRow[]} rows
 * @param {string[]} oneShot
 */
export function pendingServices(rows, oneShot) {
  return rows
    .filter((row) => {
      if (oneShot.includes(row.Service)) return row.State !== 'exited' || (row.ExitCode ?? 0) !== 0;
      if (row.State !== 'running') return true;
      return row.Health !== undefined && row.Health !== '' && row.Health !== 'healthy';
    })
    .map((row) => row.Service);
}

function composeArgs() {
  const { infra } = loadManifest();
  return { base: ['compose', '-f', join(ROOT_DIR, infra.compose)], infra };
}

/**
 * Demarre les services facultatifs (ex. ClamAV, sans image arm64) : en emulation amd64 sur
 * les hotes arm64, et un echec n'interrompt pas le setup.
 * @param {string[]} base
 * @param {string[]} optional
 */
async function startOptional(base, optional) {
  if (optional.length === 0) return;
  const env = process.arch === 'arm64' ? { ...process.env, DOCKER_DEFAULT_PLATFORM: 'linux/amd64' } : process.env;
  try {
    await run('docker', [...base, 'up', '-d', ...optional], { env });
  } catch (error) {
    warn(`services facultatifs non demarres (${optional.join(', ')}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Demarre l'infra locale (bases, Redis, MinIO) et attend qu'elle soit saine.
 * @param {{ timeoutMs?: number, pollMs?: number }} [options]
 */
export async function infraUp(options = {}) {
  const { base, infra } = composeArgs();
  if (capture('docker', ['info']).status !== 0) {
    throw new Error('le daemon Docker est inaccessible : demarrer Docker Desktop ou Rancher Desktop');
  }
  info('docker compose up -d (bases, Redis, MinIO, ClamAV)');
  await run('docker', [...base, 'up', '-d', ...infra.services]);

  await startOptional(base, infra.optional);

  const deadline = Date.now() + (options.timeoutMs ?? 180_000);
  const pollMs = options.pollMs ?? 3000;
  let pending = infra.services;
  while (Date.now() < deadline) {
    const rows = parseComposePs(capture('docker', [...base, 'ps', '--all', '--format', 'json']).stdout).filter(
      (row) => infra.services.includes(row.Service),
    );
    const seen = new Set(rows.map((row) => row.Service));
    pending = [...infra.services.filter((name) => !seen.has(name)), ...pendingServices(rows, [])];
    if (pending.length === 0) break;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, pollMs));
  }
  if (pending.length > 0) {
    throw new Error(`services non sains apres attente: ${pending.join(', ')}`);
  }
  ok(`infra saine (${infra.services.length} services)`);

  if (infra.init.length > 0) {
    info(`initialisation: ${infra.init.join(', ')}`);
    await run('docker', [...base, 'up', ...infra.init, '--exit-code-from', infra.init[0] ?? '']);
  }
}

export async function infraDown() {
  const { base } = composeArgs();
  await run('docker', [...base, 'down']);
  ok('infra arretee (volumes conserves)');
}

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function upCommand(args) {
  void args;
  await infraUp();
  return 0;
}

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function downCommand(args) {
  void args;
  await infraDown();
  return 0;
}

/**
 * Vide les donnees des bases locales (volumes inclus).
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function nukeDbCommand(args) {
  if (!args.includes('--yes')) {
    fail('operation destructive : relancer avec --yes pour supprimer les volumes de donnees locaux');
    return 2;
  }
  const { base } = composeArgs();
  await run('docker', [...base, 'down', '--volumes']);
  ok('volumes supprimes : relancer `up` puis `migrate --all`');
  return 0;
}
