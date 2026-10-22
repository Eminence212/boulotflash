# Recette finale et traçabilité

Les tests manuels cités sont ceux des annexes d’étapes. Les tests automatisés sont le filet de sécurité, pas un remplacement de la recette manuelle.

## Parcours complet

À enchaîner sur l’environnement de test : OAuth Google/Meta **réels** (comptes testeurs), notifications **in-app seulement**, Nominatim simulé si besoin, communes de démo Gombe, Lemba et Ngaliema, `services_payants` faux au départ.

1. Inscription OAuth Google réelle, case 18 ans, règles ; compléter le téléphone au profil s’il manque.
2. Profil candidat : nom, Lemba, vente, vendredi soir.
3. Second compte (autre testeur OAuth ou téléphone saisi `+243820000050`), profil recruteur, abonnement actif, libellé services gratuits.
4. Offre de vente à Lemba, vendredi 19:00, 15 USD la mission, 1 place, repère public, adresse privée saisie.
5. Comme c’est un nouveau recruteur, la file de `modo` approuve.
6. Le candidat reçoit une notification in-app de correspondance, sans push.
7. Il postule. Le recruteur propose. Le candidat accepte.
8. Les deux voient le numéro et l’adresse. Le visiteur anonyme, non.
9. Les deux déclarent la réalisation. Le recruteur déclare avoir payé. Le candidat confirme la réception.
10. Chacun laisse un retour privé. Le profil public n’a pas de note.
11. `super` lit le tableau : une offre validée, une place acceptée, une mission réalisée des deux côtés.

## Variantes critiques

| Variante | Où | Résultat |
| --- | --- | --- |
| Expiration | 16-F | Place libérée, acceptation refusée |
| Annulation | 17-G et 20-E | Notification, contact retiré, place non occupée |
| Modification des conditions | 12-H | Ancienne version conservée sur la participation, offre en revue |
| Suspension | 21-C et 21-D | Offre invisible, compte qui ne postule plus |
| Coupure réseau | 08-G, 12-I, 15-J, 26-C | « Non envoyé », pas de doublon |
| Concurrence | 16-H et 16-J | Une seule place |
| Paiement confirmé deux fois | 22-F | Un seul droit |
| Absence de push | 19-B, 19-F | Zéro canal FCM ; métier OK sans permission navigateur |
| OAuth sans téléphone (`C-NOPHONE`) | 09-B, 15-D | Consultation possible, candidature bloquée jusqu’à complétion profil |
| Services gratuits puis payants | 22-A à 22-E | Rien n’est livré sur une capture seule |

## Les 20 critères de la section 20 du CDC

| Critère | Étape | Test manuel | Test automatisé utile |
| --- | --- | --- | --- |
| 1. Visiteur sans coordonnées | 13, 14 | 13-A, 14-A | DTO public sans clés privées |
| 2. Offre incomplète et « à discuter » | 12 | 12-A | Validation Zod et mots interdits |
| 3. Modération, suspension, annulation : pas de candidature, pas de liste, pas de lien | 12, 13, 21 | 12-B, 13-D, 21-C | 404 et `OFFER_NOT_OPEN` |
| 4. Référentiel et catégories sensibles, contenus interdits | 06, 12 | 06-C, 12-E, 12-F, 12-G | Seed et filtre de mots |
| 5. Pas deux candidatures | 05, 15 | 05-B, 15-B, 15-C | Unicité SQL et service |
| 6. Acceptations simultanées | 16 | 16-H, 16-I, 16-J | Transactions parallèles |
| 7. Proposition expirée | 16 | 16-F | Worker d’expiration |
| 8. Coordonnées seulement après acceptation, parties concernées | 17 | 17-A, 17-B, 17-C | Autorisation du contact |
| 9. Recruteur et candidatures d’un autre | 16, 17 | 16-K, 17-I | Filtre `employer_id` |
| 10. Modification importante | 12, 18 | 12-H, 18-I | Version figée |
| 11. Annulation, notification, retrait des coordonnées | 17, 19, 20 | 17-G, 20-E | Révocation |
| 12. Gratuit, puis paiement non livré si non confirmé | 22 | 22-A, 22-C, 22-D | Droits `FREE` et refus de capture |
| 13. Une confirmation, un droit | 05, 22 | 05-C, 22-F | Contrainte `payment_id` |
| 14. Abonnement inactif | 11, 22 | 11-F, 22-H | `SUBSCRIPTION_INACTIVE` |
| 15. Signalement historisé, retour privé, pas de note | 20, 21 | 20-F, 21-A, 21-B | DTO sans `rating` |
| 16. WhatsApp sans message automatique | 17 | 17-E | URL sans `text` |
| 17. Restauration | 27 | 27-C | Garde d’environnement seulement |
| 18. Liste en moins de 4 secondes | 26 | 26-E | Pas un substitut de la mesure réelle |
| 19. Google / Facebook / Instagram réels, pas de doublon, téléphone avant candidature | 08, 09 | 08-A, 08-F, 09-A à 09-H | Résolveur de compte |
| 20. Alerte de correspondance in-app seulement, une fois | 18, 19 | 18-A à 18-D, 19-C | Filtre et unicité, zéro FCM |

## Matrice des exigences P1

| Exigence | Étape | Tests manuels | Automatisés | Recette |
| --- | --- | --- | --- | --- |
| BF-AUTH-01 | 08, 09 | 08-A, 09-A à 09-D | OAuth Google, Facebook, Instagram | 19 |
| BF-AUTH-02 | 08 | 08-A, 08-D | expiration | 19 |
| BF-AUTH-03 | 08 | 08-B | trois échecs | 19 |
| BF-AUTH-04 | 08, 09, 11 | 08-E, 11-E | unicité | 19 |
| BF-AUTH-05 | 08 | 08-F | rotation |  |
| BF-AUTH-06 | 09, 10 | 09-G, 10-A, 10-E, 10-G | guards, création admin |  |
| BF-AUTH-07 | 08, 11 | 08-A, 11-A |  |  |
| BF-AUTH-08 | 25 | 25-E, 25-F | changement |  |
| BF-AUTH-09 | 08, 24 | 08-A, 24-A | journal de coût |  |
| BF-AUTH-10 | 09 | 09-A, 09-H | vérif Google réelle | 19 |
| BF-AUTH-11 | 09 | 09-C, 09-D, 09-E | résolveur Meta | 19 |
| BF-AUTH-12 | 09, 11, 15 | 09-B, 11-A, 15-D | profil + guard | 19 |
| BF-AUTH-13 | 04, 08, 09 | 04-C, 08-F, 09-A | refus demo / secrets | 19 |
| BF-W-01 | 11 | 11-B, 11-C | disponibilités |  |
| BF-W-02 | 11, 15 | 11-A | profil incomplet |  |
| BF-W-03 | 15, 16 | 15-A, 16-D | historique |  |
| BF-W-04 | 25 | 25-B | anonymisation |  |
| BF-W-05 | 11, 23 | 23-G |  |  |
| BF-E-01 | 11 | 11-D |  |  |
| BF-E-02 | 12 | 12-C |  |  |
| BF-E-03 | 23 | 23-C, 23-D | badge |  |
| BF-E-04 | 11, 12 | 11-D, 11-F, 12-J | abonnement | 14 |
| BF-J-01 | 12 | 12-A, parcours |  |  |
| BF-J-02 | 12, 26 | 12-I, 26-C |  |  |
| BF-J-03 | 22 | 22-A, 22-C | droits | 12 |
| BF-J-04 | 12 | 12-B, 12-E | revue | 4 |
| BF-J-05 | 13, 22 | 13-F, 22-J | tri |  |
| BF-J-06 | 12 | 12-L | copie |  |
| BF-J-07 | 12, 13 | 12-K, 13-E | expiration | 3 |
| BF-J-08 | 12 | 12-H | version | 10 |
| BF-J-09 | 13 | 13-C, 13-D |  | 1, 3 |
| BF-S-01 | 13 | 13-A | filtres | 1 |
| BF-S-02 | 13 | 13-F | tri |  |
| BF-S-03 | 13 | 13-B, 13-C |  | 1 |
| BF-S-04 | 13, 14 | 14-B |  | 1 |
| BF-S-05 | 13 | 13-G | absence de tri mixte |  |
| BF-S-07 | 14, 17 | 14-A, 17-B | Haversine | 1, 8 |
| BF-A-01 | 15 | 15-A |  | 5 |
| BF-A-02 | 15 | 15-C | retrait | 5 |
| BF-A-03 | 16 | 16-E | déclin |  |
| BF-A-04 | 15 | 15-G | limite |  |
| BF-A-05 | 15, 16 | 15-A, 16-B |  |  |
| BF-SEL-01 | 16 | 16-C | DTO | 9 |
| BF-SEL-02 | 16 | 16-B, 16-D | version sur l’offre | 6 |
| BF-SEL-03 | 16 | 16-H, 16-J | parallèle | 6 |
| BF-SEL-04 | 16 | 16-F | expiration | 7 |
| BF-SEL-05 | 17, 20 | 17-G, 20-E | révocation | 11 |
| BF-M-01 | 20 | 20-A, 20-C | déclarations |  |
| BF-M-02 | 20 | 20-D | pas de paiement salaire |  |
| BF-M-03 | 20, 21 | 20-C, 21-A |  | 15 |
| BF-M-04 | 20 | 20-F, 20-H | DTO | 15 |
| BF-M-05 | 19 | 19-G | rappel in-app |  |
| BF-AD-01 | 10, 21 | 10-C, 21-D |  |  |
| BF-AD-02 | 12, 21 | 12-C, 21-C | file | 3, 4 |
| BF-AD-03 | 21 | 21-A, 21-B | priorité | 15 |
| BF-AD-04 | 06 | 06-A, 06-B | seed | 4 |
| BF-AD-05 | 22 | 22-D, 22-E | statuts paiement | 12 |
| BF-AD-06 | 22 | 22-F | unicité | 13 |
| BF-AD-07 | 23, 24 | 23-F, 24-A | métriques |  |
| BF-AD-08 | 23 | 23-D, 23-E | URL 5 min |  |
| BF-AD-09 | 10, 17, 22 | 10-A, 17-D, 22-B | audit |  |
| BF-AD-10 | 11 | 11-F |  | 14 |
| BF-AD-11 | 06, 22 | 06-D, 22-B, 22-I | interrupteur | 12 |

Hors matrice de réalisation, volontairement : BF-S-06 (P2), BF-W-06 (P3), BF-E-05 (P3).

## Cohérence à surveiller pendant la réalisation

- Les codes anglais de l’API sont ceux de `statuses.ts`. Les écrans n’affichent que les libellés français.
- Le DTO public, le cache Redis, les notifications, les logs et le service worker utilisent la même liste noire de champs.
- `workers_needed` n’est jamais modifié pour compter les places. Seul le calcul sous verrou fait foi.
- L’abonnement et l’interrupteur `services_payants` sont deux contrôles successifs, pas un seul.
- L’alerte `JOB_MATCH` n’a pas de canal autre que `IN_APP`, même après l’étape 19.
- Les notifications métier sont in-app uniquement (D36). Pas de dépendance push.
- Les coordonnées après annulation sont une 404, pas un corps vide qui garderait l’adresse dans un champ nul facile à confondre avec un succès d’affichage. Le client efface l’écran.
