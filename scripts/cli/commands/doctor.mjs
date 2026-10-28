import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fail, info, ok, warn } from '../lib/log.mjs';
import { ROOT_DIR } from '../lib/manifest.mjs';
import { capture, detectPlatform, hasCommand } from '../lib/proc.mjs';

/**
 * @typedef {{ name: string, required: boolean, check: () => { ok: boolean, detail: string }, hint: string }} Check
 */

/**
 * Compare deux versions semver "x.y.z" : vrai si actual >= required.
 * @param {string} actual
 * @param {string} required
 */
export function versionAtLeast(actual, required) {
  const parse = (/** @type {string} */ value) => value.replace(/^v/, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(actual);
  const r = parse(required);
  for (let i = 0; i < Math.max(a.length, r.length); i += 1) {
    const diff = (a[i] ?? 0) - (r[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
}

/** @param {string} command @param {string[]} args */
function versionOf(command, args) {
  const result = capture(command, args);
  return result.status === 0 ? result.stdout.trim().split('\n')[0] ?? '' : '';
}

function requiredNodeVersion() {
  return readFileSync(join(ROOT_DIR, '.node-version'), 'utf8').trim();
}

/** @returns {Check[]} */
function buildChecks() {
  const requiredNode = requiredNodeVersion();
  return [
    {
      name: `node >= ${requiredNode}`,
      required: true,
      check: () => ({ ok: versionAtLeast(process.version, requiredNode), detail: process.version }),
      hint: 'Installer Node via fnm/nvm ou winget (voir SETUP.md).',
    },
    {
      name: 'yarn 4',
      required: true,
      check: () => {
        const version = versionOf('yarn', ['--version']);
        return { ok: version !== '' && versionAtLeast(version, '4.0.0'), detail: version || 'absent' };
      },
      hint: 'corepack enable puis corepack prepare yarn@4.12.0 --activate.',
    },
    { name: 'git', required: true, check: () => ({ ok: hasCommand('git'), detail: versionOf('git', ['--version']) }), hint: 'Installer git.' },
    {
      name: 'gh (authentifie)',
      required: true,
      check: () => {
        if (!hasCommand('gh')) return { ok: false, detail: 'absent' };
        return { ok: capture('gh', ['auth', 'status']).status === 0, detail: 'gh auth status' };
      },
      hint: 'Installer GitHub CLI puis `gh auth login`.',
    },
    {
      name: 'docker (daemon actif)',
      required: true,
      check: () => {
        if (!hasCommand('docker')) return { ok: false, detail: 'absent' };
        return { ok: capture('docker', ['info']).status === 0, detail: versionOf('docker', ['--version']) };
      },
      hint: 'Installer Docker Desktop ou Rancher Desktop et le demarrer.',
    },
    { name: 'rg (ripgrep)', required: false, check: () => ({ ok: hasCommand('rg'), detail: versionOf('rg', ['--version']) }), hint: 'Recherche de code.' },
    { name: 'jq', required: false, check: () => ({ ok: hasCommand('jq'), detail: versionOf('jq', ['--version']) }), hint: 'Utile aux scripts de CI.' },
    { name: 'mesh-mcp', required: false, check: () => ({ ok: hasCommand('mesh-mcp'), detail: 'binaire causalmesh' }), hint: 'Requis par .mcp.json pour les agents IA.' },
  ];
}

/**
 * @returns {Promise<number>} 0 si tous les prerequis obligatoires sont satisfaits
 */
export async function doctorCommand() {
  info(`plateforme: ${detectPlatform()}`);
  let failures = 0;
  for (const item of buildChecks()) {
    const result = item.check();
    if (result.ok) {
      ok(`${item.name} (${result.detail})`);
    } else if (item.required) {
      failures += 1;
      fail(`${item.name}: ${item.hint}`);
    } else {
      warn(`${item.name} absent (facultatif): ${item.hint}`);
    }
  }
  return failures === 0 ? 0 : 1;
}
