import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { bold, dim, fail, green, info, red, yellow } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest } from '../lib/manifest.mjs';
import { capture } from '../lib/proc.mjs';
import { currentBranch, defaultBranch, isClean } from '../lib/git.mjs';

/**
 * @param {string} repoDir
 * @param {boolean} fetch
 */
export function repoState(repoDir, fetch) {
  if (fetch) capture('git', ['fetch', 'origin', '--quiet'], { cwd: repoDir });
  const branch = capture('git', ['branch', '--show-current'], { cwd: repoDir }).stdout.trim() || 'detached';
  const dirty = capture('git', ['status', '--porcelain'], { cwd: repoDir })
    .stdout.split('\n')
    .filter((line) => line !== '').length;
  const upstream = capture('git', ['rev-list', '--left-right', '--count', 'HEAD...@{upstream}'], {
    cwd: repoDir,
  });
  let ahead = 0;
  let behind = 0;
  if (upstream.status === 0) {
    const [a, b] = upstream.stdout.trim().split(/\s+/).map(Number);
    ahead = a ?? 0;
    behind = b ?? 0;
  }
  return { branch, dirty, ahead, behind, hasUpstream: upstream.status === 0 };
}

/** @param {string[]} args */
function listRepos(args) {
  const manifest = loadManifest();
  const protocolFlag = args.includes('--ssh') ? 'ssh' : 'https';
  for (const repo of manifest.repos) {
    const present = existsSync(join(ROOT_DIR, repo.name, '.git'));
    console.log(`${present ? green('present') : yellow('absent ')} ${bold(repo.name.padEnd(24))} ${dim(repo.role.padEnd(13))} ${repo.description}`);
  }
  info(`protocole de clone: ${protocolFlag}`);
  return 0;
}

/** @param {string[]} args */
function statusRepos(args) {
  const manifest = loadManifest();
  const fetch = args.includes('--fetch');
  let missing = 0;
  for (const repo of manifest.repos) {
    const repoDir = join(ROOT_DIR, repo.name);
    if (!existsSync(join(repoDir, '.git'))) {
      missing += 1;
      console.log(`${yellow('absent')} ${repo.name}`);
      continue;
    }
    const state = repoState(repoDir, fetch);
    const tracking = state.hasUpstream ? `+${state.ahead}/-${state.behind}` : 'sans upstream';
    const cleanliness = state.dirty === 0 ? green('propre') : red(`${state.dirty} modif.`);
    console.log(`${bold(repo.name.padEnd(24))} ${state.branch.padEnd(32)} ${tracking.padEnd(14)} ${cleanliness}`);
  }
  if (missing > 0) info(`${missing} repo(s) absent(s): lancer \`setup\` pour les cloner`);
  return 0;
}

/**
 * Resume les resultats par repo en comptes (calcule hors sous-shell, donc fiable).
 * @param {{ outcome: 'updated' | 'unchanged' | 'skipped' | 'failed' }[]} results
 */
export function summarize(results) {
  const counts = { updated: 0, unchanged: 0, skipped: 0, failed: 0 };
  for (const result of results) counts[result.outcome] += 1;
  return counts;
}

/**
 * @param {string} name
 * @param {string} dir
 * @param {'sync' | 'rebase'} mode
 * @param {boolean} autostash
 * @returns {{ name: string, outcome: 'updated' | 'unchanged' | 'skipped' | 'failed', detail: string }}
 */
export function syncOne(name, dir, mode, autostash) {
  const fetched = capture('git', ['fetch', 'origin', '--quiet'], { cwd: dir });
  if (fetched.status !== 0) return { name, outcome: 'failed', detail: `fetch: ${fetched.stderr.trim()}` };
  if (!autostash && !isClean(dir)) return { name, outcome: 'skipped', detail: 'modifications locales (utiliser --autostash)' };

  const branch = currentBranch(dir);
  const base = defaultBranch(dir);
  if (branch === '') return { name, outcome: 'skipped', detail: 'HEAD detache' };

  const before = capture('git', ['rev-parse', 'HEAD'], { cwd: dir }).stdout.trim();
  const stash = autostash ? ['--autostash'] : [];
  let result;
  if (mode === 'rebase') {
    if (branch === base) return { name, outcome: 'skipped', detail: `deja sur ${base} (utiliser sync)` };
    result = capture('git', ['rebase', ...stash, `origin/${base}`], { cwd: dir });
    if (result.status !== 0) {
      capture('git', ['rebase', '--abort'], { cwd: dir });
      return { name, outcome: 'failed', detail: `conflit lors du rebase sur origin/${base} (abandonne, rien n'est perdu)` };
    }
  } else {
    const upstream = capture('git', ['rev-parse', '--abbrev-ref', '@{upstream}'], { cwd: dir });
    if (upstream.status !== 0) return { name, outcome: 'skipped', detail: 'pas d\'upstream' };
    result = capture('git', ['pull', '--ff-only', ...stash], { cwd: dir });
    if (result.status !== 0) return { name, outcome: 'failed', detail: result.stderr.trim() || 'pull --ff-only impossible' };
  }
  const after = capture('git', ['rev-parse', 'HEAD'], { cwd: dir }).stdout.trim();
  return { name, outcome: before === after ? 'unchanged' : 'updated', detail: branch };
}

/**
 * @param {'sync' | 'rebase'} mode
 * @param {string[]} args
 */
function syncRepos(mode, args) {
  const manifest = loadManifest();
  const autostash = args.includes('--autostash');
  const results = [];
  for (const repo of manifest.repos) {
    const dir = join(ROOT_DIR, repo.name);
    if (!existsSync(join(dir, '.git'))) {
      results.push({ name: repo.name, outcome: /** @type {const} */ ('skipped'), detail: 'absent' });
      continue;
    }
    const result = syncOne(repo.name, dir, mode, autostash);
    results.push(result);
    console.log(`${bold(result.name.padEnd(24))} ${result.outcome.padEnd(10)} ${dim(result.detail)}`);
  }
  const counts = summarize(results);
  info(`${counts.updated} mis a jour, ${counts.unchanged} inchanges, ${counts.skipped} ignores, ${counts.failed} en echec`);
  return counts.failed > 0 ? 1 : 0;
}

/**
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function reposCommand(args) {
  const [sub = 'status', ...rest] = args;
  if (sub === 'list') return listRepos(rest);
  if (sub === 'status') return statusRepos(rest);
  if (sub === 'sync' || sub === 'rebase') return syncRepos(sub, rest);
  fail(`sous-commande inconnue: repos ${sub} (disponibles: list, status, sync, rebase)`);
  return 2;
}
