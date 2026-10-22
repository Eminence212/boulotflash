<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 14 — Carte, Nominatim, Haversine |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-13-recherche-detail-public-partage.md](etape-13-recherche-detail-public-partage.md) |
| Suivante | [etape-15-candidature-anti-spam.md](etape-15-candidature-anti-spam.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 14 — Carte, Nominatim et distance

**Objectif et résultat visible**

Le détail public montre une carte du point public et, si le visiteur partage sa position, la distance au dixième de kilomètre. Le point exact n’est pas sur cette carte.

**Exigences couvertes**

BF-S-04, BF-S-07, principe 5, §5.5, §7. Recette 1 pour l’absence du point privé.

**Prérequis et dépendances**

Étape 13. D12 : ne pas chercher un autre projet. D19 et D25 : sans centre de commune sourcé et sans User-Agent, afficher « distance indisponible » plutôt qu’un point inventé. Nominatim simulé en local.

**Travaux à réaliser, dans l’ordre**

1. À la soumission, le worker ou l’API met en file le géocodage du repère public. Cache Redis 5 minutes. User-Agent depuis `NOMINATIM_USER_AGENT`. Sans la variable, ne pas appeler Nominatim.
2. Stocker `public_latitude` et `public_longitude`. L’adresse exacte est géocodée à part vers les colonnes privées, jamais renvoyées ici.
3. Repli : centre de commune seulement s’il a été importé avec une source citée dans `docs/implementation/COMMUNES_SOURCE.md` (**à créer** à cette étape ; absent du dépôt tant que non rédigé).
4. Composant Leaflet. Tuiles OSM. Si `NEXT_PUBLIC_MAPTILER_API_KEY` est défini, tuiles MapTiler.
5. Bouton « Ma position ». `getCurrentPosition` une fois. Haversine dans `packages/contracts/src/haversine.ts`, rayon 6371, arrondi au dixième. La position n’est pas envoyée à l’API.
6. Sans permission : « position non partagée ». La liste reste filtrable par commune.

**Règles techniques et métier**

Le marqueur du détail public utilise uniquement les coordonnées publiques. Un test de composant fournit une offre avec des coordonnées privées différentes et vérifie que le marqueur n’est pas à cet endroit.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 14-A | Point public | Offre avec repère géocodé par la fixture | Ouvrir le détail | Une carte, un point, le repère textuel | Les coordonnées privées du seed ne sont pas dans le HTML ni dans les tuiles demandées |
| 14-B | Distance | Autoriser la position dans le navigateur | Cliquer « Ma position » | Distance « x,x km » | Aucune nouvelle ligne en base après le clic. Le réseau ne montre pas la position vers `/api/` |
| 14-C | Refus de position | Bloquer la géolocalisation | Rouvrir le détail | « Position non partagée ». Filtres utilisables |  |
| 14-D | Haversine | Test unitaire visible | Deux points connus, par exemple 0,0 et 0,1 | Environ 11,1 km | Arrondi au dixième |
| 14-E | Sans User-Agent | Variable retirée en local | Soumettre une offre | Publication possible, coordonnées publiques vides, texte « distance indisponible » | Aucun appel Nominatim dans les logs |
| 14-F | MapTiler absent | Clé absente | Recharger | Tuiles OpenStreetMap | Avec la clé dans l’env de test, l’URL de tuile change. Ne pas commiter la clé |

**Tests automatisés nécessaires**

Jest de Haversine, y compris l’arrondi. Test que le DTO public ignore les coordonnées privées même si elles sont en base.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `14-A` — Point public
- [ ] `14-B` — Distance
- [ ] `14-C` — Refus de position
- [ ] `14-D` — Haversine
- [ ] `14-E` — Sans User-Agent
- [ ] `14-F` — MapTiler absent

**Livrables et règles**
- [ ] Carte publique sans point exact.
- [ ] Position non historisée.
- [ ] Pas de coordonnées inventées.
- [ ] Tests automatisés exécutés avec succès : Jest Haversine + DTO sans coordonnées privées.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : envoi de la position au serveur, ou marqueur sur l’adresse privée avant acceptation.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 14 : carte publique, géocodage et Haversine. Ne révèle pas le point privé : ce sera l’étape 17. Fournis la recette 14-A à 14-F.

