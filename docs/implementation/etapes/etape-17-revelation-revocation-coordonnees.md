<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 17 — Révélation et révocation des coordonnées |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-16-propositions-acceptation-concurrence.md](etape-16-propositions-acceptation-concurrence.md) |
| Suivante | [etape-18-notifications-in-app-correspondance.md](etape-18-notifications-in-app-correspondance.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 17 — Révélation et révocation des coordonnées

**Objectif et résultat visible**

Après acceptation, les deux parties voient le numéro et l’adresse exacte, avec Appeler et WhatsApp. Personne d’autre ne les voit. Après annulation, l’accès futur disparaît. Le lien WhatsApp s’ouvre sans envoyer de message.

**Exigences couvertes**

BF-SEL-05, BF-S-07 pour le point privé après acceptation, principe 5, §12.3. Recettes 8, 11 et 16. D11 et D15.

**Prérequis et dépendances**

Étape 16. L’annulation métier complète est à l’étape 20 : ici, permettre `POST /participations/{id}/declarations` avec `CANCELLED` au minimum, ou une route `POST /participations/{id}/cancel` consommée plus tard par l’étape 20. Choisir la route de déclaration pour ne pas avoir deux chemins. L’étape 20 enrichira les autres issues.

**Travaux à réaliser, dans l’ordre**

1. `GET /participations/{id}/contact` selon l’API. `Cache-Control: no-store`.
2. Écran maquette 10. Bouton `tel:+243...`. Bouton WhatsApp : `https://wa.me/243...` sans `?text=` prérempli, `window.open` seulement. Aucun appel serveur qui enverrait un message.
3. Carte : après acceptation, le marqueur des parties autorisées est le point privé. Le détail public reste sur le point public.
4. Annulation : `contact_revoked_at` maintenant, notification laissée à l’étape 18 si le service existe déjà depuis l’étape 16. Les parties reçoivent 404 sur le contact.
5. Super-admin : route journalisée. Support, modo et finance : 403.
6. Le numéro affiché est le téléphone du recruteur issu du provider, ou `mission_phone` seulement s’il a été validé par le support sur ce compte.
7. Les journaux de l’API masquent le numéro. Le journal admin `OPEN_CONTACT` ne copie pas l’adresse dans `metadata`, seulement l’id de participation.

**Règles techniques et métier**

Même la participation `CONFIRMED` d’une autre mission ne donne pas le contact. Un cache navigateur ne doit pas réafficher l’adresse après révocation : en-têtes no-store, et l’écran refait la requête à l’ouverture.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 17-A | Avant acceptation | Candidature seulement | Ouvrir l’offre et l’appel réseau | Pas de contact |  |
| 17-B | Après acceptation | Participation de 16-D | Ouvrir l’écran des deux comptes, `R-2` et le candidat | Les deux voient numéro et adresse. La carte des parties montre le point privé | Le `GET` public de l’offre ne les contient toujours pas |
| 17-C | Tiers | `R-1` et `C-B` non partie | `GET /participations/{id}/contact` | 404 |  |
| 17-D | Admin | `super` puis `modo` | Ouvrir le contact admin | Super : 200 et une ligne `contact_access_logs` sans l’adresse dans metadata. Modo : 403 |  |
| 17-E | WhatsApp | Écran de contact | Cliquer WhatsApp | L’application ou l’onglet s’ouvre. Aucune requête POST vers l’API au clic | L’URL n’a pas de paramètre `text` |
| 17-F | Appel | Même écran | Cliquer Appeler | Lien `tel:` |  |
| 17-G | Annulation | Une des deux parties | Déclarer l’annulation | Message de prévention prévu. Recharger le contact des deux côtés | 404. `contact_revoked_at` rempli. La page publique n’a toujours pas l’adresse |
| 17-H | URL déjà vue | Avoir affiché le contact, annuler, revenir en arrière |  | L’écran refait l’appel et montre que l’accès est retiré, pas l’ancienne adresse | En-tête `no-store` présent sur la réponse d’avant annulation |
| 17-I | Autre recruteur | `R-1` | Relire la candidature et le contact | 404 | Recette 9 et 8 ensemble |

**Tests automatisés nécessaires**

Jest d’autorisation du contact : partie, tiers, après révocation, admin journalisé. Test que le DTO public reste inchangé après acceptation.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `17-A` — Avant acceptation
- [ ] `17-B` — Après acceptation
- [ ] `17-C` — Tiers
- [ ] `17-D` — Admin
- [ ] `17-E` — WhatsApp
- [ ] `17-F` — Appel
- [ ] `17-G` — Annulation
- [ ] `17-H` — URL déjà vue
- [ ] `17-I` — Autre recruteur

**Livrables et règles**
- [ ] Recettes 8, 11 et 16.
- [ ] Révocation effective malgré le retour arrière.
- [ ] Aucune adresse dans les logs.
- [ ] Tests automatisés exécutés avec succès : Jest autorisation contact + révocation + absence adresse logs.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : contact lisible après annulation, ou par un autre recruteur.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 17 : contact, carte privée pour les parties, révocation et WhatsApp sans message. Ne construis pas encore tout le dossier de fin de mission. Fournis la recette 17-A à 17-I.

