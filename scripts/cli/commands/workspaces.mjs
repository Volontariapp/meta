import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { fail, info, ok } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest } from '../lib/manifest.mjs';

/**
 * @typedef {{ id: string, description: string, repos: string[] | null }} Preset
 * @typedef {{ template: Record<string, unknown>, presets: Preset[] }} PresetFile
 */

/** @param {string} [rootDir] @returns {PresetFile} */
export function loadPresets(rootDir = ROOT_DIR) {
  return JSON.parse(readFileSync(join(rootDir, '.workspaces', 'presets.json'), 'utf8'));
}

/**
 * Contenu d'un fichier .code-workspace. `repos: null` signifie tous les repos du manifeste ;
 * `.` designe meta lui-meme.
 * @param {Preset} preset
 * @param {Record<string, unknown>} template
 * @param {string[]} allRepos
 */
export function buildWorkspace(preset, template, allRepos) {
  const repos = preset.repos ?? ['.', ...allRepos];
  const folders = repos.map((repo) => (repo === '.' ? { name: 'meta', path: '..' } : { name: repo, path: `../${repo}` }));
  return `${JSON.stringify({ folders, ...template }, null, 2)}\n`;
}

/**
 * Repos references par les presets mais absents du manifeste.
 * @param {Preset[]} presets
 * @param {string[]} knownRepos
 */
export function unknownPresetRepos(presets, knownRepos) {
  const known = new Set(['.', ...knownRepos]);
  return presets.flatMap((preset) => (preset.repos ?? []).filter((repo) => !known.has(repo)).map((repo) => `${preset.id}: ${repo}`));
}

/**
 * Fichiers .code-workspace dont le contenu differe de celui genere.
 * @param {string} [rootDir]
 */
export function outdatedWorkspaces(rootDir = ROOT_DIR) {
  const manifest = loadManifest(rootDir);
  const allRepos = manifest.repos.map((repo) => repo.name);
  const { template, presets } = loadPresets(rootDir);
  return presets
    .filter((preset) => {
      const file = join(rootDir, '.workspaces', `${preset.id}.code-workspace`);
      return !existsSync(file) || readFileSync(file, 'utf8') !== buildWorkspace(preset, template, allRepos);
    })
    .map((preset) => preset.id);
}

/**
 * `workspaces [--check]` : regenere .workspaces/*.code-workspace depuis presets.json et repos.json.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function workspacesCommand(args) {
  const manifest = loadManifest();
  const allRepos = manifest.repos.map((repo) => repo.name);
  const { template, presets } = loadPresets();
  const unknown = unknownPresetRepos(presets, allRepos);
  if (unknown.length > 0) {
    fail(`presets avec repos hors manifeste:\n  - ${unknown.join('\n  - ')}`);
    return 1;
  }
  const outdated = outdatedWorkspaces();
  if (args.includes('--check')) {
    if (outdated.length > 0) {
      fail(`workspaces obsoletes: ${outdated.join(', ')} (lancer \`meta workspaces\`)`);
      return 1;
    }
    ok(`${presets.length} workspaces a jour`);
    return 0;
  }
  for (const preset of presets.filter((candidate) => outdated.includes(candidate.id))) {
    writeFileSync(join(ROOT_DIR, '.workspaces', `${preset.id}.code-workspace`), buildWorkspace(preset, template, allRepos));
  }
  info(`${outdated.length} workspace(s) regenere(s) sur ${presets.length}`);
  return 0;
}
