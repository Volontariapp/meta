# Montée en charge : rampe, enregistreurs et lecture des résultats

Mesurer la limite de la plateforme avec la rampe de charge en lecture seule (traffic-simulator, yarn load) : préparer le cluster, lancer les enregistreurs (Traefik, CPU, lectures disque par pod, pression E/S de la VM), lire un palier sans confondre charge, démarrage à froid et gel de la VM, chiffres de référence et prochaines marches.

## Concepts

- [SKILL.md](/volontariapp-load-ramp/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-load-ramp/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-load-ramp, du plus récent au plus ancien.

## Scripts

- [`disk-read-rate.py`](/volontariapp-load-ramp/scripts/disk-read-rate.py) - Debit disque de lecture et d'ecriture par pod (cadvisor, deltas toutes les 10 s).
- [`record-ramp.sh`](/volontariapp-load-ramp/scripts/record-ramp.sh) - Lance en arriere-plan les trois enregistreurs a demarrer AVANT que la rampe commence.
- [`traefik-percentiles.py`](/volontariapp-load-ramp/scripts/traefik-percentiles.py) - Part des requetes sous 100 ms, 300 ms, 1,2 s, 5 s vue par Traefik, sur une fenetre horaire.

Historique : [log.md](/volontariapp-load-ramp/log.md)
