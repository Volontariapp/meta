import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { currentBranch, git, isClean } from '../lib/git.mjs';
import { fail, info, ok, warn } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest, migratingUnits } from '../lib/manifest.mjs';
import { capture, run } from '../lib/proc.mjs';

/**
 * Liste recursive des fichiers d'un dossier, en chemins relatifs.
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)));
}

/**
 * Miroir de `src` vers `dest` (equivalent de `rsync -ac --delete`) : copie les fichiers
 * nouveaux ou modifies, supprime ceux qui n'existent plus a la source. Avec `dryRun`, ne touche a rien.
 * @param {string} src
 * @param {string} dest
 * @param {boolean} [dryRun]
 * @returns {{ added: string[], updated: string[], removed: string[] }}
 */
export function mirrorDir(src, dest, dryRun = false) {
  const srcFiles = listFiles(src);
  const destFiles = new Set(listFiles(dest));
  const added = [];
  const updated = [];
  for (const file of srcFiles) {
    const from = join(src, file);
    const to = join(dest, file);
    if (!destFiles.has(file)) {
      if (!dryRun) {
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
      added.push(file);
    } else if (Buffer.compare(readFileSync(from), readFileSync(to)) !== 0) {
      if (!dryRun) copyFileSync(from, to);
      updated.push(file);
    }
    destFiles.delete(file);
  }
  const removed = [...destFiles];
  if (!dryRun) for (const file of removed) rmSync(join(dest, file));
  return { added, updated, removed };
}

/**
 * Services dont les migrations alimentent un package domain-* (uniquement les ms-*).
 * @param {import('../lib/manifest.mjs').Manifest} manifest
 * @param {string} rootDir
 */
export function syncableServices(manifest, rootDir = ROOT_DIR) {
  return migratingUnits(manifest)
    .filter((unit) => unit.name.startsWith('ms-'))
    .map((unit) => ({ unit, domain: unit.name.replace(/^ms-/, '') }))
    .filter(({ domain }) => existsSync(join(rootDir, 'npm-packages', 'packages', `domain-${domain}`)));
}

/**
 * Contenu du changeset pour une liste de packages.
 * @param {string[]} packageNames
 * @param {string} summary
 */
export function changesetContent(packageNames, summary) {
  return `---\n${packageNames.map((name) => `"${name}": patch`).join('\n')}\n---\n\n${summary}\n`;
}

/** @param {string[]} args */
function selected(args, available) {
  const index = args.indexOf('--packages');
  if (index === -1) return available;
  const names = (args[index + 1] ?? '').split(',').map((n) => n.trim().replace(/^ms-/, '').replace(/^domain-/, '')).filter(Boolean);
  const unknown = names.filter((n) => !available.some((s) => s.domain === n));
  if (unknown.length > 0) throw new Error(`service(s) inconnu(s): ${unknown.join(', ')} (disponibles: ${available.map((s) => s.domain).join(', ')})`);
  return available.filter((s) => names.includes(s.domain));
}

/**
 * Synchronise ms-X/src/migrations vers domain-X/src/test/migrations. Avec --pr, cree la branche,
 * le changeset, verifie build et test, ouvre la PR dans npm-packages puis S'ARRETE (regle STOP :
 * aucun consommateur n'est touche avant la publication par la CI).
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function syncMigrationsCommand(args) {
  const manifest = loadManifest();
  const services = selected(args, syncableServices(manifest));
  const openPr = args.includes('--pr');
  const dryRun = args.includes('--dry-run');
  if (openPr && dryRun) {
    fail('--pr et --dry-run sont incompatibles');
    return 2;
  }
  const npmDir = join(ROOT_DIR, 'npm-packages');
  let originalBranch = '';
  let prBranch = '';

  if (openPr) {
    if (!isClean(npmDir)) {
      fail('npm-packages a des modifications locales : les commiter ou les stasher avant --pr');
      return 1;
    }
    originalBranch = currentBranch(npmDir);
    git(npmDir, ['fetch', 'origin', 'main', '--quiet']);
    prBranch = `chore/sync-migrations-${services.map((s) => s.domain).join('-')}-${new Date().toISOString().slice(0, 10)}`;
    git(npmDir, ['checkout', '-b', prBranch, 'origin/main']);
  }

  const changed = [];
  try {
    for (const { unit, domain } of services) {
      const src = join(ROOT_DIR, unit.path, 'src', 'migrations');
      const dest = join(npmDir, 'packages', `domain-${domain}`, 'src', 'test', 'migrations');
      if (!existsSync(src)) {
        warn(`${unit.name}: ${relative(ROOT_DIR, src)} absent, ignore`);
        continue;
      }
      const result = mirrorDir(src, dest, dryRun);
      if (dryRun) for (const file of [...result.added.map((f) => `+ ${f}`), ...result.updated.map((f) => `~ ${f}`), ...result.removed.map((f) => `- ${f}`)]) console.log(`  ${file}`);
      const count = result.added.length + result.updated.length + result.removed.length;
      if (count === 0) {
        info(`${unit.name}: deja a jour`);
        continue;
      }
      ok(`${unit.name}: ${result.added.length} ajoute(s), ${result.updated.length} modifie(s), ${result.removed.length} supprime(s)`);
      changed.push(domain);
    }

    if (changed.length === 0) {
      ok('aucune migration a synchroniser');
      if (openPr) git(npmDir, ['checkout', originalBranch]);
      return 0;
    }
    warn(`verifier src/config/data-source.ts dans: ${changed.map((d) => `ms-${d}`).join(', ')} (doit pointer vers les migrations du package domain)`);
    if (!openPr || dryRun) return 0;

    const packageNames = changed.map((domain) => {
      const pkg = JSON.parse(readFileSync(join(npmDir, 'packages', `domain-${domain}`, 'package.json'), 'utf8'));
      return /** @type {string} */ (pkg.name);
    });
    writeFileSync(join(npmDir, '.changeset', `sync-migrations-${changed.join('-')}.md`), changesetContent(packageNames, `Synchronise les migrations de ${changed.map((d) => `ms-${d}`).join(', ')}.`));
    await run('yarn', ['changeset', 'version'], { cwd: npmDir });
    for (const name of packageNames) {
      await run('yarn', ['workspace', name, 'run', 'build'], { cwd: npmDir });
      await run('yarn', ['workspace', name, 'run', 'test'], { cwd: npmDir });
    }
    git(npmDir, ['add', '-A']);
    git(npmDir, ['commit', '-m', `chore: sync migrations ${changed.map((d) => `ms-${d}`).join(', ')}`]);
    git(npmDir, ['push', '-u', 'origin', prBranch]);
    const pr = capture('gh', ['pr', 'create', '--base', 'main', '--head', prBranch, '--title', `chore: sync migrations ${changed.map((d) => `ms-${d}`).join(', ')}`, '--body', 'Synchronisation automatique des migrations depuis les microservices (meta sync-migrations --pr).'], { cwd: npmDir });
    if (pr.status !== 0) throw new Error(`gh pr create: ${pr.stderr.trim()}`);
    ok(`PR ouverte: ${pr.stdout.trim()}`);
    warn('ARRET (regle STOP) : attendre la publication CI de la version, puis lancer `meta bump`. Ne pas modifier les consommateurs avant.');
    git(npmDir, ['checkout', originalBranch]);
    return 0;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    if (openPr) warn(`npm-packages est reste sur la branche ${prBranch} (retour manuel: git checkout ${originalBranch})`);
    return 1;
  }
}
