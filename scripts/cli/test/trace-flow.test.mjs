import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEdges,
  escapeHtml,
  fetchSpans,
  fetchTraces,
  layerNodes,
  normalizeSpans,
  renderSankeyHtml,
  resolveAuth,
} from '../lib/trace-flow.mjs';

const span = (trace, id, service, parent) => ({ trace_id: trace, span_id: id, service, parent_id: parent });

describe('normalizeSpans', () => {
  it('lit la reponse brute de l\'API, un tableau plat et ignore les spans incomplets', () => {
    const raw = { data: [{ attributes: { trace_id: 't', span_id: '1', service: 'api-gateway', parent_id: '0' } }, { attributes: { trace_id: 't' } }] };
    assert.deepEqual(normalizeSpans(raw), [{ trace_id: 't', span_id: '1', parent_id: undefined, service: 'api-gateway' }]);
    assert.equal(normalizeSpans([span('t', '1', 'a')]).length, 1);
    assert.deepEqual(normalizeSpans(undefined), []);
  });
});

describe('buildEdges', () => {
  it('relie les services parent et enfant, y compris le saut asynchrone, par trace distincte', () => {
    const spans = [
      span('t1', '1', 'api-gateway'),
      span('t1', '2', 'ms-event', '1'),
      span('t1', '3', 'outbox-event', '2'),
      span('t1', '4', 'post-processor-ranking', '3'),
      span('t2', '5', 'api-gateway'),
      span('t2', '6', 'ms-event', '5'),
      span('t2', '7', 'ms-event', '6'),
    ];
    const { edges, orphans, traces } = buildEdges(spans);
    assert.deepEqual(
      edges.map((edge) => `${edge.source}>${edge.target}:${edge.traces}`),
      ['api-gateway>ms-event:2', 'ms-event>outbox-event:1', 'outbox-event>post-processor-ranking:1'],
    );
    assert.equal(orphans, 0);
    assert.equal(traces, 2);
  });

  it('compte un parent absent de l\'echantillon comme orphelin', () => {
    const { edges, orphans } = buildEdges([span('t', '2', 'ms-user', 'missing')]);
    assert.equal(edges.length, 0);
    assert.equal(orphans, 1);
  });
});

describe('layerNodes', () => {
  it('place les services en colonnes selon le plus long chemin', () => {
    const layers = layerNodes([
      { source: 'a', target: 'b', traces: 1 },
      { source: 'b', target: 'c', traces: 1 },
      { source: 'a', target: 'c', traces: 1 },
    ]);
    assert.deepEqual([layers.get('a'), layers.get('b'), layers.get('c')], [0, 1, 2]);
  });

  it('tolere un cycle sans boucler', () => {
    const layers = layerNodes([
      { source: 'a', target: 'b', traces: 1 },
      { source: 'b', target: 'a', traces: 1 },
    ]);
    assert.equal(layers.get('a'), 0);
    assert.equal(layers.get('b'), 1);
  });
});

describe('resolveAuth', () => {
  it('prefere DD_TOKEN, puis la paire de cles, puis une cle de type token', () => {
    assert.equal(resolveAuth({ DD_TOKEN: 'x', DD_API_KEY: 'y', DD_APP_KEY: 'z' }).mode, 'bearer');
    assert.deepEqual(resolveAuth({ DD_API_KEY: 'y', DD_APP_KEY: 'z' }).headers, { 'DD-API-KEY': 'y', 'DD-APPLICATION-KEY': 'z' });
    assert.equal(resolveAuth({ DD_API_KEY: 'ddpa123' }).headers.Authorization, 'Bearer ddpa123');
  });

  it('echoue clairement sans identifiants exploitables', () => {
    assert.throws(() => resolveAuth({ DD_API_KEY: 'abcdef' }), /identifiants Datadog manquants/);
    assert.throws(() => resolveAuth({}), /DD_TOKEN/);
  });
});

describe('fetchSpans', () => {
  const page = (traceId, after) => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [{ attributes: { trace_id: traceId, span_id: '1', service: 'a' } }], meta: { page: { after } } }),
  });
  const auth = { mode: 'bearer', headers: { Authorization: 'Bearer x' } };
  const base = { query: 'env:prod', from: 'now-1h', to: 'now', pageSize: 1, maxSpans: 5, site: 'us5.datadoghq.com', auth };

  it('suit le curseur jusqu\'a la derniere page', async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return calls.length === 1 ? page('t1', 'next') : page('t2', undefined);
    };
    const result = await fetchSpans({ ...base, fetchImpl });
    assert.equal(result.spans.length, 2);
    assert.equal(result.requests, 2);
    assert.equal(result.truncated, false);
    assert.equal(calls[0].url, 'https://api.us5.datadoghq.com/api/v2/spans/events/search');
    assert.equal(calls[0].body.data.attributes.page.cursor, undefined);
    assert.equal(calls[1].body.data.attributes.page.cursor, 'next');
  });

  it('signale la troncature quand maxSpans est atteint avec un curseur restant', async () => {
    const result = await fetchSpans({ ...base, maxSpans: 1, fetchImpl: async () => page('t1', 'next') });
    assert.equal(result.truncated, true);
  });

  it('remonte une erreur lisible sur 403 et sur 429', async () => {
    const forbidden = async () => ({ ok: false, status: 403, text: async () => 'Forbidden' });
    await assert.rejects(fetchSpans({ ...base, fetchImpl: forbidden }), /403 \(bearer\)/);
    const limited = async () => ({ ok: false, status: 429, headers: new Headers({ 'x-ratelimit-reset': '3' }), text: async () => '' });
    await assert.rejects(fetchSpans({ ...base, fetchImpl: limited, sleep: async () => {} }), /5 requetes par minute/);
  });

  it('attend la fin de la fenetre apres un 429 puis reessaie', async () => {
    const waits = [];
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 429, headers: new Headers({ 'x-ratelimit-reset': '7' }), text: async () => '' };
      return page('t1', undefined);
    };
    const result = await fetchSpans({ ...base, fetchImpl, sleep: async (ms) => waits.push(ms) });
    assert.equal(result.spans.length, 1);
    assert.deepEqual(waits, [8000]);
  });

  it('patiente quand il ne reste plus de requetes dans la fenetre', async () => {
    const waits = [];
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '10' }),
      json: async () => ({ data: [], meta: {} }),
    });
    await fetchSpans({ ...base, fetchImpl, sleep: async (ms) => waits.push(ms) });
    assert.deepEqual(waits, [11000]);
  });
});

describe('fetchTraces', () => {
  const attrs = (trace, id, service, parent, status) => ({ attributes: { trace_id: trace, span_id: id, service, parent_id: parent ?? '0', ...(status ? { status } : {}) } });
  const auth = { mode: 'bearer', headers: {} };

  it('garde les traces dont un span async a un parent puis recupere tous leurs spans par lots', async () => {
    const queries = [];
    const fetchImpl = async (url, init) => {
      const query = JSON.parse(init.body).data.attributes.filter.query;
      queries.push(query);
      if (query.includes('operation_name:(Consumer')) {
        return { ok: true, status: 200, json: async () => ({ data: [attrs('t1', '3', 'outbox-event', '2'), attrs('sched', '9', 'worker-ranking')], meta: {} }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: [attrs('t1', '1', 'api-gateway'), attrs('t1', '2', 'ms-event', '1'), attrs('t1', '3', 'outbox-event', '2', 'error')], meta: {} }),
      };
    };
    const result = await fetchTraces({
      seedQuery: 'env:prod operation_name:(Consumer OR Producer)', baseQuery: 'env:prod', expandFilter: '-operation_name:Internal',
      from: 'now-1h', to: 'now', seedSpans: 100, maxTraces: 10, chunkSize: 5, pageSize: 100, site: 'us5.datadoghq.com', auth, fetchImpl, sleep: async () => {},
    });
    assert.equal(result.seedTraces, 1);
    assert.equal(queries.length, 2);
    assert.equal(queries[1], 'env:prod -operation_name:Internal trace_id:(t1)');
    const { edges } = buildEdges(result.spans);
    assert.deepEqual(edges.map((edge) => `${edge.source}>${edge.target}:${edge.traces}/${edge.errors}`), [
      'api-gateway>ms-event:1/0',
      'ms-event>outbox-event:1/1',
    ]);
  });

  it('decoupe les traces en lots de la taille demandee', async () => {
    let expansions = 0;
    const fetchImpl = async (url, init) => {
      const query = JSON.parse(init.body).data.attributes.filter.query;
      if (query.includes('operation_name:(Consumer')) {
        const data = ['a', 'b', 'c'].map((trace) => attrs(trace, '2', 'outbox-event', '1'));
        return { ok: true, status: 200, json: async () => ({ data, meta: {} }) };
      }
      expansions += 1;
      return { ok: true, status: 200, json: async () => ({ data: [], meta: {} }) };
    };
    await fetchTraces({
      seedQuery: 'env:prod operation_name:(Consumer OR Producer)', baseQuery: 'env:prod', expandFilter: '',
      from: 'now-1h', to: 'now', seedSpans: 100, maxTraces: 10, chunkSize: 2, pageSize: 100, site: 'us5.datadoghq.com', auth, fetchImpl, sleep: async () => {},
    });
    assert.equal(expansions, 2);
  });
});

describe('renderSankeyHtml', () => {
  const meta = { generatedAt: 'now', query: 'env:prod', from: 'now-24h', to: 'now', truncated: false };

  it('dessine un lien et deux noeuds et echappe les noms de service', () => {
    const graph = buildEdges([span('t', '1', '<script>'), span('t', '2', 'ms-user', '1')]);
    const html = renderSankeyHtml(graph, meta);
    assert.match(html, /<path class="link /);
    assert.equal((html.match(/<rect class="node/g) ?? []).length, 2);
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it('affiche un message quand il n\'y a aucun lien', () => {
    assert.match(renderSankeyHtml(buildEdges([]), meta), /Aucun lien/);
  });

  it('escapeHtml neutralise les caracteres speciaux', () => {
    assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});
