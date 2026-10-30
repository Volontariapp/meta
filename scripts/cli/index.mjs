#!/usr/bin/env node
import { bumpCommand } from './commands/bump.mjs';
import { certsCommand } from './commands/certs.mjs';
import { addPackageCommand, auditCommand, fixPeersCommand, ideCommand, runAllCommand } from './commands/foreach.mjs';
import { doctorCommand } from './commands/doctor.mjs';
import { downCommand, nukeDbCommand, upCommand } from './commands/infra.mjs';
import { manifestCommand } from './commands/manifest.mjs';
import { migrateCommand } from './commands/migrate.mjs';
import { notifyPrCommand } from './commands/pr.mjs';
import { reposCommand } from './commands/repos.mjs';
import { setupCommand } from './commands/setup.mjs';
import { logsCommand, startCommand } from './commands/start.mjs';
import { syncMigrationsCommand } from './commands/sync-migrations.mjs';
import { traceFlowCommand } from './commands/trace-flow.mjs';
import { workspacesCommand } from './commands/workspaces.mjs';
import { bold, dim, fail } from './lib/log.mjs';

/**
 * @typedef {{ summary: string, run: (args: string[]) => Promise<number> }} Command
 * @type {Record<string, Command>}
 */
export const COMMANDS = {
  setup: { summary: 'Installation complete (clone, deps, certs, infra, migrations) [--yes --ssh --skip-infra --skip-migrations --build-packages]', run: setupCommand },
  doctor: { summary: 'Verifie les prerequis de la machine', run: () => doctorCommand() },
  up: { summary: 'Demarre l\'infra Docker locale et attend qu\'elle soit saine', run: upCommand },
  down: { summary: 'Arrete l\'infra Docker locale (volumes conserves)', run: downCommand },
  start: { summary: 'start [profil] [--env local|dev|test|prod] [--delay ms]', run: startCommand },
  logs: { summary: 'logs <unite> [--lines N]', run: logsCommand },
  migrate: { summary: 'migrate [--all | --services user,post] [--env local]', run: migrateCommand },
  certs: { summary: 'Genere et distribue les cles RSA [--force]', run: certsCommand },
  repos: { summary: 'repos list|status [--fetch] | sync|rebase [--autostash]', run: reposCommand },
  'sync-migrations': { summary: 'Copie les migrations des ms vers npm-packages [--packages user,post] [--pr : branche, changeset, PR, puis arret]', run: syncMigrationsCommand },
  bump: { summary: 'Ouvre une PR par consommateur apres publication CI [--only repo,repo] [--dry-run]', run: bumpCommand },
  'notify-pr': { summary: 'notify-pr <repo> <numero> : annonce sur Discord si CI verte et sans conflit', run: notifyPrCommand },
  run: { summary: 'run <script> [--profile p] [--with-packages] : lance build, lint ou test dans chaque unite', run: runAllCommand },
  'add-package': { summary: 'add-package <paquet[@version]> --to repo,repo', run: addPackageCommand },
  'fix-peers': { summary: 'Nettoie et complete les peerDependencies des repos applicatifs', run: () => fixPeersCommand() },
  audit: { summary: 'Rapport de vulnerabilites high/critical (lecture seule)', run: () => auditCommand() },
  ide: { summary: 'ide <cursor|code|idea|antigravity> <filtre> : ouvre un workspace', run: ideCommand },
  workspaces: { summary: 'Regenere .workspaces/*.code-workspace depuis presets.json [--check]', run: workspacesCommand },
  manifest: { summary: 'Valide repos.json et sa coherence avec .gitignore', run: () => manifestCommand() },
  'trace-flow': { summary: 'Sankey des flux entre services depuis les spans Datadog [--input spans.json --out f.html --query env:prod --from now-24h --max-traces 100 --chunk 10]', run: traceFlowCommand },
  'nuke-db': { summary: 'Supprime les volumes de donnees locaux (--yes obligatoire)', run: nukeDbCommand },
};

function printHelp() {
  console.log(`${bold('meta')} : CLI d'orchestration du workspace Volontariapp\n`);
  console.log('Usage: yarn meta <commande> [options]   (ou: ./root.sh <commande>)\n');
  for (const [name, command] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(10)} ${dim(command.summary)}`);
  }
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const [name, ...args] = argv;
  if (name === undefined || name === '--help' || name === '-h' || name === 'help') {
    printHelp();
    return 0;
  }
  const command = COMMANDS[name];
  if (command === undefined) {
    fail(`commande inconnue: ${name}`);
    printHelp();
    return 2;
  }
  return command.run(args);
}

process.exitCode = await main(process.argv.slice(2)).catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
  return 1;
});
