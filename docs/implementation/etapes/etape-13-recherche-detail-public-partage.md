<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 13 — Recherche, détail public, partage |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-12-offres-validation-moderation-versions.md](etape-12-offres-validation-moderation-versions.md) |
| Suivante | [etape-14-carte-nominatim-haversine.md](etape-14-carte-nominatim-haversine.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 13 — Recherche, détail public et partage

**Objectif et résultat visible**

Un visiteur filtre les missions publiées, ouvre une page partageable et copie le lien. Les offres non publiques n’ont pas de bouton Partager.

**Exigences couvertes**

BF-S-01 à BF-S-05, BF-J-09, BF-J-07 pour le lien des offres closes. Recettes 1 et 3.

**Prérequis et dépendances**

Étape 12. La distance peut afficher « position non partagée » jusqu’à l’étape 14.

**Travaux à réaliser, dans l’ordre**

1. Page d’accueil et filtres : ville, commune active, catégorie active, date, devise, mot-clé sur titre et description.
2. Tri : mises en avant dont `featured_until` est dans le futur d’abord, puis `published_at` descendant. Pas de tri par montant mélangeant CDF et USD.
3. Pagination.
4. Détail public. Bouton Partager : copie l’URL `/missions/{id}` et appelle `navigator.share` si présent. Aucun message n’est envoyé par l’API.
5. Statuts `FILLED`, `EXPIRED`, `CANCELLED`, `COMPLETED` : page ouvrable, phrase « Cette mission n’accepte plus de candidature », sans coordonnées.
6. `DRAFT`, `IN_REVIEW`, `REJECTED`, `SUSPENDED` : 404 public, bouton Partager absent même pour un curieux. Le propriétaire voit l’offre dans « Mes missions » sans bouton Partager tant qu’elle n’est pas publiée.
7. Cache Redis de la liste publique, clé sans aucun champ privé, invalidée à la publication, suspension, expiration et pourvoi.

**Règles techniques et métier**

Le DTO public est une classe dédiée. Un test d’intégration échoue si une clé interdite apparaît. Les places restantes utilisent la formule de D03.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 13-A | Visiteur | Navigation privée | Ouvrir l’accueil, filtrer Gombe et USD | Seulement des offres publiées de cette commune et devise | Le JSON n’a pas `addressPrivate` ni `missionPhone` |
| 13-B | Mots-clés | Offre « Service soirée » | Chercher « soirée » | L’offre apparaît | Chercher le texte de l’adresse privée ne la fait pas apparaître, car ce champ n’est pas indexé |
| 13-C | Partager | Offre `J-PUB-1` | Cliquer Partager | Lien copié. Sur un téléphone, feuille de partage. Aucun envoi WhatsApp automatique | Ouvrir le lien en navigation privée : détail sans privé |
| 13-D | Pas de lien | `J-REVIEW`, `J-SUSPENDUE` | Depuis le compte recruteur, regarder la ligne | Pas de bouton Partager | `GET /jobs/{id}` anonyme répond 404 |
| 13-E | Lien clos | `J-ANNULEE` ou `J-EXPIREE` | Ouvrir l’URL | Page qui dit que les candidatures sont closes, sans adresse |  |
| 13-F | Tri sponsor | Une offre `is_featured` dans le futur et une plus récente non sponsorisée | Recharger la liste | La sponsorisée est avant, avec le mot « sponsorisé » | Elle n’est pas appelée « recommandée » |
| 13-G | Pas de tri de montant mixte | Offres CDF et USD | Ouvrir les tris | Aucun tri « prix croissant » |  |

**Tests automatisés nécessaires**

Test du DTO : liste noire de clés. Test du tri sponsor. Test 404 des statuts non publics.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `13-A` — Visiteur
- [ ] `13-B` — Mots-clés
- [ ] `13-C` — Partager
- [ ] `13-D` — Pas de lien
- [ ] `13-E` — Lien clos
- [ ] `13-F` — Tri sponsor
- [ ] `13-G` — Pas de tri de montant mixte

**Livrables et règles**
- [ ] Recette 1 et 3 sur le partage et la liste.
- [ ] Cache sans champ privé.
- [ ] Tests automatisés exécutés avec succès : Jest DTO public (liste noire), tri sponsor, 404 non publics.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : adresse ou téléphone dans la réponse publique ou dans Redis.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 13 : liste, détail et partage. Ne calcule pas encore la distance. Fournis la recette 13-A à 13-G.

