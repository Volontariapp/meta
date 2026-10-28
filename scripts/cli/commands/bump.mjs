import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { currentBranch, git, isClean } from '../lib/git.mjs';
import { dim, fail, info, ok, warn } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest } from '../lib/manifest.mjs';
import { capture, run } from '../lib/proc.mjs';

const CONSUMER_KINDS = new Set(['microservice', 'gateway', 'outbox', 'post-processor', 'worker', 'mobile']);

/**
 * Consommateurs a mettre a jour : un element par repo, avec les dossiers contenant un package.json.
 * @param {import('../lib/manifest.mjs').Manifest} manifest
 * @returns {{ repo: string, dirs: string[] }[]}
 */
export function bumpTargets(manifest) {
  /** @type {Map<string, string[]>} */
  const byRepo = new Map();
  for (const unit of manifest.units.filter((candidate) => CONSUMER_KINDS.has(candidate.kind))) {
    byRepo.set(unit.repo, [...(byRepo.get(unit.repo) ?? []), unit.path]);
  }
  return [...byRepo.entries()].map(([repo, dirs]) => ({ repo, dirs: dirs.length === 1 && dirs[0] === repo ? [repo] : dirs }));
}

/**
 * Ouvre une PR par consommateur avec `yarn up "@volontariapp/**"`. Jamais de push sur main.
 * A lancer APRES la publication CI du package modifie (regle STOP).
 * Option : --only repo1,repo2, --dry-run.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function bumpCommand(args) {
  const manifest = loadManifest();
  const dryRun = args.includes('--dry-run');
  const onlyIndex = args.indexOf('--only');
  const only = onlyIndex === -1 ? null : (args[onlyIndex + 1] ?? '').split(',');
  const targets = bumpTargets(manifest).filter((target) => only === null || only.includes(target.repo));
  const stamp = new Date().toISOString().slice(0, 10);
  const opened = [];
  const failed = [];

  for (const target of targets) {
    const repoDir = join(ROOT_DIR, target.repo);
    if (!existsSync(join(repoDir, '.git'))) {
      warn(`${target.repo}: absent, ignore`);
      continue;
    }
    if (!isClean(repoDir)) {
      warn(`${target.repo}: modifications locales, ignore`);
      continue;
    }
    const original = currentBranch(repoDir);
    const branch = `chore/bump-volontariapp-${stamp}`;
    info(`${target.repo}: mise a jour des dependances @volontariapp/*`);
    try {
      git(repoDir, ['fetch', 'origin', '--quiet']);
      const base = capture('git', ['rev-parse', '--verify', 'origin/main'], { cwd: repoDir }).status === 0 ? 'main' : 'master';
      git(repoDir, ['checkout', '-B', branch, `origin/${base}`]);
      for (const dir of target.dirs) {
        await run('yarn', ['up', '@volontariapp/**'], { cwd: join(ROOT_DIR, dir) });
      }
      if (isClean(repoDir)) {
        ok(`${target.repo}: deja a jour`);
        git(repoDir, ['checkout', original]);
        continue;
      }
      if (dryRun) {
        warn(`${target.repo}: [dry-run] changements detectes, pas de commit`);
        git(repoDir, ['checkout', '--', '.']);
        git(repoDir, ['checkout', original]);
        continue;
      }
      git(repoDir, ['add', '-A']);
      git(repoDir, ['commit', '-m', 'chore: bump @volontariapp dependencies'], { env: { ...process.env, SKIP_SKILL_CHECK: '1' } });
      git(repoDir, ['push', '-u', 'origin', branch]);
      const pr = capture('gh', ['pr', 'create', '--base', base, '--head', branch, '--title', 'chore: bump @volontariapp dependencies', '--body', 'Mise a jour automatique des packages internes (meta bump).'], { cwd: repoDir });
      if (pr.status !== 0) throw new Error(`gh pr create: ${pr.stderr.trim()}`);
      opened.push(`${target.repo}: ${pr.stdout.trim()}`);
      git(repoDir, ['checkout', original]);
    } catch (error) {
      failed.push(target.repo);
      fail(`${target.repo}: ${error instanceof Error ? error.message : String(error)}`);
      warn(`${target.repo} est reste sur ${currentBranch(repoDir)} (retour manuel: git checkout ${original})`);
    }
  }
  for (const line of opened) console.log(dim(line));
  info(`${opened.length} PR ouverte(s), ${failed.length} echec(s)`);
  return failed.length > 0 ? 1 : 0;
}
