#!/usr/bin/env python3
"""Part des requetes sous 100 ms, 300 ms, 1,2 s, 5 s vue par Traefik, sur une fenetre horaire.

Usage: traefik-percentiles.py <journal du releve> <HH:MM:SS debut> <HH:MM:SS fin> [--series]
Le journal vient de record-ramp.sh (histogramme traefik_entrypoint_request_duration_seconds,
GET http 200, relu toutes les 5 s). --series ajoute debit et latence moyenne par tranche de 5 s,
ce qui montre un gel (debit qui tombe a presque rien puis rattrape) ou une file qui grossit.
Heures en UTC, comme le releve.
"""
import re
import sys

path, start, end = sys.argv[1], sys.argv[2], sys.argv[3]
snaps, cur = {}, None
for line in open(path):
    if line.startswith("###"):
        cur = line.split()[1]
        snaps[cur] = {"b": {}, "sum": None, "count": None}
    elif cur and "_bucket" in line:
        m = re.search(r'le="([^"]+)"\} (\S+)', line)
        snaps[cur]["b"][m.group(1)] = float(m.group(2))
    elif cur and "_sum" in line:
        snaps[cur]["sum"] = float(line.split()[-1])
    elif cur and "_count" in line:
        snaps[cur]["count"] = float(line.split()[-1])

keys = sorted(k for k in snaps if snaps[k]["b"])
a = [k for k in keys if k <= start][-1]
b = [k for k in keys if k >= end][0]
total = snaps[b]["b"]["+Inf"] - snaps[a]["b"]["+Inf"]
print(f"{a} -> {b} : {int(total)} requetes")
for le in snaps[b]["b"]:
    if le != "+Inf":
        part = 100 * (snaps[b]["b"][le] - snaps[a]["b"][le]) / total
        print(f"  sous {le} s : {part:.1f} %")

if "--series" in sys.argv:
    prev = None
    for k in keys:
        if k < start or k > end:
            prev = k
            continue
        if prev and snaps[k]["count"] and snaps[prev]["count"] and snaps[k]["count"] > snaps[prev]["count"]:
            n = snaps[k]["count"] - snaps[prev]["count"]
            avg = (snaps[k]["sum"] - snaps[prev]["sum"]) / n * 1000
            if n >= 100:
                print(f"  {k} {n / 5:5.0f} req/s  moyenne {avg:6.0f} ms")
        prev = k
