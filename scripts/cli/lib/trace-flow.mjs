/**
 * @typedef {{ trace_id: string, span_id: string, parent_id?: string, service?: string, error?: boolean }} Span
 * @typedef {{ source: string, target: string, traces: number, errors: number }} Edge
 * @typedef {{ mode: 'bearer' | 'keys', headers: Record<string, string> }} Auth
 */

const NO_PARENT = new Set(['', '0', 'undefined', 'null']);

/**
 * Accepte un tableau de spans, la reponse brute de l'API (`{ data: [{ attributes }] }`) ou un export
 * dont chaque element porte directement les champs. Ignore les spans sans trace, span ou service.
 * @param {unknown} payload
 * @returns {Span[]}
 */
export function normalizeSpans(payload) {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  /** @type {Span[]} */
  const spans = [];
  for (const item of items) {
    const attributes = item?.attributes ?? item;
    const traceId = attributes?.trace_id;
    const spanId = attributes?.span_id;
    const service = attributes?.service;
    if (typeof traceId !== 'string' || typeof spanId !== 'string' || typeof service !== 'string') continue;
    const parent = attributes.parent_id === undefined || attributes.parent_id === null ? '' : String(attributes.parent_id);
    spans.push({
      trace_id: traceId,
      span_id: spanId,
      parent_id: NO_PARENT.has(parent) ? undefined : parent,
      service,
      ...(attributes.status === 'error' ? { error: true } : {}),
    });
  }
  return spans;
}

/**
 * Une arete relie le service d'un span parent a celui de son enfant quand ils different. Sa valeur est le
 * nombre de traces distinctes qui l'empruntent. Un enfant dont le parent n'est pas dans l'echantillon est
 * compte comme orphelin.
 * @param {Span[]} spans
 * @returns {{ edges: Edge[], orphans: number, spans: number, traces: number }}
 */
export function buildEdges(spans) {
  const serviceBySpan = new Map(spans.map((span) => [`${span.trace_id}:${span.span_id}`, span.service]));
  /** @type {Map<string, { source: string, target: string, traces: Set<string>, errors: Set<string> }>} */
  const byPair = new Map();
  let orphans = 0;
  for (const span of spans) {
    if (span.parent_id === undefined) continue;
    const parentService = serviceBySpan.get(`${span.trace_id}:${span.parent_id}`);
    if (parentService === undefined) {
      orphans += 1;
      continue;
    }
    if (parentService === span.service) continue;
    const key = `${parentService}\u0000${span.service}`;
    const entry = byPair.get(key) ?? { source: parentService, target: String(span.service), traces: new Set(), errors: new Set() };
    entry.traces.add(span.trace_id);
    if (span.error === true) entry.errors.add(span.trace_id);
    byPair.set(key, entry);
  }
  const edges = [...byPair.values()]
    .map((entry) => ({ source: entry.source, target: entry.target, traces: entry.traces.size, errors: entry.errors.size }))
    .sort((a, b) => b.traces - a.traces || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  return { edges, orphans, spans: spans.length, traces: new Set(spans.map((span) => span.trace_id)).size };
}

/**
 * Assigne une colonne a chaque service : le plus long chemin depuis une source. Les aretes qui
 * refermeraient un cycle sont ignorees pour le placement (elles restent dessinees).
 * @param {Edge[]} edges
 * @returns {Map<string, number>}
 */
export function layerNodes(edges) {
  const nodes = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const incoming = new Set(edges.map((edge) => edge.target));
  const roots = [...nodes].filter((node) => !incoming.has(node)).sort();
  const order = [...roots, ...[...nodes].filter((node) => incoming.has(node)).sort()];
  /** @type {Map<string, Edge[]>} */
  const outgoing = new Map();
  for (const edge of edges) outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);

  /** @type {Map<string, 1 | 2>} */
  const state = new Map();
  /** @type {Edge[]} */
  const kept = [];
  const visit = (node) => {
    state.set(node, 1);
    for (const edge of outgoing.get(node) ?? []) {
      const targetState = state.get(edge.target);
      if (targetState === 1) continue;
      kept.push(edge);
      if (targetState === undefined) visit(edge.target);
    }
    state.set(node, 2);
  };
  for (const node of order) if (!state.has(node)) visit(node);

  const layers = new Map([...nodes].map((node) => [node, 0]));
  for (let pass = 0; pass < nodes.size; pass += 1) {
    let changed = false;
    for (const edge of kept) {
      const next = (layers.get(edge.source) ?? 0) + 1;
      if (next > (layers.get(edge.target) ?? 0)) {
        layers.set(edge.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return layers;
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Auth}
 */
export function resolveAuth(env) {
  const token = env.DD_TOKEN;
  if (token) return { mode: 'bearer', headers: { Authorization: `Bearer ${token}` } };
  const apiKey = env.DD_API_KEY;
  const appKey = env.DD_APP_KEY;
  if (apiKey && appKey) return { mode: 'keys', headers: { 'DD-API-KEY': apiKey, 'DD-APPLICATION-KEY': appKey } };
  if (apiKey && apiKey.startsWith('ddpa')) {
    return { mode: 'bearer', headers: { Authorization: `Bearer ${apiKey}` } };
  }
  throw new Error('identifiants Datadog manquants : definir DD_TOKEN, ou DD_API_KEY et DD_APP_KEY (lecture des traces, droit apm_read)');
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Une requete de recherche. L'API de spans autorise 5 requetes par minute (en-tetes `x-ratelimit-*`) :
 * on attend la fin de la fenetre quand il n'en reste plus, et on retente apres un 429.
 * @param {{ url: string, body: unknown, auth: Auth, fetchImpl: typeof fetch, sleep: (ms: number) => Promise<void> }} options
 */
async function postSearch({ url, body, auth, fetchImpl, sleep }) {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...auth.headers },
      body: JSON.stringify(body),
    });
    const resetSeconds = Number(response.headers?.get?.('x-ratelimit-reset') ?? 0);
    const remaining = response.headers?.get?.('x-ratelimit-remaining');
    if (response.status === 429) {
      if (attempt >= 4) throw new Error('limite de debit Datadog atteinte (5 requetes par minute), reessayer plus tard ou baisser --max-traces');
      await sleep(((Number.isFinite(resetSeconds) && resetSeconds > 0 ? resetSeconds : 15) + 1) * 1000);
      continue;
    }
    if (!response.ok) {
      const text = (await response.text()).slice(0, 300);
      throw new Error(`Datadog a repondu ${response.status} (${auth.mode}) : ${text}`);
    }
    const json = await response.json();
    if (remaining === '0' && resetSeconds > 0) await sleep((resetSeconds + 1) * 1000);
    return json;
  }
}

/**
 * Pagine l'API de recherche de spans jusqu'a epuisement ou `maxSpans`.
 * @param {{
 *   query: string, from: string, to: string, pageSize: number, maxSpans: number,
 *   site: string, auth: Auth, sort?: string, fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>,
 * }} options
 * @returns {Promise<{ spans: Span[], requests: number, truncated: boolean }>}
 */
export async function fetchSpans({ query, from, to, pageSize, maxSpans, site, auth, sort = '-timestamp', fetchImpl = fetch, sleep = defaultSleep }) {
  const url = `https://api.${site}/api/v2/spans/events/search`;
  /** @type {Span[]} */
  const spans = [];
  let cursor;
  let requests = 0;
  for (;;) {
    const body = {
      data: {
        type: 'search_request',
        attributes: {
          filter: { query, from, to },
          sort,
          page: { limit: Math.min(pageSize, maxSpans - spans.length), ...(cursor === undefined ? {} : { cursor }) },
        },
      },
    };
    const json = await postSearch({ url, body, auth, fetchImpl, sleep });
    requests += 1;
    spans.push(...normalizeSpans(json));
    cursor = json?.meta?.page?.after;
    if (cursor === undefined || cursor === null || spans.length >= maxSpans) {
      return { spans, requests, truncated: cursor !== undefined && cursor !== null };
    }
  }
}

/**
 * Deux phases. 1) chercher les spans de saut asynchrone (`seedQuery`) et garder les traces ou l'un d'eux
 * a un parent : une tache planifiee, racine de sa propre trace, n'apporte aucun lien. 2) recuperer tous
 * les spans de ces traces par lots, pour que les parents soient presents.
 * @param {{
 *   seedQuery: string, baseQuery: string, expandFilter: string, from: string, to: string, seedSpans: number,
 *   maxTraces: number, chunkSize: number, pageSize: number, site: string, auth: Auth,
 *   fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>, onProgress?: (message: string) => void,
 * }} options
 * @returns {Promise<{ spans: Span[], requests: number, seedTraces: number, truncatedChunks: number }>}
 */
export async function fetchTraces(options) {
  const { seedQuery, baseQuery, expandFilter, from, to, seedSpans, maxTraces, chunkSize, pageSize, site, auth, fetchImpl, sleep, onProgress = () => {} } = options;
  const seed = await fetchSpans({ query: seedQuery, from, to, pageSize, maxSpans: seedSpans, site, auth, fetchImpl, sleep });
  let requests = seed.requests;
  const traceIds = [...new Set(seed.spans.filter((span) => span.parent_id !== undefined).map((span) => span.trace_id))].slice(0, maxTraces);
  onProgress(`phase 1 : ${seed.spans.length} span(s) async, ${traceIds.length} trace(s) retenue(s)`);

  /** @type {Map<string, Span>} */
  const kept = new Set(traceIds);
  const merged = new Map(seed.spans.filter((span) => kept.has(span.trace_id)).map((span) => [`${span.trace_id}:${span.span_id}`, span]));
  let truncatedChunks = 0;
  for (let index = 0; index < traceIds.length; index += chunkSize) {
    const chunk = traceIds.slice(index, index + chunkSize);
    const query = `${baseQuery} ${expandFilter} trace_id:(${chunk.join(' OR ')})`.replace(/\s+/g, ' ').trim();
    const page = await fetchSpans({ query, from, to, pageSize, maxSpans: pageSize, site, auth, fetchImpl, sleep });
    requests += page.requests;
    if (page.truncated) truncatedChunks += 1;
    for (const span of page.spans) merged.set(`${span.trace_id}:${span.span_id}`, span);
    onProgress(`phase 2 : ${Math.min(index + chunkSize, traceIds.length)}/${traceIds.length} trace(s)`);
  }
  return { spans: [...merged.values()], requests, seedTraces: traceIds.length, truncatedChunks };
}

/** @param {string} service */
export function familyOf(service) {
  if (service === 'api-gateway') return 'edge';
  if (service === 'ws-service') return 'edge';
  if (service.startsWith('ms-')) return 'ms';
  if (service.startsWith('outbox-')) return 'outbox';
  if (service.startsWith('post-processor-')) return 'post';
  if (service.startsWith('worker-')) return 'worker';
  return 'other';
}

/** @param {string} text */
export const escapeHtml = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const FAMILY_LABELS = { edge: 'Edge', ms: 'Microservices', outbox: 'Outbox', post: 'Post-processors', worker: 'Workers', other: 'Autres' };

/**
 * Page HTML autonome (SVG statique, aucun script) : un Sankey par service, epaisseur = nombre de traces.
 * @param {{ edges: Edge[], orphans: number, spans: number, traces: number }} graph
 * @param {{ generatedAt: string, query: string, from: string, to: string, truncated: boolean }} meta
 * @returns {string}
 */
export function renderSankeyHtml(graph, meta) {
  const { edges } = graph;
  const layers = layerNodes(edges);
  const columnCount = Math.max(1, ...[...layers.values()].map((layer) => layer + 1));
  const width = 1500;
  const height = 900;
  const marginX = 170;
  const marginY = 30;
  const nodeWidth = 14;
  const gap = 12;

  /** @type {Map<string, { in: number, out: number }>} */
  const flow = new Map();
  for (const edge of edges) {
    const source = flow.get(edge.source) ?? { in: 0, out: 0 };
    source.out += edge.traces;
    flow.set(edge.source, source);
    const target = flow.get(edge.target) ?? { in: 0, out: 0 };
    target.in += edge.traces;
    flow.set(edge.target, target);
  }
  const valueOf = (node) => Math.max(flow.get(node)?.in ?? 0, flow.get(node)?.out ?? 0);

  /** @type {string[][]} */
  const columns = Array.from({ length: columnCount }, () => []);
  for (const [node, layer] of layers) columns[layer].push(node);
  for (const column of columns) column.sort((a, b) => valueOf(b) - valueOf(a) || a.localeCompare(b));

  const scale = Math.min(
    ...columns
      .filter((column) => column.length > 0)
      .map((column) => (height - 2 * marginY - gap * (column.length - 1)) / column.reduce((sum, node) => sum + valueOf(node), 0)),
    40,
  );
  const columnX = (index) => marginX + (columnCount === 1 ? 0 : (index * (width - 2 * marginX - nodeWidth)) / (columnCount - 1));

  /** @type {Map<string, { x: number, y: number, h: number, outAt: number, inAt: number }>} */
  const position = new Map();
  columns.forEach((column, index) => {
    let y = marginY;
    for (const node of column) {
      const h = Math.max(2, valueOf(node) * scale);
      position.set(node, { x: columnX(index), y, h, outAt: 0, inAt: 0 });
      y += h + gap;
    }
  });

  const links = [...edges]
    .sort((a, b) => (position.get(a.target)?.y ?? 0) - (position.get(b.target)?.y ?? 0))
    .map((edge) => {
      const from = position.get(edge.source);
      const to = position.get(edge.target);
      if (from === undefined || to === undefined) return '';
      const thickness = Math.max(1, edge.traces * scale);
      const y0 = from.y + from.outAt + thickness / 2;
      const y1 = to.y + to.inAt + thickness / 2;
      from.outAt += thickness;
      to.inAt += thickness;
      const x0 = from.x + nodeWidth;
      const x1 = to.x;
      const mid = (x0 + x1) / 2;
      const label = `${escapeHtml(edge.source)} vers ${escapeHtml(edge.target)} : ${edge.traces} trace(s), ${edge.errors} en erreur`;
      return `<path class="link ${edge.errors > 0 ? 'err' : familyOf(edge.source)}" d="M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1}" stroke-width="${thickness}"><title>${label}</title></path>`;
    })
    .join('\n    ');

  const nodes = [...position]
    .map(([node, p]) => {
      const lastColumn = (layers.get(node) ?? 0) === columnCount - 1 && columnCount > 1;
      const textX = lastColumn ? p.x - 6 : p.x + nodeWidth + 6;
      const anchor = lastColumn ? 'end' : 'start';
      const name = escapeHtml(node);
      return `<g><rect class="node ${familyOf(node)}" x="${p.x}" y="${p.y}" width="${nodeWidth}" height="${p.h}"><title>${name} : ${valueOf(node)} trace(s)</title></rect><text x="${textX}" y="${p.y + p.h / 2}" text-anchor="${anchor}" dominant-baseline="middle">${name}</text></g>`;
    })
    .join('\n    ');

  const legend = Object.entries(FAMILY_LABELS)
    .map(([family, label]) => `<span class="chip"><i class="swatch ${family}"></i>${label}</span>`)
    .join('') + '<span class="chip"><i class="swatch" style="background:#d64545"></i>Lien avec erreur</span>';
  const empty = edges.length === 0 ? '<p class="warn">Aucun lien de service a service dans cet echantillon.</p>' : '';
  const truncated = meta.truncated ? '<p class="warn">Echantillon tronque : la limite de spans a ete atteinte, les volumes sont partiels. Augmenter --max-spans ou reduire la fenetre.</p>' : '';

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flux des traces</title>
<style>
  :root { --bg: #fbfbfa; --fg: #1d1d1b; --muted: #6b6b66; --edge: #6d5bd0; --ms: #2c7be5; --outbox: #d9822b; --post: #2f9e6f; --worker: #c2467a; --other: #8a8a85; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1c1c1e; --fg: #ececea; --muted: #a0a09a; --edge: #9a8cf0; --ms: #5b9bf0; --outbox: #f0a050; --post: #50c490; --worker: #e070a0; --other: #a0a09a; } }
  body { margin: 0; padding: 16px; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: var(--muted); margin: 0 0 12px; }
  .warn { color: var(--outbox); }
  .chip { margin-right: 14px; white-space: nowrap; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; }
  svg { width: 100%; height: auto; max-width: ${width}px; }
  text { fill: var(--fg); font-size: 12px; }
  .link { fill: none; stroke-opacity: 0.35; }
  .link:hover { stroke-opacity: 0.7; }
  .edge { stroke: var(--edge); fill: var(--edge); background: var(--edge); } .ms { stroke: var(--ms); fill: var(--ms); background: var(--ms); }
  .outbox { stroke: var(--outbox); fill: var(--outbox); background: var(--outbox); } .post { stroke: var(--post); fill: var(--post); background: var(--post); }
  .worker { stroke: var(--worker); fill: var(--worker); background: var(--worker); } .other { stroke: var(--other); fill: var(--other); background: var(--other); }
  .link.err { stroke: #d64545; stroke-opacity: 0.6; }
  .link.edge, .link.ms, .link.outbox, .link.post, .link.worker, .link.other { fill: none; }
</style>
</head>
<body>
<h1>Flux des traces entre services</h1>
<p class="meta">${escapeHtml(meta.query)} | ${escapeHtml(meta.from)} a ${escapeHtml(meta.to)} | ${graph.traces} trace(s), ${graph.spans} span(s), ${graph.orphans} span(s) sans parent dans l'echantillon | genere le ${escapeHtml(meta.generatedAt)}</p>
<p>${legend}</p>
${truncated}${empty}
<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Diagramme Sankey des flux entre services">
  <g>
    ${links}
  </g>
  <g>
    ${nodes}
  </g>
</svg>
</body>
</html>
`;
}
