import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fail, info, ok, warn } from '../lib/log.mjs';
import { ROOT_DIR, loadManifest } from '../lib/manifest.mjs';
import { capture } from '../lib/proc.mjs';

const OK_CONCLUSIONS = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED']);

/**
 * Une PR est prete a etre annoncee si elle est fusionnable (zero conflit) et si tous ses checks
 * sont termines en succes. Au moins un check est exige (sinon la CI n'a peut-etre pas demarre).
 * @param {{ mergeable?: string, statusCheckRollup?: { status?: string, conclusion?: string, state?: string }[] }} pr
 * @returns {{ ready: boolean, reason: string }}
 */
export function prReadiness(pr) {
  if (pr.mergeable !== 'MERGEABLE') return { ready: false, reason: `etat de fusion: ${pr.mergeable ?? 'inconnu'}` };
  const checks = pr.statusCheckRollup ?? [];
  if (checks.length === 0) return { ready: false, reason: 'aucun check CI' };
  const pending = checks.filter((check) => {
    const conclusion = check.conclusion ?? check.state ?? '';
    return !OK_CONCLUSIONS.has(conclusion) || (check.status !== undefined && check.status !== 'COMPLETED');
  });
  return pending.length > 0 ? { ready: false, reason: `${pending.length} check(s) non verts ou en cours` } : { ready: true, reason: 'ok' };
}

/** Charge DISCORD_WEBHOOK_URL depuis l'environnement, .env.local ou .env. */
function webhookUrl() {
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL;
  for (const file of ['.env.local', '.env']) {
    const path = join(ROOT_DIR, file);
    if (!existsSync(path)) continue;
    const match = readFileSync(path, 'utf8').match(/^DISCORD_WEBHOOK_URL=["']?([^"'\n]+)["']?/m);
    if (match?.[1]) return match[1];
  }
  return '';
}

/**
 * Annonce une PR sur Discord seulement si elle est prete (1 PR = 1 message).
 * Usage : notify-pr <repo> <numero>
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function notifyPrCommand(args) {
  const [repo, number] = args;
  if (!repo || !number) {
    fail('usage: notify-pr <repo> <numero>');
    return 2;
  }
  const org = loadManifest().org;
  const view = capture('gh', ['pr', 'view', number, '--repo', `${org}/${repo}`, '--json', 'url,title,mergeable,statusCheckRollup']);
  if (view.status !== 0) {
    fail(`gh pr view: ${view.stderr.trim()}`);
    return 1;
  }
  const pr = JSON.parse(view.stdout);
  const readiness = prReadiness(pr);
  if (!readiness.ready) {
    warn(`PR non annoncee (${readiness.reason}) : aucune notification envoyee`);
    return 3;
  }
  const logDir = join(ROOT_DIR, 'logs');
  const sentFile = join(logDir, 'discord-notified.log');
  if (existsSync(sentFile) && readFileSync(sentFile, 'utf8').split('\n').includes(pr.url)) {
    info('PR deja annoncee : rien a faire');
    return 0;
  }
  const url = webhookUrl();
  if (!url) {
    fail('DISCORD_WEBHOOK_URL absent (voir .env.example)');
    return 1;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'PLIC Bot', embeds: [{ title: pr.title, url: pr.url, color: 3066993, footer: { text: 'PLIC - Volontariapp' } }] }),
  });
  if (!response.ok) {
    fail(`Discord a repondu ${response.status}`);
    return 1;
  }
  mkdirSync(logDir, { recursive: true });
  appendFileSync(sentFile, `${pr.url}\n`);
  ok(`PR annoncee: ${pr.url}`);
  return 0;
}
