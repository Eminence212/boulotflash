<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 25 — Confidentialité, export, fermeture, conservation |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-24-indicateurs-tableau-de-bord.md](etape-24-indicateurs-tableau-de-bord.md) |
| Suivante | [etape-26-pwa-reseau-accessibilite-performance.md](etape-26-pwa-reseau-accessibilite-performance.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 25 — Confidentialité, export des données, fermeture et conservation

**Objectif et résultat visible**

Depuis le profil, l’utilisateur demande une copie de ses données et la fermeture du compte. Un numéro ou un e-mail fermé ne ressert pas avant 90 jours. Le changement de numéro passe par le support (plus d’OTP).

**Exigences couvertes**

BF-W-04, BF-AUTH-08, §9.1, §12.3, §12.4. D28.

**Prérequis et dépendances**

Étapes 08, 09, 17 et 23.

**Travaux à réaliser, dans l’ordre**

1. Écran aide : liens vers [CONDITIONS_UTILISATION.md](../CONDITIONS_UTILISATION.md) et [POLITIQUE_CONFIDENTIALITE.md](../POLITIQUE_CONFIDENTIALITE.md), affichés avec la mention **projet, non validé** (D24). Semer `terms_documents` (`TERMS` / `PRIVACY`, version `0.1`) depuis ces fichiers. Acceptation enregistrée dans `terms_acceptances` avant la première candidature ou publication, si ce n’est pas déjà fait à l’étape 08.
2. `POST /me/data-export` : le worker produit un JSON des données du compte, sans les coordonnées des missions des autres, avec les siennes seulement pour les participations non révoquées. Lien privé 5 minutes, suppression sous 7 jours.
3. Fermeture : confirmation explicite. Anonymisation selon le modèle. Empreintes dans `closed_identifiers`, `reusable_at` à 90 jours.
4. Tentative de réinscription avec le même téléphone, e-mail ou `provider_user_id` avant 90 jours : refus.
5. Changement de numéro : demande `PENDING_SUPPORT` uniquement. Le support la voit ; le changement n’est appliqué qu’après confirmation d’un admin autorisé. Recommandation : le support valide, car le CDC lui donne la revue.
6. Déconnexion vide le stockage local du web : jeton mémoire, et le service worker sera interdit de cache API à l’étape 26. Ici, supprimer `localStorage` s’il a été utilisé. Préférer ne pas y mettre de données métier.
7. Les reçus de paiement ne sont pas effacés avec le compte. Les afficher comme « compte fermé » sans nom.

**Règles techniques et métier**

La fermeture ne supprime pas l’historique d’audit ni les participations nécessaires à un litige. Elle retire le téléphone des réponses.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 25-A | Copie | `C-COMPLET` | Demander la copie, télécharger | JSON avec son profil et ses candidatures | Pas du téléphone de `C-A` |
| 25-B | Fermeture | Compte de test dédié `+243810000077` | Fermer le compte | Écran d’au revoir. `/me` répond 401 | `users.phone` null. Empreinte présente. Photo S3 absente |
| 25-C | Réutilisation | Même e-mail ou provider_user_id avant 90 jours | OAuth | Refus « cet identifiant n’est pas réutilisable pour le moment » | Après horloge + 91 jours, OAuth crée un compte neuf |
| 25-D | Provider fermé | Compte Google fermé | Rejouer le jeton | Refus pendant 90 jours | Idem Facebook / Instagram |
| 25-E | Changement | Compte actif | Demande support vers `+243810000088`, validation admin | Le compte garde son id. L’ancien numéro est libre |  |
| 25-F | Numéro perdu | Demande support | `support` ouvre la demande et la confirme | Numéro changé, journal écrit | Sans confirmation, le numéro ne change pas |
| 25-G | Déconnexion | Session avec contact déjà ouvert | Se déconnecter, retour arrière | Pas de coordonnées affichées |  |

**Tests automatisés nécessaires**

Jest : anonymisation, blocage 90 jours, export sans données d’un tiers, changement de numéro refusé si le nouveau est pris.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `25-A` — Copie
- [ ] `25-B` — Fermeture
- [ ] `25-C` — Réutilisation
- [ ] `25-D` — Provider fermé
- [ ] `25-E` — Changement
- [ ] `25-F` — Numéro perdu
- [ ] `25-G` — Déconnexion

**Livrables et règles**
- [ ] Fermeture et blocage prouvés.
- [ ] Export limité au demandeur.
- [ ] Textes juridiques liés (conditions + confidentialité) encore marqués **projet, non validé** (D24).
- [ ] Tests automatisés exécutés avec succès : Jest anonymisation, 90 jours, export tiers, phone change.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : téléphone encore en clair après fermeture, ou export qui contient l’adresse d’une mission annulée.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 25 : export, fermeture et changement de numéro. Ne déploie pas. Fournis la recette 25-A à 25-G.

