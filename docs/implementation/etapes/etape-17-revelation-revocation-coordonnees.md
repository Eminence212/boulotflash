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
- [x] `17-A` — Avant acceptation
- [x] `17-B` — Après acceptation
- [x] `17-C` — Tiers
- [x] `17-D` — Admin
- [x] `17-E` — WhatsApp
- [x] `17-F` — Appel
- [x] `17-G` — Annulation
- [x] `17-H` — URL déjà vue
- [x] `17-I` — Autre recruteur

**Livrables et règles**
- [x] Recettes 8, 11 et 16.
- [x] Révocation effective malgré le retour arrière.
- [x] Aucune adresse dans les logs.
- [x] Tests automatisés exécutés avec succès : Jest autorisation contact + révocation + absence adresse logs.
- [x] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : contact lisible après annulation, ou par un autre recruteur.

**Compte rendu de recette — 24 octobre 2026**

Pile Docker locale (`docker compose --env-file .env.development`), API et web reconstruits. Navigateur intégré en vue mobile (375 × 812), deux onglets pour jouer les deux parties en même temps.

*Comptes.* Comme pour l’étape 16, les comptes démo nommés ne peuvent pas se connecter (OAuth réel uniquement, D34). La recette utilise des comptes équivalents créés par `POST /auth/dev-session` (hook de test) : recruteur « Boutique (R-2 recette 17) », recruteur « Restaurant (R-1 recette 17) », candidates Grâce (C-COMPLET, profil complet) et Sarah (C-B). Offre `J-PUB-1 (recette 17)`, 2 places, adresse privée « 10 avenue de test, Gombe », `mission_phone` renseigné. Les candidatures de Grâce et de Sarah ont été insérées en base par le script de recette (le profil de Sarah n’a pas de disponibilités, la candidature par l’API est donc refusée, à raison). La proposition a été faite par l’API ; Grâce a accepté dans l’interface. Admins : comptes semés `super`, `support`, `modo`, `finance`, connexion mot de passe + TOTP de test.

| ID | Attendu | Observé | Statut |
| --- | --- | --- | --- |
| 17-A | Pas de contact | Sarah, candidature `SUBMITTED` : écran de l’offre sans lien `tel:`, sans lien vers les coordonnées, aucun appel à `/contact` ; `my-application` → `participation: null` ; ni adresse, ni `mission_phone`, ni numéro dans `my-application`, le détail et la liste | OK |
| 17-B | Les deux parties voient numéro et adresse, carte au point privé ; le `GET` public ne les contient pas | Grâce : « Téléphone du recruteur +243 824 970 522 », `tel:+243824970522`, adresse exacte, carte Leaflet sur le point privé. `R-2` : depuis l’écran des candidatures, bouton « Coordonnées » → « Téléphone du candidat +243 824 970 640 », `tel:+243824970640`, même adresse et même carte. `mission_phone` affiché nulle part (D15). `GET /jobs/{id}` public : aucune clé d’adresse ni de point privé, aucun numéro | OK |
| 17-C | 404 | `R-1` et `C-B` : `GET /participations/{id}/contact` → 404 `NOT_FOUND` « Coordonnées indisponibles. » | OK |
| 17-D | Super : 200 et une ligne `contact_access_logs` sans adresse ; modo : 403 | `super` : 200, `Cache-Control: no-store`, `contact_access_logs` 0 → 1, audit `OPEN_CONTACT` `entityType = participation`, `metadata = {participationId}` ; journal API : `OPEN_CONTACT participation=<id>` seulement. `modo` : 403 (`support` et `finance` : 403 dans le test automatisé) | OK |
| 17-E | Ouverture sans requête POST, URL sans `text` | `window.open` intercepté : `https://wa.me/243824970640`, cible `_blank`, `noopener,noreferrer`, aucun paramètre `text` ; aucune requête réseau au clic | OK |
| 17-F | Lien `tel:` | Bouton « Appeler » = `<a href="tel:+243…">` des deux côtés | OK |
| 17-G | Message de prévention ; 404 des deux côtés, `contact_revoked_at` rempli, public sans adresse | Grâce, « Annuler ma participation » : la modale explique que l’autre partie est prévenue, que les coordonnées disparaissent pour les deux, que la place redevient disponible, et conseille d’appeler si elle peut encore venir. Après confirmation : écran « Accès aux coordonnées retiré » des deux côtés (contact → 404). Base : participation `CANCELLED`, `contact_revoked_at` et `cancelled_at` remplis, `worker_outcome = CANCELLED` ; deux notifications `participation_cancelled` (Grâce et `R-2`) ; « 2 places libres sur 2 ». Détail public toujours sans adresse | OK |
| 17-H | L’écran refait l’appel et montre l’accès retiré ; `no-store` avant annulation | `R-2` a affiché le contact, est passé à l’écran des candidatures, Grâce a annulé dans l’autre onglet, puis retour arrière : nouvelle requête `/contact` → 404, écran « Accès aux coordonnées retiré », ancienne adresse non réaffichée. Réponse 200 d’avant annulation : `Cache-Control: no-store`, `Pragma: no-cache` | OK |
| 17-I | 404 | `R-1` : `GET /jobs/{id}/applications` → 404 et écran « Offre introuvable. » ; contact → 404 et écran « Accès aux coordonnées retiré » | OK |

*Recettes.* 8 (coordonnées après acceptation, aux deux parties seulement) : 17-A, 17-B, 17-C, 17-I OK, avec la recette 9 (16-K, 17-I). 11 (annulation) : 17-G et 17-H OK ; les deux parties ont leur notification in-app en base (titre « Mission annulée »). L’écran qui liste les notifications arrive à l’étape 18 : elles n’ont donc pas été vues dans l’interface. 16 (WhatsApp sans message) : 17-E OK.

*Journaux.* `docker logs` de l’API et du worker, sur toute la session (recette + suite Jest, qui manipule des adresses « avenue secrète » et des numéros +243) : aucune adresse, aucun numéro. Seul `OPEN_CONTACT participation=<id>` apparaît.

*Anomalies corrigées pendant la recette.*
- La carte Leaflet passait au-dessus de la modale d’annulation : ses calques ont un z-index de 400 et plus, la modale 200. Le conteneur de carte isole désormais son contexte d’empilement.
- Côté recruteur, le bouton disait « Annuler ma participation » : il dit maintenant « Annuler la participation ».
- Après annulation, les cartes affichaient encore « Place acceptée : participation confirmée. » (recruteur) et « Gardez la date et l’heure de la mission » (candidat) à côté de « Participation annulée ». Ces messages sont masqués quand la participation est annulée.

*Points à valider.*
- D15 : le numéro affiché pour le recruteur est son `users.phone`. `mission_phone` n’est jamais révélé, faute de validation support de ce numéro (rien ne la porte encore dans le modèle).
- Le texte de prévention de la modale d’annulation est une proposition : ni le CDC ni la maquette n’en donnent la formulation.
- Le recruteur voit le numéro du candidat (BF-SEL-05 « les deux parties voient le numéro ») : à confirmer.
- Après annulation, le badge de la candidature reste « Acceptée » (la candidature a bien été acceptée ; c’est la participation qui est annulée). Le message « Participation annulée » est affiché juste dessous. L’étape 20 pourra revoir ce libellé avec les autres issues.

*Tests automatisés.* `participation-contact.int.test.ts` (API et Postgres réels) : 17-A, 17-B (dont le DTO public inchangé après acceptation et `no-store`), 17-C/17-I (autre recruteur, autre candidat, partie d’une autre mission), 17-D (super journalisé sans adresse ; `support`, `modo` et `finance` → 403), 17-G/17-H (404 des deux côtés, révocation, place libérée, rejeu sans contact), déclarations hors annulation. `log-hygiene.test.ts` : garde-fou statique sur tous les appels de journalisation de l’API (aucune adresse, aucun numéro ni point privé interpolé) et sur le journal `OPEN_CONTACT`. Ce test lit le code source ; la vérification à l’exécution est l’inspection des `docker logs` ci-dessus. Suite API complète : 16 suites, 106 tests OK (`jest --runInBand`). Web : 4 suites, 14 tests OK. Contrôles de mutation : sans la vérification « est une partie », 17-C échoue ; avec un log qui interpole l’adresse, `log-hygiene` échoue.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 17 : contact, carte privée pour les parties, révocation et WhatsApp sans message. Ne construis pas encore tout le dossier de fin de mission. Fournis la recette 17-A à 17-I.

