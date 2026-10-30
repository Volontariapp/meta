import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fail, info, ok, warn } from '../lib/log.mjs';
import { buildEdges, fetchTraces, normalizeSpans, renderSankeyHtml, resolveAuth } from '../lib/trace-flow.mjs';

/**
 * @param {string[]} args
 * @param {string} name
 * @param {string} fallback
 */
export function flag(args, name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
}

/**
 * Genere une page Sankey des flux entre services a partir des spans Datadog (ou d'un export local).
 * Lecture seule : n'ecrit que le fichier de sortie. L'API de spans autorise 5 requetes par minute :
 * `--max-traces 100 --chunk 10` coute 11 requetes, soit environ 2 minutes.
 * @param {string[]} args
 * @returns {Promise<number>}
 */
export async function traceFlowCommand(args) {
  const out = resolve(flag(args, '--out', 'trace-flow.html'));
  const query = flag(args, '--query', 'env:prod');
  const from = flag(args, '--from', 'now-24h');
  const to = flag(args, '--to', 'now');
  const seedSpans = Number(flag(args, '--max-spans', '1000'));
  const maxTraces = Number(flag(args, '--max-traces', '100'));
  const chunkSize = Number(flag(args, '--chunk', '10'));
  const pageSize = Number(flag(args, '--page-size', '1000'));
  const numbers = [seedSpans, maxTraces, chunkSize, pageSize];
  if (numbers.some((value) => !Number.isInteger(value) || value <= 0)) {
    fail('--max-spans, --max-traces, --chunk et --page-size doivent etre des entiers positifs');
    return 2;
  }

  const input = flag(args, '--input', '');
  let spans;
  let truncated = false;
  if (input !== '') {
    spans = normalizeSpans(JSON.parse(readFileSync(resolve(input), 'utf8')));
    info(`${spans.length} span(s) lus depuis ${input}`);
  } else {
    let auth;
    try {
      auth = resolveAuth(process.env);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
      return 1;
    }
    const site = flag(args, '--site', process.env.DD_SITE ?? 'us5.datadoghq.com');
    const seedQuery = flag(args, '--seed-query', `${query} operation_name:(Consumer OR Producer)`);
    const expandFilter = flag(args, '--expand-filter', '');
    info(`phase 1 : ${seedQuery} (${from} a ${to}) sur ${site}, authentification ${auth.mode}`);
    const result = await fetchTraces({
      seedQuery, baseQuery: query, expandFilter, from, to, seedSpans, maxTraces, chunkSize, pageSize, site, auth,
      onProgress: (message) => info(message),
    });
    spans = result.spans;
    truncated = result.truncatedChunks > 0;
    info(`${spans.length} span(s) pour ${result.seedTraces} trace(s), ${result.requests} requete(s)`);
    if (truncated) warn(`${result.truncatedChunks} lot(s) de traces depassent une page de spans : certains parents peuvent manquer (baisser --chunk)`);
  }

  const graph = buildEdges(spans);
  const html = renderSankeyHtml(graph, { generatedAt: new Date().toISOString(), query, from, to, truncated });
  writeFileSync(out, html);
  ok(`${graph.edges.length} lien(s) entre services, ${graph.traces} trace(s) : ${out}`);
  if (graph.orphans > 0) warn(`${graph.orphans} span(s) dont le parent n'est pas dans l'echantillon (ignores)`);
  return 0;
}
