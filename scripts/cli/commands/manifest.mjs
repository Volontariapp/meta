import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fail, ok, warn } from '../lib/log.mjs';
import { ROOT_DIR, expectedGitignoreEntries, loadManifest } from '../lib/manifest.mjs';
import { loadPresets, outdatedWorkspaces, unknownPresetRepos } from './workspaces.mjs';

/**
 * Entrees attendues absentes d'un contenu .gitignore.
 * @param {string} gitignoreContent
 * @param {string[]} expected
 */
export function missingGitignoreEntries(gitignoreContent, expected) {
  const lines = new Set(
    gitignoreContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#')),
  );
  return expected.filter((entry) => !lines.has(entry));
}

/**
 * Premier segment de chaque `"path"` d'un fichier .code-workspace (JSONC : lu par regex).
 * @param {string} content
 * @returns {string[]}
 */
export function workspaceRepoRefs(content) {
  const refs = [];
  for (const match of content.matchAll(/"path"\s*:\s*"([^"]+)"/g)) {
    const first = (match[1] ?? '').replace(/^(\.\.?\/)+/, '').split('/')[0] ?? '';
    if (first !== '' && first !== '.') refs.push(first);
  }
  return refs;
}

/**
 * Valide repos.json et sa coherence avec .gitignore.
 * @returns {Promise<number>} code retour
 */
export async function manifestCommand() {
  const manifest = loadManifest();
  ok(`repos.json valide: ${manifest.repos.length} repos, ${manifest.units.length} unites`);

  const gitignore = readFileSync(join(ROOT_DIR, '.gitignore'), 'utf8');
  const missing = missingGitignoreEntries(gitignore, expectedGitignoreEntries(manifest));
  if (missing.length > 0) {
    fail(`.gitignore ne couvre pas: ${missing.join(', ')}`);
    warn('Ajouter ces lignes ou corriger repos.json.');
    return 1;
  }
  ok('.gitignore couvre tous les repos du manifeste');

  const names = manifest.repos.map((repo) => repo.name);
  const unknown = unknownPresetRepos(loadPresets().presets, names);
  if (unknown.length > 0) {
    fail(`.workspaces/presets.json: repos hors manifeste: ${unknown.join(', ')}`);
    return 1;
  }
  const outdated = outdatedWorkspaces();
  if (outdated.length > 0) {
    fail(`workspaces obsoletes: ${outdated.join(', ')} (lancer \`yarn meta workspaces\`)`);
    return 1;
  }
  ok('workspaces a jour par rapport a presets.json et repos.json');
  return 0;
}
