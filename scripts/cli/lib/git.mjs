import { capture } from './proc.mjs';

/**
 * Execute git dans un repo et leve en cas d'echec.
 * @param {string} dir
 * @param {string[]} args
 * @param {import('./proc.mjs').RunOptions} [options]
 */
export function git(dir, args, options = {}) {
  const result = capture('git', args, { ...options, cwd: dir });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} (${dir}): ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout.trim();
}

/** @param {string} dir */
export function currentBranch(dir) {
  return capture('git', ['branch', '--show-current'], { cwd: dir }).stdout.trim();
}

/** @param {string} dir */
export function isClean(dir) {
  return capture('git', ['status', '--porcelain'], { cwd: dir }).stdout.trim() === '';
}

/**
 * Branche par defaut du remote (origin/HEAD), avec repli sur main puis master.
 * @param {string} dir
 */
export function defaultBranch(dir) {
  const head = capture('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], { cwd: dir });
  if (head.status === 0) return head.stdout.trim().replace(/^origin\//, '');
  for (const candidate of ['main', 'master']) {
    if (capture('git', ['rev-parse', '--verify', `origin/${candidate}`], { cwd: dir }).status === 0) return candidate;
  }
  return 'main';
}
