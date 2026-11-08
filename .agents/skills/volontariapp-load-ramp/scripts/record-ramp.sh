#!/bin/bash
# Lance en arriere-plan les trois enregistreurs a demarrer AVANT que la rampe commence.
# Usage: record-ramp.sh <dossier de sortie> [nombre de releves de 5 s, defaut 360 (30 min)]
#   traefik.log  : histogramme de latence vu par Traefik (port-forward local 19100)
#   cpu.log      : kubectl top du nœud et des 30 pods les plus gourmands (tous les namespaces, plus la ligne SOMME-PODS)
#   disk.log     : lectures et ecritures disque par pod (disk-read-rate.py)
# Sur la VM (a la main, par ssh) : PSI et iostat, voir SKILL.md section Enregistreurs.
set -euo pipefail
OUT=${1:?dossier de sortie manquant}
N=${2:-360}
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT"

curl -s -m 3 -o /dev/null localhost:19100/metrics || {
  kubectl -n kube-system port-forward deploy/traefik 19100:9100 >/dev/null 2>&1 &
  sleep 3
}
nohup bash -c "for i in \$(seq 1 $N); do echo \"### \$(date -u +%H:%M:%S)\"; curl -s -m 4 localhost:19100/metrics | grep -E '^traefik_entrypoint_request_duration_seconds_(bucket|count|sum)\{code=\"200\",entrypoint=\"websecure\",method=\"GET\",protocol=\"http\"'; sleep 5; done" > "$OUT/traefik.log" 2>&1 &
nohup bash -c "for i in \$(seq 1 $N); do { echo \"### \$(date -u +%H:%M:%S)\"; kubectl top node --no-headers | awk '{print \"node\",\$2,\$3}'; kubectl top pods -A --no-headers | awk '{c=\$3; gsub(\"m\",\"\",c); s+=c; print c, \$1\"/\"\$2} END{print s, \"SOMME-PODS\"}' | sort -rn | head -30 | awk '{print \"pod\",\$2,\$1\"m\"}'; } >> \"$OUT/cpu.log\"; sleep 5; done" >/dev/null 2>&1 &
nohup python3 -W ignore "$HERE/disk-read-rate.py" $((N / 2)) > "$OUT/disk.log" 2>&1 &
echo "enregistreurs lances dans $OUT pour environ $((N * 5 / 60)) minutes"
