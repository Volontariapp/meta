import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { missingGitignoreEntries, workspaceRepoRefs } from '../commands/manifest.mjs';
import { versionAtLeast } from '../commands/doctor.mjs';
import {
  ROOT_DIR,
  cloneUrl,
  expectedGitignoreEntries,
  loadManifest,
  migratingUnits,
  startScript,
  unitsForProfile,
  validateManifest,
} from '../lib/manifest.mjs';

/** @returns {import('../lib/manifest.mjs').Manifest} */
function sampleManifest() {
  return {
    version: 1,
    org: 'Acme',
    repos: [{ name: 'svc', role: 'microservice', description: 'x' }],
    units: [
      { name: 'a', repo: 'svc', path: 'svc', kind: 'microservice', order: 2, migrations: true },
      { name: 'b', repo: 'svc', path: 'svc/b', kind: 'worker', order: 1 },
    ],
    profiles: { core: ['microservice'], all: ['microservice', 'worker'] },
    envs: { local: 'start:local' },
  };
}

describe('validateManifest', () => {
  it('accepte un manifeste coherent', () => {
    assert.deepEqual(validateManifest(sampleManifest()), []);
  });

  it('signale un repo inconnu, un doublon et un kind de profil inconnu', () => {
    const manifest = sampleManifest();
    manifest.units.push({ name: 'a', repo: 'ghost', path: 'x', kind: 'worker', order: 2 });
    manifest.profiles.bad = ['nope'];
    const errors = validateManifest(manifest);
    assert.ok(errors.some((e) => e.includes('unit en double: a')));
    assert.ok(errors.some((e) => e.includes('repo inconnu ghost')));
    assert.ok(errors.some((e) => e.includes('ordre 2 deja utilise')));
    assert.ok(errors.some((e) => e.includes('kind inconnu nope')));
  });
});

describe('helpers de manifeste', () => {
  it('construit les URLs de clone https et ssh', () => {
    const manifest = sampleManifest();
    assert.equal(cloneUrl(manifest, 'svc'), 'https://github.com/Acme/svc.git');
    assert.equal(cloneUrl(manifest, 'svc', 'ssh'), 'git@github.com:Acme/svc.git');
  });

  it('trie les unites d un profil par ordre', () => {
    assert.deepEqual(unitsForProfile(sampleManifest(), 'all').map((u) => u.name), ['b', 'a']);
  });

  it('refuse un profil ou un environnement inconnu', () => {
    assert.throws(() => unitsForProfile(sampleManifest(), 'nope'), /profil inconnu/);
    assert.throws(() => startScript(sampleManifest(), 'nope'), /environnement inconnu/);
    assert.equal(startScript(sampleManifest(), 'local'), 'start:local');
  });

  it('ne retient que les unites avec migrations', () => {
    assert.deepEqual(migratingUnits(sampleManifest()).map((u) => u.name), ['a']);
  });
});

describe('gitignore', () => {
  it('detecte les entrees manquantes en ignorant commentaires et lignes vides', () => {
    const content = '# repos\n/svc\n\nnode_modules/\n';
    assert.deepEqual(missingGitignoreEntries(content, ['/svc', '/other', '.github']), ['/other', '.github']);
  });

  it('attend .github sans slash initial', () => {
    const manifest = sampleManifest();
    manifest.repos.push({ name: '.github', role: 'org-profile', description: 'x' });
    assert.deepEqual(expectedGitignoreEntries(manifest), ['/svc', '.github']);
  });
});

describe('workspaces', () => {
  it('extrait le repo de chaque dossier, avec ou sans ../', () => {
    const content = '{ "folders": [ { "path": "../ms-user" }, { "name": "x", "path": "npm-packages/packages/auth" }, { "path": "." } ] }';
    assert.deepEqual(workspaceRepoRefs(content), ['ms-user', 'npm-packages']);
  });
});

describe('doctor', () => {
  it('compare les versions semver', () => {
    assert.equal(versionAtLeast('v24.14.0', '24.14.0'), true);
    assert.equal(versionAtLeast('24.2.0', '24.14.0'), false);
    assert.equal(versionAtLeast('25.0.0', '24.14.0'), true);
    assert.equal(versionAtLeast('4.12.0', '4.0.0'), true);
  });
});

describe('repos.json du workspace', () => {
  const manifest = loadManifest();

  it('est valide et couvre les repos recenses', () => {
    for (const name of ['ms-ranking', 'ws-service', 'post-processors-runner', '.github']) {
      assert.ok(manifest.repos.some((repo) => repo.name === name), `repo manquant: ${name}`);
    }
  });

  it('est couvert par le .gitignore', () => {
    const gitignore = readFileSync(join(ROOT_DIR, '.gitignore'), 'utf8');
    assert.deepEqual(missingGitignoreEntries(gitignore, expectedGitignoreEntries(manifest)), []);
  });
});
