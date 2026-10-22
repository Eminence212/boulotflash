<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 26 — PWA, réseau faible, accessibilité, performance |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-25-confidentialite-export-fermeture.md](etape-25-confidentialite-export-fermeture.md) |
| Suivante | [etape-27-deploiement-sauvegarde-pilote.md](etape-27-deploiement-sauvegarde-pilote.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 26 — PWA, réseau faible, accessibilité, traduction et performance

**Objectif et résultat visible**

L’application est installable. Les chaînes visibles passent par des clés françaises. Une coupure réseau n’affiche pas une action comme réussie. La liste reste utilisable en moins de quatre secondes sur le profil réseau fixé.

**Exigences couvertes**

§12.1, §12.5, §12.6, principe 2, recette 18. BF-J-02 et le cas réseau du §4.4.

**Prérequis et dépendances**

Étapes 13, 15 et 17. L’appareil et le profil réseau ont été écrits dans le registre avant cette étape. S’ils sont vides, s’arrêter et les demander. Ne pas inventer un téléphone.

**Travaux à réaliser, dans l’ordre**

1. Manifest, icônes 192 et 512 issues du logo, service worker.
2. Le service worker ne met en cache aucune URL sous `/api/`, ni l’écran de contact. Les tuiles de carte peuvent être ignorées hors ligne plutôt que mises en cache longtemps.
3. Catalogues `apps/web/src/i18n/fr/*.json`. Aucune chaîne française en dur dans les composants d’écran, y compris les titres / corps des notifications in-app via les mêmes clés.
4. Cibles 44 px, contraste, montant et commune en texte.
5. Pagination déjà en place. Limiter les images de la liste à la vignette.
6. Mesure : une fois le profil réseau noté, utiliser la limitation du navigateur ou un proxy local documenté, recharger la liste trois fois, noter les temps. Le critère est quatre secondes jusqu’à une liste lisible. Conserver le relevé dans `docs/implementation/PERF.md` (**à créer** à cette étape).
7. Premier écran utile sous cinq secondes sur le même profil, comme objectif du CDC §12.1.
8. Hors ligne au milieu d’une candidature et d’une publication : état non envoyé.

**Règles techniques et métier**

Ajouter une langue ne se fait pas dans cette étape. Les clés doivent seulement rendre l’ajout possible.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 26-A | Installation | Chrome, 360 px | « Ajouter à l’écran d’accueil » ou l’équivalent | Icône BoulotFlash, ouverture sans barre inutile | Manifest 192 et 512 |
| 26-B | Cache | Avoir ouvert un contact, se déconnecter | Regarder le cache applicatif du navigateur | Aucune réponse `/api/` ni d’adresse |  |
| 26-C | Hors ligne | Liste déjà ouverte | Couper le réseau, postuler | « Non envoyé » | 0 nouvelle candidature |
| 26-D | Clés | Chercher une chaîne d’action dans le code des écrans | Les boutons viennent du catalogue `fr` | Pas de phrase métier uniquement dans un composant | Les titres in-app utilisent la même clé |
| 26-E | Performance | Profil réseau du registre | Ouvrir la liste trois fois | Chaque essai sous 4 secondes jusqu’aux cartes lisibles | Relevé écrit dans `PERF.md` (créé à cette étape) avec l’appareil |
| 26-F | Soleil et doigt | Téléphone réel si disponible, sinon émulation | Taper Postuler et lire le montant | Zone 44 px, montant lisible sans dépendre de la couleur |  |

**Tests automatisés nécessaires**

Test Playwright : le service worker enregistré ne contient pas de route cache pour `/api/`. Test que le catalogue `fr` couvre les clés utilisées.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `26-A` — Installation
- [ ] `26-B` — Cache
- [ ] `26-C` — Hors ligne
- [ ] `26-D` — Clés
- [ ] `26-E` — Performance
- [ ] `26-F` — Soleil et doigt

**Livrables et règles**
- [ ] Recette 18 mesurée, pas estimée.
- [ ] Pas de privé dans le cache.
- [ ] Actions non confirmées visuellement tant que le serveur n’a pas répondu.
- [ ] Tests automatisés exécutés avec succès : Playwright : SW sans cache `/api/` ; tests accessibilité ciblés.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : temps non mesuré, ou contact retrouvé dans le cache après déconnexion.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 26 : PWA, catalogues, cache et mesure. Si le profil réseau n’est pas dans le registre, arrête-toi et signale-le. Ne déploie pas le pilote. Fournis la recette 26-A à 26-F.

