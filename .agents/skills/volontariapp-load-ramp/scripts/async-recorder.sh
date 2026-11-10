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
# Un releve = un seul `kubectl exec` et un seul script Lua en lecture seule (EVAL_RO) : environ
# 1 s, au lieu d'une douzaine de secondes avec un redis-cli par cle. Le keyspace compte quelques
# milliers de cles (7 176 le 2026-11-10), le SCAN du script reste de l'ordre de la milliseconde.
# Le mot de passe Redis reste dans le pod (REDISCLI_AUTH), il n'est jamais affiche.
set -euo pipefail
OUT=${1:?dossier de sortie manquant}
N=${2:-180}
ONCE=${3:-}
mkdir -p "$OUT"

read -r -d '' LUA <<'EOS' || true
local out, tp, tb, td, tw, tf = {}, 0, 0, 0, 0, 0
local function field(list, name)
  for i = 1, #list, 2 do if list[i] == name then return list[i + 1] end end
end
local function ms(id) return tonumber(string.match(id, '^(%d+)')) or 0 end
local cursor = '0'
repeat
  local r = redis.call('SCAN', cursor, 'COUNT', 1000, 'TYPE', 'stream')
  cursor = r[1]
  for _, k in ipairs(r[2]) do
    if string.sub(k, -4) == '-dlq' then
      local n = redis.call('XLEN', k)
      td = td + n
      table.insert(out, 'dlq ' .. k .. ' ' .. n)
    else
      local last = ms(field(redis.call('XINFO', 'STREAM', k), 'last-generated-id'))
      for _, g in ipairs(redis.call('XINFO', 'GROUPS', k)) do
        local pending = field(g, 'pending')
        local behind = math.max(0, last - ms(field(g, 'last-delivered-id')))
        tp = tp + pending
        if behind > tb then tb = behind end
        table.insert(out, 'group ' .. k .. ' ' .. field(g, 'name') .. ' pending=' .. pending .. ' behind_ms=' .. behind)
      end
    end
  end
until cursor == '0'
cursor = '0'
repeat
  local r = redis.call('SCAN', cursor, 'MATCH', 'bull:*:meta', 'COUNT', 1000)
  cursor = r[1]
  for _, m in ipairs(r[2]) do
    local q = string.sub(m, 6, -6)
    local w = redis.call('LLEN', 'bull:' .. q .. ':wait')
    local a = redis.call('LLEN', 'bull:' .. q .. ':active')
    local d = redis.call('ZCARD', 'bull:' .. q .. ':delayed')
    local f = redis.call('ZCARD', 'bull:' .. q .. ':failed')
    tw, tf = tw + w, tf + f
    table.insert(out, 'bull ' .. q .. ' wait=' .. w .. ' active=' .. a .. ' delayed=' .. d .. ' failed=' .. f)
  end
until cursor == '0'
table.insert(out, 'total pending=' .. tp .. ' max_behind_ms=' .. tb .. ' dlq=' .. td .. ' bull_wait=' .. tw .. ' bull_failed=' .. tf)
return out
EOS

sample() {
  echo "### $(date -u +%H:%M:%S)"
  kubectl -n prod exec -i redis-master-0 -c redis -- sh -c \
    'export REDISCLI_AUTH="$REDIS_PASSWORD"; redis-cli --raw EVAL_RO "$(cat)" 0' <<<"$LUA" 2>&1
}

if [ "$ONCE" = "--once" ] || [ "$N" = "--once" ]; then
  sample
  exit 0
fi
# Cadence de 10 s tenue : l'attente deduit la duree du releve
nohup bash -c "$(declare -f sample); LUA=$(printf '%q' "$LUA"); for i in \$(seq 1 $N); do t0=\$(date +%s); sample; s=\$(( 10 - (\$(date +%s) - t0) )); [ \$s -gt 0 ] && sleep \$s; done" > "$OUT/async.log" 2>&1 &
echo "async.log lance dans $OUT pour environ $((N * 10 / 60)) minutes"
