#!/usr/bin/env python3
"""Debit disque de lecture et d'ecriture par pod (cadvisor, deltas toutes les 10 s).

Usage: disk-read-rate.py <nombre d'echantillons> [nom du nœud]
N'affiche une ligne que si un pod depasse 0,5 Mo/s. Sert a trouver qui sature le disque de la VM :
en novembre 2026 ms-ranking-db lisait 125 a 245 Mo/s en continu (sondage d'outbox sans index).
Lecture seule : `kubectl get --raw /api/v1/nodes/<nœud>/proxy/metrics/cadvisor`.
"""
import datetime
import re
import subprocess
import sys
import time

count = int(sys.argv[1])
node = sys.argv[2] if len(sys.argv) > 2 else subprocess.run(
    ["kubectl", "get", "nodes", "-o", "jsonpath={.items[0].metadata.name}"],
    capture_output=True, text=True).stdout


def snapshot():
    out = subprocess.run(
        ["kubectl", "get", "--raw", f"/api/v1/nodes/{node}/proxy/metrics/cadvisor"],
        capture_output=True, text=True, timeout=20).stdout
    reads, writes = {}, {}
    for line in out.splitlines():
        reading = line.startswith("container_fs_reads_bytes_total")
        if not (reading or line.startswith("container_fs_writes_bytes_total")):
            continue
        pod = re.search(r'pod="([^"]+)"', line)
        container = re.search(r'container="([^"]+)"', line)
        if not pod or not container or container.group(1) == "POD":
            continue
        # le dernier champ est l'horodatage, la valeur est l'avant-dernier
        value = float(line.split()[-2])
        target = reads if reading else writes
        target[pod.group(1)[:34]] = target.get(pod.group(1)[:34], 0) + value
    return reads, writes


prev_r, prev_w = snapshot()
for _ in range(count):
    time.sleep(10)
    try:
        r, w = snapshot()
    except Exception:
        continue
    top_r = sorted(((r[k] - prev_r.get(k, r[k])) / 1e6 / 10, k) for k in r)[-3:][::-1]
    top_w = sorted(((w[k] - prev_w.get(k, w[k])) / 1e6 / 10, k) for k in w)[-3:][::-1]
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%H:%M:%S")
    print(stamp, "READ MB/s", [(round(v, 1), k) for v, k in top_r if v > 0.5],
          "WRITE MB/s", [(round(v, 1), k) for v, k in top_w if v > 0.5], flush=True)
    prev_r, prev_w = r, w
