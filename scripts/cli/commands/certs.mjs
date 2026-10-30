import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { info, ok, warn } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest } from '../lib/manifest.mjs';

/** @typedef {{ dir: string, file: string, kind: 'private' | 'public', pair: 'access' | 'refresh' | 'internal' }} CertTarget */

/**
 * Plan de distribution des cles : qui recoit quelle moitie de quelle paire.
 * - access / refresh : privees + publiques pour api-gateway, ms-user prive + refresh.pub
 * - internal : privee pour api-gateway, publique pour api-gateway et toute unite avec `certs`
 * @param {import('../lib/manifest.mjs').Unit[]} units
 * @returns {CertTarget[]}
 */
export function planCertTargets(units) {
  const withCerts = units.filter((unit) => unit.certs === true);
  /** @type {CertTarget[]} */
  const targets = [];
  const has = (/** @type {string} */ name) => withCerts.some((unit) => unit.name === name);
  if (has('api-gateway')) {
    targets.push(
      { dir: 'api-gateway', file: 'access.key', kind: 'private', pair: 'access' },
      { dir: 'api-gateway', file: 'access.pub', kind: 'public', pair: 'access' },
      { dir: 'api-gateway', file: 'refresh.key', kind: 'private', pair: 'refresh' },
      { dir: 'api-gateway', file: 'refresh.pub', kind: 'public', pair: 'refresh' },
      { dir: 'api-gateway', file: 'internal.key', kind: 'private', pair: 'internal' },
    );
  }
  if (has('ms-user')) {
    targets.push(
      { dir: 'ms-user', file: 'access.key', kind: 'private', pair: 'access' },
      { dir: 'ms-user', file: 'refresh.key', kind: 'private', pair: 'refresh' },
      { dir: 'ms-user', file: 'refresh.pub', kind: 'public', pair: 'refresh' },
    );
  }
  for (const unit of withCerts) {
    targets.push({ dir: unit.path, file: 'internal.pub', kind: 'public', pair: 'internal' });
  }
  return targets;
}

function generatePair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
}

/**
 * Genere les paires RSA et les distribue. Sans --force, ne fait rien si les cles existent deja
 * (sinon les paires seraient desynchronisees entre services).
 * @param {{ rootDir?: string, force?: boolean }} [options]
 * @returns {{ generated: boolean, written: string[] }}
 */
export function generateCerts(options = {}) {
  const rootDir = options.rootDir ?? ROOT_DIR;
  const targets = planCertTargets(loadManifest(rootDir).units);
  const sentinel = targets.find((target) => target.file === 'internal.key');
  if (!options.force && sentinel && existsSync(join(rootDir, sentinel.dir, 'certs', sentinel.file))) {
    return { generated: false, written: [] };
  }
  const pairs = { access: generatePair(), refresh: generatePair(), internal: generatePair() };
  const written = [];
  for (const target of targets) {
    const certsDir = join(rootDir, target.dir, 'certs');
    mkdirSync(certsDir, { recursive: true });
    const pair = pairs[target.pair];
    const content = target.kind === 'private' ? pair.privateKey : pair.publicKey;
    writeFileSync(join(certsDir, target.file), content, { mode: target.kind === 'private' ? 0o600 : 0o644 });
    written.push(`${target.dir}/certs/${target.file}`);
  }
  return { generated: true, written };
}

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function certsCommand(args) {
  const force = args.includes('--force');
  const result = generateCerts({ force });
  if (!result.generated) {
    info('certificats deja presents (utiliser --force pour les regenerer)');
    return 0;
  }
  ok(`${result.written.length} fichiers de cles ecrits`);
  warn('Les dossiers certs/ sont ignores par git : ne jamais commiter les cles privees.');
  return 0;
}
