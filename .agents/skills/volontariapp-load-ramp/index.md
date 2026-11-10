# Montée en charge : rampe, enregistreurs et lecture des résultats

Mesurer la limite de la plateforme avec la rampe de charge (traffic-simulator, yarn load) : mode routes (4 routes de référence) ou mode app (toutes les lectures de nativapp, écritures du pool load.NNNN), profil d'attaque à froid, préparation et nettoyage des écritures, enregistreurs (Traefik, CPU, disque, flux asynchrones), lecture d'un palier, chiffres de référence séparés par mode.

## Concepts

- [SKILL.md](/volontariapp-load-ramp/SKILL.md) - point d'entrée de la skill
- [Leçons apprises](/volontariapp-load-ramp/references/lessons.md) - Règles et pièges découverts en travaillant sur volontariapp-load-ramp, du plus récent au plus ancien.

## Scripts

- [`async-recorder.sh`](/volontariapp-load-ramp/scripts/async-recorder.sh) - Enregistreur des flux asynchrones pendant une rampe qui ecrit (lecture seule sur Redis).
- [`disk-read-rate.py`](/volontariapp-load-ramp/scripts/disk-read-rate.py) - Debit disque de lecture et d'ecriture par pod (cadvisor, deltas toutes les 10 s).
- [`record-ramp.sh`](/volontariapp-load-ramp/scripts/record-ramp.sh) - Lance en arriere-plan les trois enregistreurs a demarrer AVANT que la rampe commence.
- [`traefik-percentiles.py`](/volontariapp-load-ramp/scripts/traefik-percentiles.py) - Part des requetes sous 100 ms, 300 ms, 1,2 s, 5 s vue par Traefik, sur une fenetre horaire.

Historique : [log.md](/volontariapp-load-ramp/log.md)
