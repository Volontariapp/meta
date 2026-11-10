#!/bin/bash
# Enregistreur des flux asynchrones pendant une rampe qui ecrit (lecture seule sur Redis).
# Usage: async-recorder.sh <dossier de sortie> [nombre de releves de 10 s, defaut 180 (30 min)] [--once]
# Ecrit async.log, une section par releve :
#   group <stream> <groupe> pending=<n> behind_ms=<n>
#     pending : livres non acquittes ; behind_ms : age du dernier message genere moins celui du
#     dernier livre au groupe (0 = a jour). Le champ `lag` de XINFO n'est pas fiable ici : il reste
#     non nul sur des groupes a jour (streams tronques par MAXLEN), constate le 2026-11-10.
#   dlq <stream>-dlq <longueur>                    (toute ligne dlq non nulle arrete l'essai)
#   bull <queue> wait=<n> active=<n> delayed=<n> failed=<n>
#   total pending=<n> max_behind_ms=<n> dlq=<n> bull_wait=<n> bull_failed=<n>
# Le mot de passe Redis reste dans le pod (REDISCLI_AUTH), il n'est jamais affiche.
set -euo pipefail
OUT=${1:?dossier de sortie manquant}
N=${2:-180}
ONCE=${3:-}
mkdir -p "$OUT"

read -r -d '' PROBE <<'EOS' || true
export REDISCLI_AUTH="$REDIS_PASSWORD"
tp=0; tl=0; td=0; tw=0; tf=0
for k in $(redis-cli --scan --count 1000 | grep -v '^bull:'); do
  [ "$(redis-cli type "$k")" = stream ] || continue
  case "$k" in
    *-dlq) n=$(redis-cli xlen "$k"); td=$((td + n)); echo "dlq $k $n"; continue ;;
  esac
  last=$(redis-cli xinfo stream "$k" 2>/dev/null | awk 'prev=="last-generated-id" {print; exit} {prev=$0}')
  redis-cli xinfo groups "$k" 2>/dev/null | awk -v s="$k" -v last="$last" '
    { a[NR]=$0 }
    END {
      split(last, L, "-")
      for (i=1;i<=NR;i++) {
        if (a[i]=="name") g=a[i+1]
        if (a[i]=="pending") p=a[i+1]
        if (a[i]=="last-delivered-id") {
          split(a[i+1], D, "-"); behind = L[1] - D[1]; if (behind < 0) behind = 0
          print "group", s, g, "pending=" p, "behind_ms=" behind
        }
      }
    }'
done > /tmp/async-groups.txt
cat /tmp/async-groups.txt
tp=$(awk '{sub("pending=","",$4); s+=$4} END {print s+0}' /tmp/async-groups.txt)
tl=$(awk '{sub("behind_ms=","",$5); if ($5+0 > m) m=$5+0} END {print m+0}' /tmp/async-groups.txt)
for m in $(redis-cli --scan --pattern 'bull:*:meta'); do
  q=${m#bull:}; q=${q%:meta}
  w=$(redis-cli llen "bull:$q:wait"); a=$(redis-cli llen "bull:$q:active")
  d=$(redis-cli zcard "bull:$q:delayed"); f=$(redis-cli zcard "bull:$q:failed")
  tw=$((tw + w)); tf=$((tf + f))
  echo "bull $q wait=$w active=$a delayed=$d failed=$f"
done
echo "total pending=$tp max_behind_ms=$tl dlq=$td bull_wait=$tw bull_failed=$tf"
EOS

sample() {
  echo "### $(date -u +%H:%M:%S)"
  kubectl -n prod exec redis-master-0 -c redis -- sh -c "$PROBE" 2>&1
}

if [ "$ONCE" = "--once" ] || [ "$N" = "--once" ]; then
  sample
  exit 0
fi
nohup bash -c "$(declare -f sample); PROBE=$(printf '%q' "$PROBE"); for i in \$(seq 1 $N); do sample; sleep 10; done" > "$OUT/async.log" 2>&1 &
echo "async.log lance dans $OUT pour environ $((N * 10 / 60)) minutes"
