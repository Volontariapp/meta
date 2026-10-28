import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { dim, fail, info, warn } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest, startScript, unitsForProfile } from '../lib/manifest.mjs';
import { killTree, spawnGroup } from '../lib/proc.mjs';

/**
 * Vrai si le package.json de l'unite declare le script demande.
 * @param {string} unitDir
 * @param {string} script
 */
export function hasScript(unitDir, script) {
  const file = join(unitDir, 'package.json');
  if (!existsSync(file)) return false;
  const pkg = /** @type {{ scripts?: Record<string, string> }} */ (JSON.parse(readFileSync(file, 'utf8')));
  return pkg.scripts?.[script] !== undefined;
}

/**
 * @param {string[]} args
 * @param {string} flag
 * @param {string} fallback
 */
function option(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

/**
 * Demarre un profil d'unites en parallele, avec sortie prefixee et logs dans logs/<unite>.log.
 * Ctrl+C arrete tout. Les unites sans script pour l'environnement sont ignorees avec un avertissement.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function startCommand(args) {
  const manifest = loadManifest();
  const positional = args.filter((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--env' && args[i - 1] !== '--delay');
  const profile = positional[0] ?? 'backend-core';
  const env = option(args, '--env', 'local');
  const delayMs = Number.parseInt(option(args, '--delay', '3000'), 10);
  const script = startScript(manifest, env);

  const units = unitsForProfile(manifest, profile).filter((unit) => {
    const dir = join(ROOT_DIR, unit.path);
    if (!existsSync(dir)) {
      warn(`${unit.name}: dossier absent, ignore`);
      return false;
    }
    if (!hasScript(dir, script)) {
      warn(`${unit.name}: pas de script ${script}, ignore`);
      return false;
    }
    return true;
  });
  if (units.length === 0) {
    fail(`aucune unite demarrable pour le profil ${profile} en ${env}`);
    return 1;
  }

  const logDir = join(ROOT_DIR, 'logs');
  mkdirSync(logDir, { recursive: true });
  info(`demarrage de ${units.length} unite(s), profil ${profile}, env ${env} (logs: logs/<unite>.log)`);

  const children = units.map((unit) => ({ unit, child: /** @type {import('node:child_process').ChildProcess | null} */ (null) }));
  const stopAll = () => {
    for (const entry of children) if (entry.child) killTree(entry.child);
  };
  process.once('SIGINT', stopAll);
  process.once('SIGTERM', stopAll);

  const exits = children.map(async (entry, position) => {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, position * delayMs));
    const logFile = createWriteStream(join(logDir, `${entry.unit.name}.log`), { flags: 'w' });
    const child = spawnGroup('yarn', [script], { cwd: join(ROOT_DIR, entry.unit.path) });
    entry.child = child;
    const prefix = dim(`[${entry.unit.name}]`);
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (chunk) => {
        logFile.write(chunk);
        for (const line of String(chunk).split('\n')) {
          if (line.trim() !== '') console.log(`${prefix} ${line}`);
        }
      });
    }
    return new Promise((resolvePromise) => {
      child.on('close', (code) => {
        logFile.end();
        resolvePromise(code ?? 0);
      });
    });
  });

  const codes = await Promise.all(exits);
  return codes.some((code) => code !== 0 && code !== 143) ? 1 : 0;
}

/**
 * Affiche les dernieres lignes du log d'une unite.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function logsCommand(args) {
  const name = args[0];
  if (!name) {
    fail('usage: logs <unite> [--lines N]');
    return 2;
  }
  const file = join(ROOT_DIR, 'logs', `${name}.log`);
  if (!existsSync(file)) {
    fail(`aucun log pour ${name} (lancer start d'abord)`);
    return 1;
  }
  const lines = Number.parseInt(option(args, '--lines', '50'), 10);
  console.log(readFileSync(file, 'utf8').split('\n').slice(-lines).join('\n'));
  return 0;
}
