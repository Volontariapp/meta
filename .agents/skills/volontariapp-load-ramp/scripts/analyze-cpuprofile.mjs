#!/usr/bin/env node
// Resume un fichier .cpuprofile : part du temps CPU par famille, puis les fonctions les plus chaudes.
//
// Usage : node analyze-cpuprofile.mjs <fichier.cpuprofile> [nombre-de-fonctions=20]
//
// Le temps "propre" (self) d'une fonction est le temps passe dans son corps, sans ses appelees.
// Les pourcentages sont calcules sur le temps occupe (le temps "idle" est exclu et affiche a part).
// Les familles servent a repondre a une question : le CPU part-il dans notre code, ou dans Node et
// ses bibliotheques (gRPC, JSON, ramasse-miettes, HTTP) ?
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const topCount = Number(process.argv[3] ?? 20);
if (!file) {
  console.error('usage : node analyze-cpuprofile.mjs <fichier.cpuprofile> [nombre-de-fonctions]');
  process.exit(2);
}

const profile = JSON.parse(readFileSync(file, 'utf8'));
const nodesById = new Map(profile.nodes.map((node) => [node.id, node]));

/** Famille d'un cadre d'appel, d'apres le nom de la fonction et son URL. */
function family(callFrame) {
  const name = callFrame.functionName;
  const url = callFrame.url;
  if (name === '(garbage collector)') return 'ramasse-miettes (GC)';
  if (name === '(program)') return 'natif / systeme (program)';
  if (name === '(root)') return 'racine';
  if (url.includes('/node_modules/@grpc/grpc-js/')) return 'gRPC (grpc-js)';
  if (
    url.includes('/node_modules/protobufjs/') ||
    url.includes('/node_modules/@protobufjs/') ||
    url.includes('/node_modules/@volontariapp/contracts')
  ) {
    return 'protobuf (encodage, decodage)';
  }
  if (url.includes('/node_modules/jose/') || url.startsWith('node:internal/crypto')) {
    return 'JWT et cryptographie';
  }
  if (
    url.includes('/node_modules/class-validator/') ||
    url.includes('/node_modules/class-transformer/')
  ) {
    return 'validation et DTO (class-validator, class-transformer)';
  }
  if (url.includes('/node_modules/@volontariapp/logger/')) return 'logger (@volontariapp/logger)';
  if (url.startsWith('node:internal/console') || name === 'log' || name === 'writeOrBuffer') {
    return 'console et ecriture des journaux';
  }
  if (url.includes('/node_modules/typeorm/')) return 'TypeORM';
  if (
    url.includes('/node_modules/pg/') ||
    url.includes('/node_modules/pg-protocol/') ||
    url.includes('/node_modules/pg-types/') ||
    url.includes('/node_modules/postgres-date/')
  ) {
    return 'PostgreSQL (pg)';
  }
  if (url.includes('/node_modules/neo4j-driver')) return 'Neo4j (neo4j-driver)';
  if (url.includes('/node_modules/@opentelemetry/')) return 'OpenTelemetry';
  if (url.includes('/node_modules/rxjs/')) return 'rxjs';
  if (url.includes('/node_modules/@nestjs/')) return 'Nest (framework)';
  if (
    url.includes('/node_modules/express/') ||
    url.includes('/node_modules/router/') ||
    url.includes('/node_modules/body-parser/') ||
    url.includes('/node_modules/qs/')
  ) {
    return 'Express (HTTP)';
  }
  if (
    url.startsWith('node:internal/http') ||
    url.startsWith('node:_http') ||
    url.startsWith('node:http') ||
    url.startsWith('node:net') ||
    url.startsWith('node:internal/stream') ||
    url.startsWith('node:internal/streams') ||
    url.startsWith('node:internal/js_stream')
  ) {
    return 'Node : HTTP, reseau, flux';
  }
  if (url.startsWith('node:')) return 'Node : autre interne';
  if (url.includes('/node_modules/@volontariapp/')) return 'autres paquets @volontariapp';
  if (url.includes('/node_modules/')) return 'autres dependances';
  if (url === '') return 'natif / sans source';
  return 'notre code (application)';
}

// Temps propre par noeud, en microsecondes.
const selfByNode = new Map();
let total = 0;
for (let i = 0; i < profile.samples.length; i += 1) {
  const delta = profile.timeDeltas[i] ?? 0;
  selfByNode.set(profile.samples[i], (selfByNode.get(profile.samples[i]) ?? 0) + delta);
  total += delta;
}

let idle = 0;
const byFamily = new Map();
const byFunction = new Map();
for (const [id, micros] of selfByNode) {
  const frame = nodesById.get(id).callFrame;
  if (frame.functionName === '(idle)') {
    idle += micros;
    continue;
  }
  const fam = family(frame);
  byFamily.set(fam, (byFamily.get(fam) ?? 0) + micros);
  const key = `${frame.functionName || '(anonyme)'} ${frame.url.replace(/^.*node_modules\//, '')}:${frame.lineNumber + 1}`;
  const entry = byFunction.get(key) ?? { micros: 0, fam };
  entry.micros += micros;
  byFunction.set(key, entry);
}

const busy = total - idle;
const pct = (micros) => `${((micros / busy) * 100).toFixed(1).padStart(5)} %`;
const ms = (micros) => `${(micros / 1000).toFixed(0).padStart(7)} ms`;

console.log(`fichier : ${file}`);
console.log(
  `duree echantillonnee : ${(total / 1e6).toFixed(1)} s, occupe : ${(busy / 1e6).toFixed(1)} s (${((busy / total) * 100).toFixed(0)} %), idle : ${(idle / 1e6).toFixed(1)} s`,
);
console.log('\nPart du temps occupe, par famille :');
for (const [fam, micros] of [...byFamily].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${pct(micros)} ${ms(micros)}  ${fam}`);
}
console.log(`\nLes ${topCount} fonctions les plus chaudes (temps propre) :`);
for (const [key, { micros, fam }] of [...byFunction].sort((a, b) => b[1].micros - a[1].micros).slice(0, topCount)) {
  console.log(`  ${pct(micros)} ${ms(micros)}  [${fam}]  ${key}`);
}
