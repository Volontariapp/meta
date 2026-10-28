import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { bumpTargets } from '../commands/bump.mjs';
import { prReadiness } from '../commands/pr.mjs';
import { summarize, syncOne } from '../commands/repos.mjs';
import { changesetContent, mirrorDir, syncableServices } from '../commands/sync-migrations.mjs';
import { git } from '../lib/git.mjs';
import { loadManifest } from '../lib/manifest.mjs';

/** @param {string} dir @param {Record<string, string>} files */
function writeTree(dir, files) {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
}

describe('mirrorDir', () => {
  it('ajoute, met a jour et supprime comme rsync --delete, recursivement', () => {
    const root = mkdtempSync(join(tmpdir(), 'meta-mirror-'));
    try {
      writeTree(join(root, 'src'), { 'a.ts': '1', 'domain/b.ts': '2', 'common/c.ts': 'new' });
      writeTree(join(root, 'dest'), { 'a.ts': '1', 'common/c.ts': 'old', 'stale.ts': 'x' });
      const result = mirrorDir(join(root, 'src'), join(root, 'dest'));
      assert.deepEqual(result.added, [join('domain', 'b.ts')]);
      assert.deepEqual(result.updated, [join('common', 'c.ts')]);
      assert.deepEqual(result.removed, ['stale.ts']);
      assert.equal(existsSync(join(root, 'dest', 'stale.ts')), false);
      assert.equal(readFileSync(join(root, 'dest', 'common', 'c.ts'), 'utf8'), 'new');
      assert.deepEqual(mirrorDir(join(root, 'src'), join(root, 'dest')), { added: [], updated: [], removed: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('cree le dossier de destination s il n existe pas', () => {
    const root = mkdtempSync(join(tmpdir(), 'meta-mirror-'));
    try {
      writeTree(join(root, 'src'), { 'a.ts': '1' });
      assert.deepEqual(mirrorDir(join(root, 'src'), join(root, 'new', 'dest')).added, ['a.ts']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('changeset', () => {
  it('produit un changeset patch pour chaque package', () => {
    assert.equal(changesetContent(['@volontariapp/domain-user', '@volontariapp/domain-post'], 'Sync.'), '---\n"@volontariapp/domain-user": patch\n"@volontariapp/domain-post": patch\n---\n\nSync.\n');
  });

  it('syncableServices ne retient que les ms avec un package domain-* present', () => {
    const root = mkdtempSync(join(tmpdir(), 'meta-sync-'));
    try {
      mkdirSync(join(root, 'npm-packages', 'packages', 'domain-user'), { recursive: true });
      const names = syncableServices(loadManifest(), root).map((s) => s.unit.name);
      assert.deepEqual(names, ['ms-user']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('prReadiness (1 PR = 1 message Discord)', () => {
  const green = { status: 'COMPLETED', conclusion: 'SUCCESS' };

  it('autorise une PR fusionnable avec tous les checks verts', () => {
    assert.equal(prReadiness({ mergeable: 'MERGEABLE', statusCheckRollup: [green, { status: 'COMPLETED', conclusion: 'SKIPPED' }] }).ready, true);
  });

  it('refuse en cas de conflit, de check en cours, en echec ou absent', () => {
    assert.equal(prReadiness({ mergeable: 'CONFLICTING', statusCheckRollup: [green] }).ready, false);
    assert.equal(prReadiness({ mergeable: 'UNKNOWN', statusCheckRollup: [green] }).ready, false);
    assert.equal(prReadiness({ mergeable: 'MERGEABLE', statusCheckRollup: [green, { status: 'IN_PROGRESS' }] }).ready, false);
    assert.equal(prReadiness({ mergeable: 'MERGEABLE', statusCheckRollup: [green, { status: 'COMPLETED', conclusion: 'FAILURE' }] }).ready, false);
    assert.equal(prReadiness({ mergeable: 'MERGEABLE', statusCheckRollup: [] }).ready, false);
  });
});

describe('bump', () => {
  it('ne cible jamais npm-packages et regroupe les runners par repo', () => {
    const targets = bumpTargets(loadManifest());
    assert.ok(!targets.some((t) => t.repo === 'npm-packages'));
    const outbox = targets.find((t) => t.repo === 'outbox-runners');
    assert.ok(outbox && outbox.dirs.length === 7 && outbox.dirs.every((d) => d.startsWith('outbox-runners/')));
    assert.deepEqual(targets.find((t) => t.repo === 'ms-user')?.dirs, ['ms-user']);
  });
});

describe('repos sync / rebase', () => {
  it('compte les resultats sans perdre les compteurs', () => {
    assert.deepEqual(summarize([{ outcome: 'updated' }, { outcome: 'failed' }, { outcome: 'updated' }, { outcome: 'skipped' }]), { updated: 2, unchanged: 0, skipped: 1, failed: 1 });
  });

  it('ignore un repo sale sans stash silencieux, fast-forward un repo propre', () => {
    const root = mkdtempSync(join(tmpdir(), 'meta-git-'));
    try {
      const origin = join(root, 'origin.git');
      const work = join(root, 'work');
      const other = join(root, 'other');
      git(root, ['init', '--bare', '-b', 'main', origin]);
      git(root, ['clone', origin, work]);
      for (const dir of [work]) {
        git(dir, ['config', 'user.email', 't@t']);
        git(dir, ['config', 'user.name', 't']);
      }
      writeFileSync(join(work, 'a.txt'), '1');
      git(work, ['add', '.']);
      git(work, ['commit', '-m', 'init']);
      git(work, ['push', '-u', 'origin', 'main']);
      git(root, ['clone', origin, other]);
      git(other, ['config', 'user.email', 't@t']);
      git(other, ['config', 'user.name', 't']);
      writeFileSync(join(other, 'b.txt'), '2');
      git(other, ['add', '.']);
      git(other, ['commit', '-m', 'second']);
      git(other, ['push']);

      writeFileSync(join(work, 'a.txt'), 'dirty');
      assert.equal(syncOne('work', work, 'sync', false).outcome, 'skipped');
      assert.equal(readFileSync(join(work, 'a.txt'), 'utf8'), 'dirty');

      git(work, ['checkout', '--', '.']);
      assert.equal(syncOne('work', work, 'sync', false).outcome, 'updated');
      assert.equal(existsSync(join(work, 'b.txt')), true);
      assert.equal(syncOne('work', work, 'sync', false).outcome, 'unchanged');
      assert.equal(git(work, ['stash', 'list']), '');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
