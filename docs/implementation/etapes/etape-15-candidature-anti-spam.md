<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 15 — Candidature et limite anti-spam |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-14-carte-nominatim-haversine.md](etape-14-carte-nominatim-haversine.md) |
| Suivante | [etape-16-propositions-acceptation-concurrence.md](etape-16-propositions-acceptation-concurrence.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 15 — Candidature, contrôles et limite anti-spam

**Objectif et résultat visible**

Un candidat au profil complet postule une fois. Le serveur confirme avant que l’écran dise « envoyée ». Cinq candidatures par jour glissant, sans paiement pour débloquer.

**Exigences couvertes**

BF-A-01, BF-A-02, BF-A-04, BF-A-05, BF-W-03, §5.6. Recette 5.

**Prérequis et dépendances**

Étapes 12 et 13. D02 : unicité historique.

**Travaux à réaliser, dans l’ordre**

1. Écran détail : bouton Postuler, case de disponibilité obligatoire, message facultatif.
2. `POST /jobs/{id}/applications` avec `Idempotency-Key`.
3. Contrôles : compte `ACTIVE`, `is_available`, compétence et commune, règles acceptées, téléphone confirmé, offre `PUBLISHED`, date limite non passée, pas sa propre offre, sous la limite glissante.
4. La limite compte les candidatures créées dans les dernières 24 heures, y compris celles retirées. Un paiement n’existe pas sur cette route.
5. Retrait seulement si `SUBMITTED` ou `SHORTLISTED`. Le retrait ne permet pas de reposer.
6. Historique : statut, date, commune, montant. Pas le montant d’une autre version que celle de l’offre au moment de la candidature ; après acceptation, l’historique montrera le montant figé à l’étape 16.
7. État « non envoyé » si le réseau échoue. Pas d’optimistic UI qui dirait « envoyée ».

**Règles techniques et métier**

La contrainte SQL est la dernière ligne de défense. Le service renvoie `ALREADY_APPLIED` avec le message « Vous avez déjà postulé à cette mission. »

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 15-A | Nominal | `C-COMPLET`, offre `J-PUB-1` | Ouvrir l’offre, cocher la disponibilité, Postuler | « Candidature envoyée » seulement après la réponse. Statut « Soumise » | Une ligne `applications` |
| 15-B | Deuxième fois | Même couple | Revenir sur l’offre | Le bouton est « Déjà postulé ». L’API répond `ALREADY_APPLIED` | Toujours une ligne |
| 15-C | Retrait puis retour | Candidature soumise | Retirer. Rouvrir l’offre. Postuler | Refus. Le statut historique est « Retirée » |  |
| 15-D | Sans téléphone | `C-NOPHONE` | Appeler l’API de candidature | `PHONE_REQUIRED` |  |
| 15-E | Propre offre | `R-DUAL` en mode candidat sur une offre qu’il a publiée | Postuler | `OWN_JOB` |  |
| 15-F | Offre en revue | `J-REVIEW` | POST candidature | `OFFER_NOT_OPEN` ou 404 | Aucune ligne |
| 15-G | Limite | Candidat de test | Créer 5 candidatures sur 5 offres publiées dans la fenêtre, tenter la 6e | « Vous avez atteint la limite du jour. » Aucun bouton de paiement | La 6e n’est pas en base |
| 15-H | Double clic | Une offre | Deux POST parallèles, même utilisateur, avec deux clés différentes | Une 201 et une 409 `ALREADY_APPLIED` | Une ligne |
| 15-I | Même clé | Rejouer le POST avec la même `Idempotency-Key` |  | Même réponse, pas une erreur effrayante, pas une seconde ligne |  |
| 15-J | Hors ligne | DevTools offline | Cliquer Postuler | « Non envoyé » | 0 ligne jusqu’au renvoi en ligne |
| 15-K | Indisponible | Disponibilité coupée | Postuler | Refus « Activez votre disponibilité pour postuler. » |  |

**Tests automatisés nécessaires**

Jest : unicité, limite glissante, propre offre, offre non publiée, idempotence, retrait qui ne réautorise pas.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `15-A` — Nominal
- [ ] `15-B` — Deuxième fois
- [ ] `15-C` — Retrait puis retour
- [ ] `15-D` — Sans téléphone
- [ ] `15-E` — Propre offre
- [ ] `15-F` — Offre en revue
- [ ] `15-G` — Limite
- [ ] `15-H` — Double clic
- [ ] `15-I` — Même clé
- [ ] `15-J` — Hors ligne
- [ ] `15-K` — Indisponible

**Livrables et règles**
- [ ] Recette 5.
- [ ] Aucun déblocage payant.
- [ ] L’interface n’annonce pas l’envoi avant le serveur.
- [ ] Tests automatisés exécutés avec succès : Jest unicité, rate-limit, propre offre, idempotence.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : deuxième ligne `applications` pour le même couple.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 15 : candidatures et anti-spam. Ne réserve pas encore de place. Fournis la recette 15-A à 15-K.

