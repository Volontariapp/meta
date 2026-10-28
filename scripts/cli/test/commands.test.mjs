import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { generateCerts, planCertTargets } from '../commands/certs.mjs';
import { parseComposePs, pendingServices } from '../commands/infra.mjs';
import { selectMigrationUnits } from '../commands/migrate.mjs';
import { parseSetupFlags, planSetupSteps } from '../commands/setup.mjs';
import { hasScript } from '../commands/start.mjs';
import { buildWorkspace, outdatedWorkspaces, unknownPresetRepos } from '../commands/workspaces.mjs';
import { killTree, spawnGroup } from '../lib/proc.mjs';
import { ROOT_DIR, loadManifest, migratingUnits } from '../lib/manifest.mjs';

const manifest = loadManifest();

describe('certs', () => {
  it('distribue internal.pub a chaque unite avec certs et les privees a gateway et ms-user', () => {
    const targets = planCertTargets(manifest.units);
    const internalPub = targets.filter((t) => t.file === 'internal.pub').map((t) => t.dir);
    for (const unit of manifest.units.filter((u) => u.certs === true)) {
      assert.ok(internalPub.includes(unit.path), `internal.pub manquant pour ${unit.name}`);
    }
    assert.ok(targets.some((t) => t.dir === 'api-gateway' && t.file === 'internal.key'));
    assert.ok(targets.some((t) => t.dir === 'ms-user' && t.file === 'access.key'));
    assert.ok(!targets.some((t) => t.dir === 'ms-post' && t.kind === 'private'));
  });

  it('genere les cles, est idempotent sans --force et regenere avec --force', () => {
    const root = mkdtempSync(join(tmpdir(), 'meta-certs-'));
    try {
      copyFileSync(join(ROOT_DIR, 'repos.json'), join(root, 'repos.json'));
      const first = generateCerts({ rootDir: root });
      assert.equal(first.generated, true);
      const keyPath = join(root, 'api-gateway', 'certs', 'internal.key');
      const before = readFileSync(keyPath, 'utf8');
      assert.match(before, /BEGIN PRIVATE KEY/);
      if (process.platform !== 'win32') assert.equal(statSync(keyPath).mode & 0o777, 0o600);

      assert.equal(generateCerts({ rootDir: root }).generated, false);
      assert.equal(readFileSync(keyPath, 'utf8'), before);

      assert.equal(generateCerts({ rootDir: root, force: true }).generated, true);
      assert.notEqual(readFileSync(keyPath, 'utf8'), before);
      assert.equal(readFileSync(join(root, 'ms-user', 'certs', 'internal.pub'), 'utf8'), readFileSync(join(root, 'api-gateway', 'certs', 'internal.pub'), 'utf8'));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('infra', () => {
  it('parse les sorties compose en lignes JSON ou en tableau', () => {
    const line = '{"Service":"redis","State":"running","Health":"healthy"}';
    assert.deepEqual(parseComposePs(`${line}\n${line}`).length, 2);
    assert.deepEqual(parseComposePs(`[${line}]`).length, 1);
    assert.deepEqual(parseComposePs(''), []);
  });

  it('liste les services non prets', () => {
    const rows = [
      { Service: 'a', State: 'running', Health: 'healthy' },
      { Service: 'b', State: 'running', Health: 'starting' },
      { Service: 'c', State: 'exited', Health: '' },
      { Service: 'd', State: 'running', Health: '' },
      { Service: 'init', State: 'exited', ExitCode: 0 },
    ];
    assert.deepEqual(pendingServices(rows, ['init']), ['b', 'c']);
  });
});

describe('migrate', () => {
  const available = migratingUnits(manifest);

  it('couvre ms-ranking, ms-storage et ws-service (absents de l ancien run_migrations.sh)', () => {
    const names = available.map((u) => u.name);
    for (const name of ['ms-ranking', 'ms-storage', 'ws-service']) assert.ok(names.includes(name));
    assert.ok(!names.includes('api-gateway'));
  });

  it('accepte les noms avec ou sans prefixe ms-', () => {
    assert.deepEqual(selectMigrationUnits(available, ['--services', 'user,ms-post']).map((u) => u.name), ['ms-user', 'ms-post']);
  });

  it('refuse un service inconnu et renvoie tout avec --all', () => {
    assert.throws(() => selectMigrationUnits(available, ['--services', 'ghost']), /inconnu/);
    assert.equal(selectMigrationUnits(available, ['--all']).length, available.length);
  });
});

describe('setup', () => {
  it('planifie toutes les etapes par defaut, dans l ordre', () => {
    assert.deepEqual(planSetupSteps(parseSetupFlags([], false)), ['prerequis', 'clone', 'dependances', 'certificats', 'infra', 'migrations', 'verification']);
  });

  it('retire infra et migrations avec --skip-infra, ajoute le build avec --build-packages', () => {
    const steps = planSetupSteps(parseSetupFlags(['--skip-infra', '--build-packages'], false));
    assert.ok(!steps.includes('infra') && !steps.includes('migrations'));
    assert.ok(steps.includes('build-packages'));
  });

  it('ajoute apps et shell en interactif, sauf --no-apps / --no-shell', () => {
    assert.deepEqual(planSetupSteps(parseSetupFlags([], true)).slice(0, 3), ['apps', 'shell', 'prerequis']);
    assert.deepEqual(planSetupSteps(parseSetupFlags(['--no-apps', '--no-shell'], true)).slice(0, 1), ['prerequis']);
  });

  it('ne lance pas les migrations si seulement --skip-migrations', () => {
    const steps = planSetupSteps(parseSetupFlags(['--skip-migrations'], false));
    assert.ok(steps.includes('infra') && !steps.includes('migrations'));
  });
});

describe('start', () => {
  it('detecte la presence d un script yarn', () => {
    const dir = mkdtempSync(join(tmpdir(), 'meta-start-'));
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { 'start:local': 'x' } }));
      assert.equal(hasScript(dir, 'start:local'), true);
      assert.equal(hasScript(dir, 'start:prod'), false);
      assert.equal(hasScript(join(dir, 'absent'), 'start:local'), false);
      assert.equal(existsSync(dir), true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('workspaces generes', () => {
  const preset = { id: 'x', description: 'x', repos: ['.', 'ms-user'] };

  it('produit du JSON valide avec un dossier par repo, meta pointant sur la racine', () => {
    const parsed = JSON.parse(buildWorkspace(preset, { settings: {} }, ['ms-user']));
    assert.deepEqual(parsed.folders, [{ name: 'meta', path: '..' }, { name: 'ms-user', path: '../ms-user' }]);
    assert.deepEqual(parsed.settings, {});
  });

  it('repos null signifie tous les repos du manifeste', () => {
    const parsed = JSON.parse(buildWorkspace({ id: 'all', description: 'x', repos: null }, {}, ['a', 'b']));
    assert.deepEqual(parsed.folders.map((f) => f.path), ['..', '../a', '../b']);
  });

  it('signale les repos inconnus', () => {
    assert.deepEqual(unknownPresetRepos([preset, { id: 'y', description: 'x', repos: ['ghost'] }], ['ms-user']), ['y: ghost']);
  });

  it('les fichiers du depot sont a jour (yarn meta workspaces)', () => {
    assert.deepEqual(outdatedWorkspaces(), []);
  });
});

describe('killTree', () => {
  it('arrete le processus et ses descendants', { skip: process.platform === 'win32' }, async () => {
    const child = spawnGroup('sh', ['-c', 'sleep 30 & echo $!; wait']);
    const grandchild = await new Promise((resolvePromise) => {
      child.stdout?.once('data', (chunk) => resolvePromise(Number.parseInt(String(chunk).trim(), 10)));
    });
    assert.doesNotThrow(() => process.kill(grandchild, 0));
    const closed = new Promise((resolvePromise) => child.once('close', resolvePromise));
    killTree(child);
    await closed;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
    assert.throws(() => process.kill(grandchild, 0), /ESRCH/);
  });
});
