#!/usr/bin/env node
// Capture un profil CPU de N secondes d'un processus Node dont l'inspecteur ecoute.
//
// Usage : node capture-cpu-profile.mjs [secondes=30] [sortie] [hote:port=127.0.0.1:9229]
//   - secondes : entre 1 et 300 ;
//   - sortie   : fichier .cpuprofile (defaut profile-<horodatage>.cpuprofile dans le dossier courant) ;
//   - hote:port : par defaut la boucle locale. Ne vise qu'un port ouvert par kubectl port-forward.
//
// Aucune dependance : WebSocket et fetch natifs (Node 22 ou plus). Le profil se lit ensuite avec
// analyze-cpuprofile.mjs ou dans Chrome DevTools (onglet Performance, "Load profile").
import { writeFileSync } from 'node:fs';

const seconds = Number(process.argv[2] ?? 30);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = process.argv[3] ?? `profile-${stamp}.cpuprofile`;
const hostPort = process.argv[4] ?? '127.0.0.1:9229';

if (!Number.isFinite(seconds) || seconds < 1 || seconds > 300) {
  console.error('secondes doit etre un nombre entre 1 et 300');
  process.exit(2);
}

const targets = await fetch(`http://${hostPort}/json/list`)
  .then((response) => response.json())
  .catch((error) => {
    console.error(`inspecteur injoignable sur ${hostPort} : ${error.message}`);
    console.error('le pod a-t-il recu SIGUSR1 et le port-forward est-il lance ?');
    process.exit(1);
  });
const url = targets[0]?.webSocketDebuggerUrl;
if (!url) {
  console.error('aucune cible de debogage trouvee');
  process.exit(1);
}

const ws = new WebSocket(url);
let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const settle = message.id === undefined ? undefined : pending.get(message.id);
  if (settle) {
    pending.delete(message.id);
    settle(message);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, (message) =>
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result),
    );
    ws.send(JSON.stringify({ id, method, params }));
  });

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', () => reject(new Error('connexion WebSocket impossible')), {
    once: true,
  });
});

await send('Profiler.enable');
await send('Profiler.setSamplingInterval', { interval: 1000 }); // 1 ms
await send('Profiler.start');
console.error(`profil en cours pendant ${seconds} s ...`);
await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
const { profile } = await send('Profiler.stop');
ws.close();

writeFileSync(out, JSON.stringify(profile));
console.error(
  `ecrit : ${out} (${profile.nodes.length} noeuds, ${profile.samples.length} echantillons)`,
);
