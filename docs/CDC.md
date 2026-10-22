# CAHIER DES CHARGES — BOULOTFLASH

|                               |                                                       |
| ----------------------------- | ----------------------------------------------------- |
| Version                       | 1.4 — 22 octobre 2026                                 |
| Statut                        | Périmètre consolidé à valider avant développement     |
| Marché initial                | RDC, une ville pilote et quelques communes voisines   |
| Ville proposée                | Kinshasa, communes à choisir après entretiens terrain |
| Langue du produit (lancement) | Français                                              |
| Document                      | Cahier des charges fonctionnel et technique           |

Ce document consolide deux visions de BoulotFlash. Le détail déjà posé (parcours, statuts, S3, admin, notifications) reste la base. Le pilote reprend les choix les plus prudents : modération des nouveaux recruteurs, sélection acceptée avant échange des coordonnées, retours privés, et services recruteur gratuits tant qu’un administrateur n’a pas activé le paiement. Les catégories couvrent un large spectre de missions courtes. Les chiffres de tarif, de quota et de délai sont des **hypothèses de travail** (section 23).

---

## 1. Présentation du projet

### 1.1 Nom du projet

BoulotFlash

Domaine : [boulotflash.com](https://boulotflash.com)

### 1.2 Slogan

« Trouvez un travail aujourd’hui. »

Promesse affichée :

« Trouvez une mission près de chez vous. Recrutez une aide pour quelques heures ou quelques jours. »

### 1.3 Promesse

Un recruteur publie une mission courte avec un montant, un lieu approximatif et des conditions lisibles. Un candidat dont le profil est rempli postule en quelques étapes. Les coordonnées et l’adresse exacte n’apparaissent qu’après acceptation d’une place. BoulotFlash facilite la mise en relation. Il ne promet ni un recrutement, ni un salaire garanti, ni un arbitrage juridique.

### 1.4 Résumé

BoulotFlash met en relation des personnes disponibles pour une mission courte avec des particuliers, commerces, artisans et entreprises qui ont un besoin ponctuel.

Exemples : servir lors d’un événement, livrer un colis, aider à un déménagement, tenir une boutique, garder un enfant, dépanner une fuite, saisir des données, animer une vente ou donner un cours.

La plateforme permet de publier, consulter, modérer, candidater, sélectionner et clôturer une mission. Le lancement couvre une ville et quelques communes voisines. L’inscription est réservée aux 18 ans et plus.

BoulotFlash ne remplace pas le contrat de travail. Il structure des missions de quelques heures ou de quelques jours.

### 1.5 Problème à résoudre

Hypothèses à vérifier sur le terrain, auprès d’environ 10 recruteurs et 20 candidats de la zone choisie :

- Les candidats disposent de peu de canaux structurés pour trouver des missions ponctuelles. Le bouche-à-oreille, WhatsApp et l’affichage informel dominent.
- Les recruteurs perdent du temps à chercher une personne disponible et adaptée.
- Le bouche-à-oreille rend difficiles la comparaison des offres et la clarification des conditions.
- Il n’existe pas de canal commun, limité à une ville, pour les missions de quelques heures ou de quelques jours.

Conséquences si ces hypothèses se confirment :

| Côté      | Difficulté concrète                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------ |
| Candidat  | L’information arrive trop tard, souvent dans un groupe WhatsApp saturé, sans commune ni tâche précise. |
| Candidat  | Une offre floue oblige à se déplacer avant de connaître le montant, l’heure et le lieu.                |
| Recruteur | Les personnes recommandées ne sont pas toujours disponibles le jour même.                              |
| Recruteur | Les conditions se négocient après coup, ce qui multiplie les échanges inutiles.                        |
| Les deux  | Les arnaques, notamment les demandes d’argent avant la mission, circulent sans modération.             |
| Les deux  | Le paiement et le lieu de rendez-vous se règlent de façon floue, ce qui crée des désaccords.           |

### 1.6 Solution proposée

BoulotFlash apporte des annonces structurées : tâche, lieu approximatif, date, durée, rémunération obligatoire, nombre de personnes et conditions. Le candidat postule avec un profil court, sans CV.

Différenciation du pilote : rémunération obligatoire, recherche par commune, disponibilité visible, candidature simple, gratuité totale pour les candidats.

La plateforme intègre :

- Un profil candidat court, créable après connexion OAuth.
- Une recherche par ville, commune, catégorie, date, devise et mots-clés.
- Une candidature avec confirmation de disponibilité, une seule fois par mission.
- Une sélection en deux temps : le recruteur propose une place, le candidat accepte ou décline.
- Des notifications **uniquement dans l’application** (centre in-app). Pas de push Firebase pour le pilote. Une nouvelle offre qui correspond au profil est une notification in-app.
- Des retours privés, utilisés par la modération. Pas de note publique au lancement.
- Des badges qui décrivent un contrôle effectué, sans garantir le paiement ni la qualité.
- Le suivi de la mission jusqu’à la déclaration de réalisation, d’annulation ou d’absence.
- Le paiement direct du salaire entre les parties. BoulotFlash encaisse seulement ses propres services.
- La modération des nouveaux recruteurs et des signalements.
- Un tableau de bord pour l’équipe BoulotFlash.

### 1.7 Principes produit

1. **Le compte s’ouvre par Google, Facebook ou Instagram (connexion réelle uniquement).** L’e-mail, le numéro et la photo sont repris du provider lorsqu’ils sont présents. Ce qui manque est complété par l’utilisateur sur son profil après connexion. Le compte est créé s’il n’existe pas encore. Lier plusieurs providers est possible quand l’e-mail vérifié concorde. Cela ne vérifie pas l’identité civile. Sans numéro (provider ou profil), candidature et publication restent bloquées. Les comptes internes BoulotFlash sont créés par un administrateur, pas par OAuth.
2. **Mobile d’abord, réseau faible.** L’application web est responsive et installable (PWA). Chaque écran utile tient sur 360 px.
3. **Les conditions sont connues avant la candidature.** Le montant, la durée, le lieu approximatif et les prises en charge sont obligatoires. « À discuter » ne remplace pas un montant.
4. **Le candidat ne paie jamais.** Aucun frais de candidature, de déblocage d’offre ou d’achat de contact. Une limite anti-spam reste gratuite.
5. **L’adresse exacte et le numéro se révèlent après acceptation de la place.** Avant cela, la commune, un repère public, une carte et la distance suffisent. La distance est la distance à vol d’oiseau en kilomètres, calculée comme dans (formule de Haversine), entre la position ponctuelle du candidat et le point public de la mission. La carte est Leaflet, avec les tuiles OpenStreetMap, ou MapTiler si une clé est fournie. Le repère public est géocodé avec Nominatim. Le point exact et le numéro n’apparaissent qu’après acceptation. La position du candidat n’est pas historisée et il n’y a pas de suivi continu.
6. **Les conditions acceptées sont figées.** Une modification importante crée une nouvelle version, repart en validation et demande une nouvelle acceptation. Elle ne remplace pas silencieusement une sélection déjà acceptée.
7. **Les badges décrivent un contrôle, pas une garantie.** « Téléphone confirmé » et « structure contrôlée » ne promettent ni le paiement ni la qualité de la mission.
8. **Le recruteur a un abonnement actif.** Sans abonnement actif, il ne crée pas d’annonce, ne met pas en avant et n’utilise pas les autres services recruteur. Au départ ces services sont gratuits. Ils deviennent payants seulement si un administrateur BoulotFlash active l’option. Le candidat ne paie jamais. Le salaire reste entre les parties.
9. **Les notifications passent uniquement par le centre in-app.** Le centre garde l’historique (lu / non lu). Aucun push Firebase Cloud Messaging dans le pilote. Une nouvelle offre qui correspond au profil reste in-app, sans e-mail. Il n’y a plus d’OTP de connexion publique.
10. **Une ville, quelques communes.** Kinshasa est la ville proposée. Les communes actives se choisissent après les entretiens terrain. La carte du pilote reprend : Leaflet, OpenStreetMap, MapTiler en option, Nominatim et Haversine. Pas d’itinéraire routier payant.
11. **BoulotFlash met en relation.** Il ne promet pas un recrutement, un salaire garanti ou un arbitrage juridique.

### 1.8 Objectifs

#### Objectif principal

Faciliter l’accès rapide des jeunes aux opportunités d’emploi court terme tout en aidant les employeurs à trouver rapidement une main-d’œuvre fiable.

#### Objectifs de la première version

- Permettre de publier, consulter, modérer et pourvoir une mission.
- Réduire les échanges inutiles en précisant les conditions avant candidature.
- Tester si les recruteurs reviennent et acceptent de payer.
- Mesurer les mises en relation réellement utiles, pas seulement les inscriptions.

#### Objectifs d’usage

- Un recruteur crée une annonce simple en moins de cinq minutes.
- Un candidat dont le profil est rempli postule en quelques étapes.
- Une republication, une fois le recruteur habitué, tient en moins de deux minutes.
- Les coordonnées privées restent invisibles tant que la place n’est pas acceptée.

Le nombre d’inscriptions ne valide pas le projet. Le signal principal est la répétition de recrutements utiles et payants. Les indicateurs du pilote sont en section 16. L’extension à d’autres communes n’est décidée qu’après ce signal, un traitement maîtrisé des signalements et une volonté de payer constatée.

---

## 2. Cibles et utilisateurs

Dans l’interface, les rôles s’appellent **visiteur**, **candidat**, **recruteur** et **administrateur**. Dans ce CDC, « travailleur » désigne le candidat et « employeur » désigne le recruteur. Un même compte peut activer les deux modes. Les droits restent distincts.

| Rôle           | Droits principaux                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Visiteur       | Consulter les offres publiques et les informations de fonctionnement. Aucune coordonnée privée.                                     |
| Candidat       | Gérer son profil, postuler, retirer une candidature, accepter ou décliner une place, signaler un problème.                          |
| Recruteur      | Gérer son profil, publier des missions, consulter les candidatures de ses missions, présélectionner, refuser ou proposer une place. |
| Administrateur | Modérer, traiter les signalements, gérer les comptes et vérifier les paiements commerciaux.                                         |

### 2.1 Travailleurs

- Jeunes sans emploi ou en sous-emploi.
- Étudiants recherchant des missions ponctuelles.
- Femmes cherchant des activités flexibles.
- Travailleurs informels : manœuvres, aides-ménagères, livreurs, vendeurs, chauffeurs.
- Jeunes diplômés recherchant une première expérience.

Profil d’usage : smartphone Android d’entrée de gamme, forfait data limité, WhatsApp déjà installé, lecture du français simple, parfois plus à l’aise à l’oral en lingala. Le travailleur ouvre BoulotFlash plusieurs fois par jour, souvent entre deux déplacements, pour voir « ce qui sort aujourd’hui dans ma commune ».

### 2.2 Employeurs

Au pilote : particuliers, commerces, artisans, restaurants, ménages, chantiers légers, écoles, organisateurs d’événements et petites structures. Ils recrutent sur le référentiel large de la section 6, pas sur une seule couche de métiers.

Plus tard, si le pilote le justifie : livraison, chantiers, agences, ONG, écoles. Ces besoins ne dictent pas les catégories du lancement.

Deux rythmes d’usage coexistent :

- **Besoin immédiat.** Un restaurant cherche deux serveurs pour ce soir. Un commerce cherche deux personnes pour un inventaire demain matin.
- **Besoin récurrent.** Une boutique renouvelle une équipe de vente chaque semaine. Elle le fait avec le même abonnement. Le paiement de cet abonnement ne s’applique que lorsque l’administrateur a activé les services payants.

### 2.3 Administrateurs

Équipe BoulotFlash chargée de la modération, du support, des paiements et des statistiques.

Rôles internes, distincts du rôle public « administrateur » :

| Rôle interne         | Peut                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Support              | Lire un compte, répondre à un litige, traiter un changement de numéro, sans supprimer de données.                 |
| Modérateur           | Suspendre une offre, traiter un signalement, masquer un avis abusif.                              |
| Finance              | Voir les paiements, rapprocher une référence mobile money, marquer un paiement manuel comme reçu. |
| Super-administrateur | Gérer les comptes internes, les catégories, les communes, les tarifs et les exports.              |

### 2.4 Personas

Ces personas sont des archétypes de conception, pas des personnes réelles.

**Grâce, 22 ans, Lemba — étudiante et travailleuse ponctuelle.**  
Elle veut des missions de vente, d’événementiel ou de saisie qui tiennent dans son emploi du temps. Elle candidate depuis le téléphone, souvent le matin. Elle a besoin de savoir tout de suite si elle est retenue, à quelle heure se présenter, et combien elle sera payée. Elle abandonne si le formulaire demande un CV avant la première candidature.

**Patrick, 29 ans, Ngaliema — manutention et déménagement léger.**  
Il enchaîne les missions physiques. Son atout est sa disponibilité, pas un diplôme. Il lit peu : montant, commune, heure et durée doivent suffire sur la carte d’offre.

**Sarah, gérante d’un restaurant à Gombe.**  
Elle a besoin de deux extras le vendredi soir. Elle publie depuis son téléphone entre deux services. Elle propose une place, le candidat accepte, puis elle ouvre l’appel ou WhatsApp. La mise en avant est disponible dans son abonnement. Elle ne paie que si l’administrateur a activé les services payants.

**David, responsable d’une boutique.**  
Il recrute pour des inventaires et de la saisie. Il le fait avec un abonnement actif. Au départ, créer une annonce et la mettre en avant ne lui coûte rien.

### 2.5 Ce que chaque utilisateur vient chercher

| Utilisateur | Succès pour lui                                                                       | Échec à éviter                                          |
| ----------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Travailleur | Une mission confirmée aujourd’hui ou demain, près de chez lui, avec un montant clair. | Se déplacer pour une offre déjà pourvue ou frauduleuse. |
| Employeur   | Une personne présente à l’heure, joignable, avec un minimum de preuves de sérieux.    | Perdre la journée à trier des profils vides.            |
| Admin       | Une file de signalements traitée, des paiements rapprochés, peu de fraudes publiques. | Découvrir une arnaque après des dizaines de victimes.   |

---

## 3. Périmètre

### 3.1 Dans le MVP

- Inscription candidat et recruteur par Google, Facebook ou Instagram, avec confirmation de majorité.
- Profils courts. Photo et expérience facultatives. Pas de CV. Pas de pièce d’identité candidat.
- Publication avec rémunération obligatoire, modération des nouveaux recruteurs, recherche et page partageable.
- Candidature, présélection, proposition de place, acceptation ou refus, libération de la place à l’expiration.
- Révélation des coordonnées et de l’adresse exacte seulement après acceptation, avec bouton d’appel et bouton WhatsApp sans message automatique.
- Déclaration de réalisation, d’annulation ou d’absence par chaque partie. Retours privés pour la modération.
- Notifications in-app seulement (pas de push). Une nouvelle offre correspondant au profil est une notification in-app.
- Administration : annonces, signalements, zones, catégories, justificatifs recruteurs, abonnements et interrupteur des services payants.
- Abonnement recruteur obligatoire. Création d’annonce, mise en avant et autres services recruteur gratuits tant que l’administrateur n’a pas activé le paiement.
- Salaire payé directement entre les parties.

### 3.2 Après validation du pilote

- Facturation automatique des services, après que l’administrateur a déjà activé le paiement manuel.
- Comptes d’entreprise à plusieurs collaborateurs.
- Encaissement automatique des services BoulotFlash.
- Profils en langues locales si le terrain le demande.
- Rapprochement simple par compétence et disponibilité.
- Notes ou recommandations publiques, avec procédure de contestation, et score de fiabilité.
- Badges avancés, seulement s’ils décrivent un contrôle réel.
- Application mobile native si l’usage justifie son coût.
- Autres communes, puis d’autres villes.
- CV généré, orientation vers une formation, agents relais.

### 3.3 Hors du lancement

- Recrutement CDI, paie, portefeuille, séquestre, crédit et commission prélevée sur les salaires.
- Contrat de travail généré par la plateforme.
- Géolocalisation continue du candidat et calcul d’itinéraire routier payant. La carte et la distance à vol d’oiseau font partie du pilote.
- Messagerie interne en temps réel. Le contact passe par l’appel ou WhatsApp après acceptation.
- Application iOS ou Android séparée.
- Microservices et IA pour publier, rechercher ou sélectionner.
- Frais demandés au candidat.
- Missions illégales, travail en hauteur et chantier lourd. L’inscription est réservée aux 18 ans et plus. Les mineurs ne sont pas des travailleurs sur la plateforme.
- Actes médicaux. BoulotFlash ne certifie aucun diplôme. Les métiers techniques du référentiel restent des missions courtes, avec la mention que l’employeur vérifie le savoir-faire.
- Notes publiques automatiques.

---

## 4. Parcours utilisateurs

### 4.1 Parcours candidat — de l’inscription à la mission

1. Il choisit **Continuer avec Google**, **Continuer avec Facebook** ou **Continuer avec Instagram**. Le provider authentifie l’utilisateur. Le compte BoulotFlash est créé s’il n’existe pas, sinon la session ouvre le compte existant. E-mail, téléphone et photo sont repris du provider quand ils sont fournis. Il confirme avoir 18 ans ou plus et accepte les règles.
2. Il complète le minimum : nom d’usage, ville, commune, une compétence, disponibilités. La photo et l’expérience sont facultatives.
3. L’accueil montre les missions ouvertes, les plus récentes d’abord. Il filtre par commune, catégorie, date et devise.
4. Il ouvre une offre partageable : montant, base de calcul, horaire, durée, commune, repère public, distance en kilomètres et carte du point public. L’adresse exacte et le téléphone restent masqués. Le marqueur exact n’est pas sur cette carte.
5. Il confirme sa disponibilité et postule. Un message est facultatif. Une seconde candidature active sur la même mission est impossible.
6. Le recruteur peut le présélectionner, le refuser ou lui proposer une place avec une échéance.
7. Il accepte ou décline avant l’échéance. Tant qu’il n’a pas accepté, aucune coordonnée n’est échangée.
8. Après acceptation, les deux parties voient le numéro nécessaire et l’adresse exacte. Un bouton ouvre l’appel. Un autre ouvre WhatsApp, sans envoyer de message tout seul.
9. Chacun peut ensuite déclarer la réalisation, l’annulation ou une absence. Le recruteur peut déclarer avoir payé. Le candidat confirme la réception ou la conteste. Cette déclaration n’est pas une preuve bancaire.
10. Chacun peut laisser un retour privé, visible de la modération, et signaler un problème.

### 4.2 Parcours recruteur — publier et choisir

1. Il crée un compte par Google, Facebook ou Instagram, puis active le mode recruteur. Le même compte peut aussi garder le mode candidat.
2. Il renseigne le responsable, le type, le nom de structure s’il y a lieu, la ville, la commune et une courte présentation.
3. La création du profil recruteur ouvre un abonnement actif et gratuit. Sans abonnement actif, les services recruteur restent fermés.
4. Le formulaire demande la tâche, le lieu public, le moment, le montant, le mode et le moment de paiement, les prises en charge et les échéances. Cible : moins de cinq minutes.
5. Tant que l’administrateur n’a pas activé les services payants, l’annonce et la mise en avant partent sans paiement. Si l’option est active, rien n’est livré tant que le paiement n’est pas confirmé. Dès que l’offre est publiée, il peut partager son lien.
6. Chaque candidature crée une notification interne. Il ne voit que les candidatures de ses missions.
7. Il présélectionne, refuse ou propose une place. Une proposition réserve la place jusqu’au refus ou à l’expiration. Il ne peut pas confirmer plus de personnes que de places.
8. À l’acceptation du candidat, la mission est confirmée et les coordonnées s’ouvrent. Si toutes les places sont acceptées, la mission est pourvue.
9. Le jour J, chaque partie peut déclarer un démarrage, une absence, une annulation ou une réalisation.
10. Il peut republier une copie. Les candidatures et les conditions déjà acceptées ne sont pas recopiées.

### 4.3 Parcours administrateur — tenir la confiance

1. Il se connecte avec un compte nominatif, un mot de passe et un second facteur.
2. La file du matin montre : annonces de nouveaux recruteurs, signalements ouverts, paiements à rapprocher, comptes signalés plusieurs fois.
3. Il approuve, refuse avec un motif, ou demande un complément.
4. Il traite un signalement : classer sans suite, masquer l’offre, suspendre le compte, ou escalader au support.
5. Il exporte un CSV des inscriptions, offres et paiements de la période.

### 4.4 Cas qui doivent rester simples

| Situation                                             | Comportement attendu                                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Le réseau coupe pendant une candidature               | L’écran ne dit « envoyée » qu’après confirmation du serveur.                                                                                                 |
| L’employeur veut la même mission la semaine suivante  | « Republier » reprend les champs et ouvre un brouillon. Les anciennes candidatures ne suivent pas.                                                           |
| Deux places, cinq candidats                           | Deux propositions peuvent réserver les deux places. Les autres restent soumises. Un refus ou une expiration libère la place.                                 |
| Le candidat accepte puis le recruteur annule          | Les participants sont prévenus. L’accès futur aux coordonnées est retiré selon la durée de conservation. Les conditions acceptées restent dans l’historique. |
| Le candidat ne vient pas                              | Le recruteur déclare une absence. Le candidat peut contester. Le désaccord est enregistré et peut devenir un signalement.                                    |
| Le recruteur change le montant après des acceptations | Les conditions déjà acceptées restent celles d’origine. La nouvelle version repart en validation et exige une nouvelle acceptation pour les autres.          |

---

## 5. Exigences fonctionnelles

Les identifiants servent de référence pour les tickets de réalisation. Priorité : **P1** indispensable au MVP, **P2** phase 2, **P3** phase 3.

### 5.1 Compte et authentification

| ID         | Exigence                                                                                                                                                                                         | Priorité |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BF-AUTH-01 | Inscription et connexion uniquement par **Continuer avec Google**, **Continuer avec Facebook** ou **Continuer avec Instagram**. Les trois boutons sont sur le premier écran. Pas d’OTP public. | P1 |
| BF-AUTH-02 | L’API vérifie côté serveur le jeton ou le code OAuth du provider. Elle refuse un jeton invalide, expiré ou dont l’e-mail n’est pas vérifié quand le provider en fournit un. | P1 |
| BF-AUTH-03 | À la première connexion réussie, le compte est créé. Aux suivantes, le même compte est rouvert. | P1 |
| BF-AUTH-04 | Un couple `(provider, provider_user_id)` correspond à un seul compte. Un e-mail vérifié déjà porté par un compte rattache le nouveau provider à ce compte, sans second utilisateur. Le compte peut porter un profil travailleur, un profil employeur, ou les deux. | P1 |
| BF-AUTH-05 | Session par jeton JWT, durée de vie courte, renouvellement par jeton de rafraîchissement. Déconnexion possible. | P1 |
| BF-AUTH-06 | Les comptes internes (support, modo, finance, super) sont **créés uniquement par un administrateur BoulotFlash** (super). Connexion admin : identifiant, mot de passe et second facteur. Aucun provider OAuth public ne crée ni n’ouvre un compte admin. | P1 |
| BF-AUTH-07 | Nom d’usage et confirmation de majorité. La date de naissance n’est pas publiée. Acceptation des règles et accès à la politique de confidentialité avant la première candidature ou publication. Le nom et la photo peuvent être préremplis depuis le provider ; l’utilisateur complète ce qui manque sur son profil après connexion. | P1 |
| BF-AUTH-08 | Changement de numéro déjà renseigné : revue support. Le délai de 90 jours des comptes fermés s’applique aussi aux e-mails et aux identifiants provider. | P1 |
| BF-AUTH-09 | Chaque tentative OAuth échouée ou réussie est journalisée sans secret (provider, code d’erreur, pas de jeton). | P1 |
| BF-AUTH-10 | **Continuer avec Google** : vérification **réelle** du jeton Google auprès de Google. Enregistrement de l’identifiant Google, e-mail et photo quand fournis. Aucun mot de passe Google n’est stocké. Aucun mode simulé. | P1 |
| BF-AUTH-11 | **Continuer avec Facebook** et **Continuer avec Instagram** : vérification **réelle** via l’app Meta. Enregistrement de l’identifiant provider, e-mail et photo quand fournis. Instagram via Meta. Aucun mode simulé. | P1 |
| BF-AUTH-12 | E-mail, téléphone et photo : repris du provider s’ils sont présents. Sinon l’utilisateur les renseigne sur son profil après connexion. Avant candidature ou publication : `phone` non null (format `+243` pour le pilote). Ce numéro est celui révélé après acceptation d’une place. Sans numéro, `PHONE_REQUIRED`. | P1 |
| BF-AUTH-13 | La connexion OAuth est toujours réelle (Google et Meta). Ni l’environnement de test ni la production n’autorisent un adaptateur simulé, des jetons `demo:` ou un contournement local. | P1 |

Règles d’interface : le premier écran propose uniquement les trois boutons OAuth, chacun avec le **logo officiel du provider** (Google, Facebook, Instagram) à gauche du libellé « Continuer avec… ». Après connexion, un parcours « Compléter mon profil » demande les champs absents du provider (nom, téléphone, photo facultative). Aucun mot de passe public. Les comptes internes sont créés par l’admin BoulotFlash, jamais par OAuth. Une connexion OAuth ne constitue pas une vérification d’identité civile. Les secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `META_APP_ID`, `META_APP_SECRET`) restent hors du dépôt. Guide consoles : [implementation/AUTH_OAUTH_PROVIDERS.md](implementation/AUTH_OAUTH_PROVIDERS.md). Logos UI : `design/brand/oauth/`.

### 5.2 Profil travailleur

Champs :

| Champ                 | Obligatoire pour candidater | Détail                                                                                              |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| Nom affiché           | Oui                         | Nom d’usage, 2 à 80 caractères. La date de naissance n’est pas demandée.                            |
| Photo                 | Non                         | JPEG, PNG ou WebP, 5 Mo maximum, recadrage carré.                                                   |
| Compétence principale | Oui                         | Une catégorie active du pilote.                                                                     |
| Autres compétences    | Non                         | Parmi les catégories actives.                                                                       |
| Ville et commune      | Oui                         | Une commune desservie par le pilote.                                                                |
| Présentation          | Non                         | 280 caractères maximum.                                                                             |
| Expérience            | Non                         | Texte court. Le CV n’est pas demandé.                                                               |
| Disponibilité         | Oui                         | Jours et créneaux : matin, après-midi, soir. Le candidat peut la désactiver sans fermer son compte. |

| ID      | Exigence                                                                                                                           | Priorité |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BF-W-01 | Le candidat modifie son profil, ses disponibilités, et peut désactiver sa disponibilité.                                           | P1       |
| BF-W-02 | Le profil incomplet affiche les manques et bloque uniquement la candidature, pas la consultation des offres.                       | P1       |
| BF-W-03 | L’historique liste les candidatures, les propositions et les missions avec leur statut, la date, la commune et le montant accepté. | P1       |
| BF-W-04 | Le candidat demande la suppression de son compte. Le numéro et toute adresse précise ne sont jamais publics.                       | P1       |
| BF-W-05 | Aucune pièce d’identité n’est demandée au candidat par défaut.                                                                     | P1       |
| BF-W-06 | Génération d’un CV d’une page à partir du profil et des missions BoulotFlash.                                                         | P3       |

### 5.3 Profil employeur

| Champ                | Obligatoire pour publier | Détail                                                                 |
| -------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Type                 | Oui                      | Particulier, commerce, artisan ou organisation.                        |
| Nom du responsable   | Oui                      | Nom d’usage du compte recruteur.                                       |
| Nom de structure     | Si organisation          | Enseigne ou raison visible.                                            |
| Ville et commune     | Oui                      | Dans les zones desservies.                                             |
| Présentation         | Non                      | Texte court.                                                           |
| Adresse de mission   | Oui, privée              | Révélée seulement aux candidats dont la place est acceptée.            |
| Téléphone de mission | Oui, privé               | Par défaut le numéro du compte. Jamais affiché sur l’annonce publique. |

| ID      | Exigence                                                                                                                                                                                                     | Priorité |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BF-E-01 | Création du profil recruteur juste après la connexion OAuth (Google, Facebook ou Instagram). | P1 |
| BF-E-02 | Historique des offres avec statut, nombre de candidatures, places acceptées et état de l’abonnement. | P1 |
| BF-E-03 | Badges limités aux contrôles faits : « téléphone confirmé » ou « structure contrôlée ». Ils ne garantissent ni le paiement ni la qualité. Les justificatifs restent privés, accessibles au rôle de contrôle. | P1 |
| BF-E-04 | Sans abonnement `ACTIF`, le recruteur ne crée pas d’annonce, ne met pas en avant et n’utilise pas les autres services recruteur. L’ouverture du profil crée un abonnement gratuit et actif. | P1 |
| BF-E-05 | Plusieurs membres sur un compte organisation. | P3 |

### 5.4 Offres

Champs obligatoires :

- Titre, catégorie et description concrète des tâches.
- Ville, commune et repère général public. L’adresse exacte est un champ privé.
- Date, heure de début et durée estimée.
- Nombre de personnes recherchées.
- Montant, devise CDF ou USD, et base : heure, journée ou mission. Un texte « à discuter » est refusé.
- Mode de paiement prévu (espèces ou mobile money) et moment prévu (début, fin, autre précisé).
- Compétences nécessaires et conditions matérielles.
- Prise en charge du transport, des repas et des équipements : oui, non, ou partiel, avec une précision courte.
- Date limite de candidature et date de clôture des sélections.

| ID      | Exigence                                                                                                                                                                                                                                                | Priorité |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BF-J-01 | Publication guidée. Cible : moins de 5 minutes la première fois, moins de 2 minutes pour une republication.                                                                                                                                             | P1       |
| BF-J-02 | Brouillon conservé jusqu’à l’envoi. L’offre n’est pas présentée comme publiée avant la réponse du serveur.                                                                                                                                              | P1       |
| BF-J-03 | Créer une annonce, mettre en avant et les autres services recruteur exigent un abonnement actif. Ils sont gratuits tant que l’option « services payants » est désactivée. | P1 |
| BF-J-04 | Tout nouveau recruteur est modéré avant sa première publication. Une catégorie sensible repart en revue même si le recruteur a déjà publié. Un recruteur suspendu ne publie pas et ne peut pas acheter une mise en avant pour contourner la suspension. | P1       |
| BF-J-05 | Mise en avant payante, identifiée comme telle, retirée des emplacements sponsorisés dès que l’offre est close, pourvue, expirée ou suspendue.                                                                                                           | P1       |
| BF-J-06 | Republier copie les champs et ouvre un brouillon. Les candidatures anciennes ne sont pas recopiées.                                                                                                                                                     | P1       |
| BF-J-07 | La clôture des candidatures n’annule pas une mission dont des places sont déjà acceptées. L’offre expire si la date limite est passée et qu’aucune place n’est acceptée.                                                                                | P1       |
| BF-J-08 | Une modification substantielle (montant, date, durée, lieu, tâches, prises en charge) crée une nouvelle version, repart en validation et prévient les candidats concernés. Les conditions déjà acceptées restent archivées. | P1 |
| BF-J-09 | Une offre `PUBLIÉE` a un lien public stable. Le recruteur, et toute personne qui voit l’offre, peut le partager. Le bouton **Partager** copie le lien et ouvre la feuille de partage du téléphone quand elle existe. Aucun message n’est envoyé tout seul. | P1 |

Contrôles à la publication :

- La date de début est dans le futur, au plus tard dans 30 jours pour le MVP.
- La durée est comprise entre 1 heure et 14 jours.
- Le nombre de personnes est compris entre 1 et 20 au pilote.
- Le montant est strictement positif. Pas de fourchette qui permettrait d’écrire un montant fictif à côté d’un « à discuter ».
- La date limite de candidature précède la clôture des sélections, qui précède ou égale le début de mission.
- Le titre et la description passent un filtre de mots interdits (versement préalable du candidat, acompte, frais de dossier, promesses de visa).
- Deux offres identiques du même recruteur dans la même heure sont refusées.
- La catégorie fait partie du référentiel actif de la section 6.

Le lien partagé ouvre la page publique de l’offre. Elle montre le titre, la catégorie, le montant, la date, la commune, le repère, la distance et la carte du point public. Elle ne montre ni l’adresse exacte, ni le téléphone, ni les candidatures. Une offre en brouillon, en modération, rejetée ou suspendue n’a pas de lien public : le bouton **Partager** est absent. Si l’offre est ensuite pourvue, expirée ou annulée, le lien reste ouvrable et indique qu’elle n’accepte plus de candidature, toujours sans coordonnées privées.

### 5.5 Recherche et découverte

| ID      | Exigence                                                                                                                                                                   | Priorité |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BF-S-01 | Liste des missions ouvertes, filtrable par ville, commune, catégorie, date et devise.                                                                                      | P1       |
| BF-S-02 | Tri par défaut : date de publication, la plus récente d’abord. Les mises en avant identifiées précèdent ce tri seulement pendant leur période active.                      | P1       |
| BF-S-03 | Recherche par mots-clés sur le titre et la description. La page de détail d’une offre publiée est publique, avec un bouton **Partager** pour son lien. | P1 |
| BF-S-04 | Carte d’offre : catégorie, montant, devise, base de calcul, commune, heure, distance en km si la position est connue, places restantes, mention sponsorisée s’il y a lieu. | P1       |
| BF-S-05 | Aucun classement qui compare des montants CDF et USD tant qu’une règle de conversion n’est pas publiée.                                                                    | P1       |
| BF-S-06 | Alertes enregistrées de nouvelles offres.                                                                                                                                  | P2       |
| BF-S-07 | Carte Leaflet de la mission et distance à vol d’oiseau. Avant acceptation : point public seulement. Après acceptation : point de l’adresse exacte.                         | P1       |

La position vient d’une demande ponctuelle au navigateur, comme le bouton de localisation de . Elle sert au calcul et n’est pas enregistrée. Sans permission, la liste reste filtrable par commune et la distance affiche « position non partagée ».

Le repère public est envoyé à Nominatim (`https://nominatim.openstreetmap.org/search`, langue `fr`, cache 5 minutes, User-Agent identifiant BoulotFlash). Les coordonnées publiques sont stockées sur l’offre. L’adresse exacte est géocodée de la même façon, et ses coordonnées ne sortent de l’API qu’après acceptation. La distance est calculée dans l’application avec Haversine, rayon terrestre 6 371 km, arrondie au dixième de kilomètre. Les tuiles sont OpenStreetMap. Si `NEXT_PUBLIC_MAPTILER_API_KEY` est définie, les tuiles MapTiler remplacent OpenStreetMap, comme sur la carte flotte de .

### 5.6 Candidature et sélection

1. Le candidat consulte les conditions et confirme sa disponibilité.
2. Il postule avec son profil et un message facultatif.
3. Le recruteur consulte uniquement les candidatures de ses missions.
4. Il présélectionne, refuse ou propose une place.
5. Le candidat accepte ou décline avant l’échéance indiquée.
6. Après acceptation, les coordonnées nécessaires et l’adresse exacte deviennent accessibles aux deux parties concernées.
7. Un bouton ouvre un appel. Un bouton ouvre une conversation WhatsApp, sans envoi automatique de message.

Une seule candidature active est autorisée par personne et par mission. Le système empêche de confirmer plus de candidats que de places. Une place réservée par une proposition en attente est libérée au refus ou à l’expiration.

Les conditions acceptées sont conservées dans l’historique. Toute nouvelle proposition après modification exige une nouvelle acceptation.

Un candidat postule uniquement si :

- Son compte est actif et sa disponibilité n’est pas désactivée.
- Son profil contient une compétence, une commune desservie et l’acceptation des règles.
- La mission est `PUBLIÉE` et la date limite de candidature n’est pas passée.
- Il n’a pas atteint la limite anti-spam.
- Il ne postule pas à sa propre mission.

| ID        | Exigence                                                                                                                                           | Priorité |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BF-A-01   | Candidature en quelques étapes, avec confirmation explicite de disponibilité. Statut `SOUMISE`.                                                    | P1       |
| BF-A-02   | Le candidat retire une candidature `SOUMISE` ou `PRÉSÉLECTIONNÉE` sans pénalité.                                                                   | P1       |
| BF-A-03   | Le candidat décline une proposition. La place se libère.                                                                                           | P1       |
| BF-A-04   | Limite anti-spam proposée : 5 candidatures par jour glissant. Aucun paiement ne lève cette limite.                                                 | P1       |
| BF-A-05   | Le candidat voit le statut de chaque candidature et l’échéance d’une proposition.                                                                  | P1       |
| BF-SEL-01 | Le recruteur voit le nom d’usage, la commune, les compétences, la disponibilité et le badge téléphone. Il ne voit pas le numéro avant acceptation. | P1       |
| BF-SEL-02 | Une proposition indique l’échéance, réserve une place et fige la version des conditions.                                                           | P1       |
| BF-SEL-03 | Deux acceptations simultanées ne dépassent pas les places. La seconde échoue et la place n’est pas doublée.                                        | P1       |
| BF-SEL-04 | Une proposition expirée ne peut plus être acceptée et libère sa place.                                                                             | P1       |
| BF-SEL-05 | Annulation après acceptation : les participants sont prévenus. L’accès futur aux coordonnées est révoqué selon la conservation définie.            | P1       |

### 5.7 Fin de mission et retours

| ID      | Exigence                                                                                                                                                                | Priorité |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BF-M-01 | Chaque partie peut déclarer la réalisation, l’annulation ou une absence.                                                                                                | P1       |
| BF-M-02 | Le recruteur déclare le paiement. Le candidat confirme la réception ou la conteste. Cette déclaration ne vaut pas preuve bancaire.                                      | P1       |
| BF-M-03 | Un désaccord est enregistré et peut ouvrir un signalement.                                                                                                              | P1       |
| BF-M-04 | Les retours sont privés. Ils servent à la modération. Aucune note publique n’est calculée ni affichée au lancement.                                                     | P1       |
| BF-M-05 | Rappel interne avant le début pour les places acceptées. Hypothèse : 3 heures avant. Un message externe n’est envoyé que si ce rappel est classé prioritaire au pilote. | P1       |

### 5.8 Signalement

Le candidat ou le recruteur signale une offre, un profil ou un échange de sélection.

Motifs : demande d’argent, fausse offre, harcèlement, danger, absence, rémunération contestée, autre.

Le signalement contient le motif, un texte libre facultatif et l’objet visé. L’auteur voit l’état : reçu, en cours, traité. Il ne voit pas les notes internes. Une procédure de recours est décrite dans les règles d’utilisation : la personne suspendue peut transmettre un complément une fois, examiné par un autre membre de l’équipe si l’effectif le permet.

### 5.9 Administration

| ID       | Exigence                                                                                                                                                                                                            | Priorité |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BF-AD-01 | Liste des utilisateurs avec recherche par numéro, nom, rôle et statut. Suspension, rétablissement et fermeture, motif obligatoire, historique.                                                                      | P1       |
| BF-AD-02 | File des annonces à examiner. Validation, rejet motivé, suspension. Une offre en modération, rejetée, suspendue ou annulée ne reçoit aucune candidature.                                                            | P1       |
| BF-AD-03 | File des signalements avec statut, décision et délai. Objectif interne du pilote : premier examen sous un jour ouvré, selon les moyens disponibles.                                                                 | P1       |
| BF-AD-04 | Référentiel des catégories et des zones desservies, activables sans redéploiement.                                                                                                                                  | P1       |
| BF-AD-05 | Paiements commerciaux : statuts en attente, en vérification, confirmé, rejeté, remboursé. Le rapprochement porte sur la référence, le montant et la réception effective. Une capture d’écran seule ne confirme pas. | P1       |
| BF-AD-06 | Un paiement confirmé crée un seul droit de publication ou une seule mise en avant. Le même paiement ne peut pas être appliqué deux fois.                                                                            | P1       |
| BF-AD-07 | Tableau de bord agrégé du pilote et export CSV filtré par dates.                                                                                                                                                    | P1       |
| BF-AD-08 | Contrôle des justificatifs de structure, accès restreint, pièces sur S3 privé.                                                                                                                                      | P1       |
| BF-AD-09 | Journal des actions sensibles : qui a validé, suspendu, exporté ou confirmé un paiement.                                                                                                                            | P1       |
| BF-AD-10 | Liste des abonnements recruteur : actif, suspendu, expiré. Suspendre un abonnement ferme les services recruteur. | P1 |
| BF-AD-11 | Interrupteur « services payants », désactivé au départ. Seul un administrateur BoulotFlash le passe à activé. Le passage est journalisé. Tant qu’il est désactivé, créer une annonce, mettre en avant et les autres services recruteur sont gratuits. | P1 |

### 5.10 Notifications

Chaque événement crée une notification dans l’application : nouvelle candidature, proposition de sélection, acceptation, refus, déclin, modification importante, annulation, expiration de proposition, suspension, et nouvelle offre correspondant au profil.

**Aucun push** (Firebase Cloud Messaging ou autre) n’est utilisé au pilote.

Le détail des canaux est en section 8.

---

## 6. Catégories de missions

Le référentiel couvre un large spectre, pour que chaque couche de candidats trouve des missions : étudiants, femmes en activité flexible, travailleurs informels, artisans, jeunes diplômés et personnes sans diplôme. L’administrateur peut désactiver une catégorie ou en ajouter une sans redéploiement. Une catégorie inactive n’apparaît ni à la publication ni dans les filtres.

Une catégorie **sensible** est publiable. Elle reste en revue avant mise en ligne. BoulotFlash ne certifie pas le diplôme. L’annonce l’indique pour l’électricité, la plomberie et les métiers techniques.

| Famille                | Catégorie                                  | Exemples                                      | Sensible        |
| ---------------------- | ------------------------------------------ | --------------------------------------------- | --------------- |
| Maison et personne     | Ménage et nettoyage                        | Maison, bureau, boutique, salle               | Oui si domicile |
| Maison et personne     | Lessive, repassage et cuisine domestique   | Linge, repas à domicile                       | Oui si domicile |
| Maison et personne     | Garde d’enfants                            | Garde de jour par un adulte                   | Oui             |
| Maison et personne     | Aide aux personnes âgées                   | Présence, courses, accompagnement             | Oui             |
| Maison et personne     | Coiffure, esthétique et soins non médicaux | Tresse, maquillage d’événement, manucure      | Non             |
| Commerce et rue        | Vente, promotion et distribution           | Rayon, flyers, animation                      | Non             |
| Commerce et rue        | Caisse, accueil et tenue de boutique       | Magasin, kiosque, marché                      | Non             |
| Commerce et rue        | Inventaire et rangement                    | Comptage, mise en rayon                       | Non             |
| Salle et événement     | Service, plonge et cuisine                 | Restaurant, bar, traiteur                     | Non             |
| Salle et événement     | Événementiel                               | Accueil, installation, service                | Non             |
| Déplacement            | Livraison et coursier                      | À pied, à vélo ou à moto                      | Non             |
| Déplacement            | Déménagement et chargement                 | Appartement, dépôt, marché                    | Non             |
| Déplacement            | Chauffeur                                  | Course avec ou sans véhicule du candidat      | Non             |
| Chantier et technique  | Manœuvre                                   | Aide de chantier, matériau, nettoyage de site | Non             |
| Chantier et technique  | Peinture, bricolage et jardinage           | Pièce, parcelle, petite réparation            | Non             |
| Chantier et technique  | Plomberie                                  | Fuite, installation simple                    | Oui             |
| Chantier et technique  | Électricité                                | Dépannage domestique simple                   | Oui             |
| Chantier et technique  | Mécanique légère                           | Aide en atelier, lavage, petite mécanique     | Non             |
| Bureau et connaissance | Saisie, secrétariat et accueil             | Formulaires, standard, classement             | Non             |
| Bureau et connaissance | Cours et aide aux devoirs                  | Soutien par un adulte                         | Non             |
| Bureau et connaissance | Traduction et interprétation               | Réunion, document court                       | Non             |
| Bureau et connaissance | Photo, vidéo et son                        | Reportage d’événement                         | Non             |
| Terrain                | Enquête et collecte de données             | Questionnaire                                 | Non             |
| Terrain                | Sensibilisation communautaire              | Porte-à-porte encadré                         | Oui             |
| Terrain                | Sécurité ponctuelle                        | Contrôle d’accès d’événement                  | Oui             |
| Terrain                | Couture et retouche                        | Ourlet, tenue d’événement                     | Non             |

Restent interdites, même si un utilisateur les demande :

- Toute offre qui fait travailler un mineur. L’inscription est réservée aux 18 ans et plus. La garde d’enfants est une mission d’adulte.
- Travail en hauteur, chantier lourd, engin de chantier.
- Acte médical, soin infirmier, délivrance de médicament.
- Tâche illégale.

Ces interdictions ne réduisent pas le référentiel. Elles empêchent une annonce de se déguiser en métier autorisé.

---

## 7. Zones géographiques

Le pilote active une ville et quelques communes voisines. Kinshasa est la ville proposée. Les communes exactes se choisissent à l’étape terrain, parmi la liste ci-dessous, selon les recruteurs réellement prêts à publier.

Communes de Kinshasa disponibles dans le référentiel : Bandalungwa, Barumbu, Bumbu, Gombe, Kalamu, Kasa-Vubu, Kimbanseke, Kinshasa, Kintambo, Kisenso, Lemba, Limete, Lingwala, Makala, Maluku, Masina, Matete, Mont-Ngafula, Ndjili, Ngaba, Ngaliema, Ngiri-Ngiri, N’sele, Selembao.

Une commune inactive n’apparaît pas dans les formulaires. Le filtre principal reste la commune, accompagnée d’un repère textuel public (« près du marché », « avenue principale »). Ce repère est placé sur la carte et sert au calcul de distance. Chaque commune a un point de repli (latitude, longitude) si Nominatim ne renvoie rien.

Extension ultérieure : autres communes de la même ville, puis Lubumbashi, Goma, Matadi, Mbuji-Mayi, Bukavu, Kisangani. Une ville est un enregistrement activable. L’extension n’est pas un objectif du pilote.

---

## 8. Notifications

### 8.1 Canaux

| Canal         | Rôle au pilote        | Règle                                                                |
| ------------- | --------------------- | -------------------------------------------------------------------- |
| Centre in-app | **Seul canal métier** | Lu / non lu. Source de vérité pour tous les événements de la matrice. |
| E-mail        | Facultatif            | Reçu de paiement commercial uniquement, si une adresse a été donnée. |
| Push FCM      | **Hors pilote**       | Non implémenté. Reporté après le pilote (décision produit).          |

Il n’y a pas de code OTP de connexion. Il n’y a **pas** de push Firebase au pilote.

### 8.2 Matrice

| Événement                              | Destinataire                | Canal au pilote             | Moment                                    |
| -------------------------------------- | --------------------------- | --------------------------- | ----------------------------------------- |
| Nouvelle candidature                   | Recruteur                   | In-app                      | Immédiat                                  |
| Présélection, refus, expiration        | Candidat                    | In-app                      | Immédiat                                  |
| Proposition de place                   | Candidat                    | In-app                      | Immédiat                                  |
| Acceptation                            | Recruteur et candidat       | In-app                      | Immédiat                                  |
| Modification importante                | Candidats concernés         | In-app                      | À l’enregistrement de la nouvelle version |
| Annulation, absence, suspension        | Personnes concernées        | In-app                      | Immédiat                                  |
| Paiement commercial confirmé ou rejeté | Recruteur                   | In-app (+ e-mail si fourni) | Au rapprochement                          |
| Nouvelle offre correspondant au profil | Candidats concernés         | In-app                      | Au premier passage en `PUBLIÉE`           |
| Rappel avant début (hypothèse D16)     | Parties de la participation | In-app                      | `REMINDER_HOURS_BEFORE` avant `start_at`  |

### 8.3 Règles d’envoi

- Toute notification métier est une ligne `notifications` avec `channel = IN_APP`, écrite de façon synchrone ou via le worker **sans** appel Firebase.
- Pas d’enregistrement de jeton FCM, pas de `device_tokens` actifs au pilote, pas de permission navigateur « notifications » exigée.
- Le message contient un titre, un corps court et l’écran à ouvrir. Il ne contient ni numéro, ni adresse exacte.
- Une nouvelle offre ne part pas à tous les comptes. Elle part aux candidats dont le profil correspond, une fois par offre.
- L’offre correspond quand le compte est actif, la disponibilité n’est pas désactivée, la catégorie est une compétence du profil, la commune est celle du profil, et le jour ainsi que le créneau figurent dans les disponibilités. Le créneau se lit sur l’heure de début, à Kinshasa : matin avant 12 h, après-midi de 12 h à 18 h, soir à partir de 18 h.
- L’auteur de l’offre ne reçoit pas cette alerte. Un profil incomplet non plus.
- L’alerte est envoyée une seule fois, au premier passage en `PUBLIÉE`. Une republication est une nouvelle offre. Une modification d’une offre déjà publiée suit l’événement « modification importante » pour les candidats déjà concernés, sans second envoi « nouvelle offre ».
- Cette alerte n’a pas d’e-mail.
- Les refus restent dans l’application.
- L’heure de Kinshasa sert aux rappels et aux créneaux ; il n’y a plus de file « nuit » pour un push inexistant.

Exemple de proposition :

> BoulotFlash : une place vous est proposée pour « Service soirée », demain 18 h, Gombe, 15 USD la mission. Acceptez ou déclinez dans l’application avant 16 h. L’adresse exacte s’affiche après acceptation.

Exemple d’offre correspondante, visible seulement dans le centre in-app :

> BoulotFlash : une mission correspond à votre profil. « Service soirée », demain 18 h, Gombe, 15 USD la mission. Ouvrez l’offre pour postuler. L’adresse exacte n’est pas dans ce message.

---

## 9. Règles métier

### 9.1 Compte

- Statuts de compte : `ACTIF`, `INCOMPLET`, `SUSPENDU`, `FERMÉ`.
- Un compte suspendu consulte son historique et ne candidate pas, ne publie pas, ne note pas.
- La fermeture est demandée par l’utilisateur ou décidée après fraude confirmée.
- L’e-mail, le numéro et les identifiants provider (`google`, `facebook`, `instagram`) d’un compte fermé ne peuvent pas être réutilisés avant 90 jours.

### 9.2 Offre

| Statut          | Sens                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `BROUILLON`     | Visible uniquement par le recruteur.                                                                             |
| `EN_MODÉRATION` | Nouveau recruteur, service payant non confirmé alors que l’option est active, ou version modifiée en attente. |
| `PUBLIÉE`       | Visible, accepte les candidatures jusqu’à la date limite.                                                        |
| `POURVUE`       | Toutes les places sont acceptées. La clôture des candidatures ne termine pas les participations déjà confirmées. |
| `TERMINÉE`      | Les participations confirmées sont déclarées réalisées, ou la date est passée et les déclarations sont closes.   |
| `EXPIRÉE`       | Date limite passée sans place acceptée.                                                                          |
| `ANNULÉE`       | Retirée par le recruteur. Les participants confirmés sont prévenus.                                              |
| `REJETÉE`       | Modération négative. Le recruteur voit le motif.                                                                 |
| `SUSPENDUE`     | Masquée. Les personnes concernées sont prévenues. Aucune mise en avant ne peut la réafficher.                    |

Transitions à figer avant développement :

- Brouillon → en modération.
- En modération → publiée, ou en modération → rejetée.
- Publiée → pourvue, expirée, annulée ou suspendue.
- Pourvue → terminée, annulée ou suspendue.
- Suspendue → publiée uniquement par un modérateur, jamais par un achat.
- Rejetée → brouillon si le recruteur corrige et resoumet.

Une offre en modération, rejetée, suspendue, annulée, expirée ou pourvue n’accepte plus de nouvelle candidature. Une offre pourvue conserve les places déjà acceptées.

### 9.3 Candidature et proposition

| Statut               | Sens                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `SOUMISE`            | Candidature enregistrée.                                                                       |
| `PRÉSÉLECTIONNÉE`    | Repérée par le recruteur, sans réserve de place.                                               |
| `SÉLECTION_PROPOSÉE` | Place réservée jusqu’à l’échéance.                                                             |
| `ACCEPTÉE`           | Le candidat a accepté. Les conditions de cette version sont figées. Les coordonnées s’ouvrent. |
| `REFUSÉE`            | Refus du recruteur.                                                                            |
| `DÉCLINÉE`           | Refus du candidat après proposition. La place est libre.                                       |
| `RETIRÉE`            | Le candidat retire sa candidature avant proposition.                                           |
| `EXPIRÉE`            | Échéance dépassée sans réponse. La place est libre. L’acceptation est refusée.                 |

- Une personne n’a qu’une candidature active par mission.
- Le candidat ne postule pas à sa propre offre.
- L’acceptation crée une participation confirmée et décrémente les places libres.
- Deux acceptations simultanées sur la dernière place : une seule réussit.

Délais proposés, à trancher en section 23 : une proposition expire au minimum 2 heures après l’envoi, et au plus tard à la clôture des sélections. Passé ce délai, le bouton accepter ne fait rien d’autre qu’afficher « proposition expirée ».

### 9.4 Participation

Statuts : `CONFIRMÉE`, `RÉALISÉE`, `ANNULÉE`, `ABSENCE`.

Chaque partie enregistre sa déclaration. Si les deux déclarations divergent, le drapeau `DÉSACCORD` est posé. Le salaire reste hors plateforme : la déclaration de paiement du recruteur et la confirmation du candidat sont deux champs, sans statut « payé par BoulotFlash ».

- Confirmée → réalisée, si au moins une partie déclare la réalisation et l’autre ne conteste pas dans le délai affiché.
- Confirmée → absence, sur déclaration, contestable par l’autre partie.
- Confirmée → annulée, par l’une ou l’autre partie, avec notification.
- La clôture des candidatures ne change pas ces participations.

### 9.5 Retours privés

Au pilote, un retour est un texte court, privé, lié à une participation. Il est visible par son auteur, par l’administration, et n’est pas affiché sur le profil public. Il ne produit pas de moyenne.

Le score public de fiabilité et les étoiles restent une évolution, avec procédure de contestation, après le pilote. La formule envisagée est conservée ici pour ne pas la réinventer plus tard. Elle n’est ni calculée ni montrée au lancement.

| Composante envisagée | Poids | Mesure                                                      |
| -------------------- | ----- | ----------------------------------------------------------- |
| Notes reçues         | 40 %  | Moyenne des étoiles ramenée sur 100.                        |
| Présence             | 30 %  | Missions réalisées / (réalisées + absences non contestées). |
| Volume               | 15 %  | Plafond à 20 missions réalisées.                            |
| Ancienneté           | 5 %   | Plafond à 180 jours de compte actif.                        |
| Téléphone confirmé   | 5 %   | 100 si un numéro issu du provider est stocké.                                          |
| Identité vérifiée    | 5 %   | Seulement si ce contrôle existe un jour.                    |

### 9.6 Badges

| Badge                                           | Condition                                                         | Phase                                     |
| ----------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| Téléphone confirmé                              | Numéro provider OAuth ou saisi au profil                          | Pilote                                    |
| Structure contrôlée                             | Justificatif de structure accepté par l’admin, pièce reste privée | Pilote, optionnel                         |
| Identité vérifiée, ponctuel, bien noté, habitué | Contrôles et historique publics                                   | Après le pilote, si la décision est prise |

Un badge ne s’achète pas. Il ne garantit ni un paiement ni la qualité d’une mission. Le contrôle d’une structure finance éventuellement le temps de revue, sans garantir le résultat.

### 9.7 Temps et fuseau

Toutes les dates métier sont en heure de Kinshasa (Africa/Kinshasa) tant que la ville pilote est Kinshasa. L’interface affiche aujourd’hui, demain, l’heure, puis la date complète. Les échéances de candidature, de sélection et de proposition sont horodatées et visibles avant l’action.

---

## 10. Modèle économique

### 10.1 Principe

L’inscription, la consultation et la candidature sont gratuites. Le candidat ne paie aucun frais de candidature, de déblocage d’offre ou d’achat de contact.

Le recruteur utilise BoulotFlash avec un abonnement actif. Cet abonnement couvre la création d’annonce, la mise en avant et les autres services recruteur. Au départ, ces services sont gratuits. Ils deviennent payants uniquement quand un administrateur BoulotFlash active l’option « services payants ».

Le salaire est payé directement entre les parties. Le MVP ne propose ni portefeuille, ni séquestre, ni crédit, ni commission prélevée sur les salaires.

### 10.2 Abonnement

À la création du profil recruteur, la plateforme ouvre un abonnement `ACTIF`, sans paiement. Un abonnement `SUSPENDU` ou `EXPIRÉ` bloque tous les services recruteur, que le paiement soit activé ou non.

| Service | Sans l’option | Avec l’option activée |
| --- | --- | --- |
| Créer une annonce | Gratuit, abonnement actif exigé | Prix configuré, paiement confirmé exigé |
| Mise en avant | Gratuit, identifiée comme sponsorisée | Prix configuré, paiement confirmé exigé |
| Autres services recruteur | Gratuits | Payants selon le tarif admin |

L’écran du recruteur indique l’état : « Services gratuits » ou « Services payants », et l’état de l’abonnement.

### 10.3 Prix, prêts mais non appliqués

Les prix sont préparés avant l’activation. Ils ne s’affichent et ne se demandent qu’une fois l’option activée. Chaque prix précise la devise, la durée, les limites, les conditions de remboursement et les frais éventuels.

| Service | Ordre de grandeur prêt à tester |
| --- | --- |
| Publication | 2 à 5 USD, ou équivalent CDF |
| Mise en avant | 5 à 20 USD pour une durée affichée, par exemple 24 heures |

Le montant demandé est un prix ferme. L’admin change le tarif sans redéploiement. Désactiver à nouveau l’option rend les services gratuits pour les prochains usages. Un service déjà payé et confirmé n’est pas repris.

### 10.4 Encaissement, seulement si l’option est active

Moyens visés : Vodacom M-Pesa, Orange Money, Airtel Money, Afrimoney. Le pilote en utilise un ou deux. Les autres restent désactivés.

Statuts : `EN_ATTENTE`, `EN_VÉRIFICATION`, `CONFIRMÉ`, `REJETÉ`, `REMBOURSÉ`.

Quand l’option est active, le recruteur initie un paiement. Il peut transmettre une référence. L’administrateur rapproche la référence, le montant et la réception effective. Une capture d’écran seule ne confirme pas l’encaissement. Un paiement en attente ou en vérification ne livre pas le service. Une même confirmation ne livre pas deux fois le même service.

Quand l’option est désactivée, aucun paiement n’est demandé et aucun rapprochement n’est nécessaire.

Les devises d’annonce restent CDF et USD, sans classement comparatif et sans conversion par BoulotFlash.

### 10.5 Reçu

Chaque paiement confirmé produit un reçu in-app : date, montant, devise, méthode, référence, objet, durée du droit. Les conditions de remboursement y sont rappelées. Un service gratuit ne produit pas de reçu de paiement.

### 10.6 Lecture économique du pilote

Tant que l’option est désactivée, les recettes de services sont nulles. La contribution ne se calcule qu’après activation :

Contribution mensuelle = recettes encaissées − remboursements − frais d’encaissement − coûts variables de notification et d’assistance.

Cette contribution doit ensuite couvrir les coûts fixes. Elle n’est pas, à elle seule, le bénéfice. Les postes à chiffrer séparément sont en section 24.

---

## 11. Confiance, modération et litiges

### 11.1 Ce que la plateforme affirme

| Signe               | Signifie                             | Ne signifie pas                      |
| ------------------- | ------------------------------------ | ------------------------------------ |
| Téléphone confirmé  | Numéro provider ou profil            | Identité, fiabilité, paiement        |
| Structure contrôlée | Un justificatif a été vu par l’admin | Qualité de la mission ou solvabilité |
| Mise en avant       | Emplacement sponsorisé identifié     | Une recommandation de BoulotFlash, ni un paiement s’il est encore gratuit |

Aucun frais n’est demandé au candidat. Les annonces qui exigent un versement préalable du candidat sont interdites.

### 11.2 File de modération

Priorité :

1. Demande d’argent au candidat, harcèlement, danger.
2. Fausse offre et fraude.
3. Contenu discriminatoire ou hors catégories autorisées.
4. Rémunération contestée et absence, via les signalements.

Objectif du pilote : premier examen d’un signalement sous un jour ouvré, selon les moyens réels de l’équipe. Ce délai est un objectif interne, pas une garantie affichée aux utilisateurs.

Décisions : aucune action, avertissement, masquage, rejet motivé, suspension, rétablissement, fermeture. Chaque décision a un motif interne et un message compréhensible. La personne concernée peut transmettre un complément. L’historique reste consultable.

### 11.3 Désaccord sur une mission

Motifs : absence contestée, travail différent de l’annonce, montant non payé, durée plus longue, comportement inapproprié.

Le support voit les deux déclarations, la version des conditions acceptées, les heures de notification et les signalements. BoulotFlash peut suspendre un compte, rétablir une annonce ou classer le dossier. Il constate qu’il n’est pas partie au paiement du salaire et ne rend pas un arbitrage juridique.

Les conditions d’utilisation le disent en langage simple.

### 11.4 Interdictions de publication

- Versement préalable du candidat : acompte, frais de dossier, achat de kit, déblocage.
- Promesse d’emploi à l’étranger, de visa ou de formation payante obligatoire.
- Tâche illégale, travail en hauteur, chantier lourd ou acte médical.
- Cible de mineurs comme travailleurs.
- Discrimination sans lien direct avec la tâche autorisée.
- Contournement d’une suspension par une nouvelle annonce ou une mise en avant.

---

## 12. Exigences non fonctionnelles

### 12.1 Performance

- Affichage utilisable de la liste en moins de quatre secondes sur un scénario de connexion mobile limitée. L’appareil et le profil réseau sont définis avant la recette, puis réutilisés tels quels.
- Premier écran utile inférieur à 5 secondes sur ce même profil, grâce à une page légère et à peu d’images.
- Le pilote vise quelques centaines de comptes, pas une capacité théorique de 10 000 utilisateurs actifs. L’architecture reste simple et se mesure sur le scénario réel.
- La liste d’offres est paginée. Aucune candidature ni publication n’est présentée comme envoyée avant la confirmation du serveur.

### 12.2 Disponibilité

- Sauvegarde quotidienne de la base, conservation 30 jours.
- Une restauration de sauvegarde est démontrée avant l’ouverture du pilote.
- Le centre de notifications in-app est la source de vérité. Aucune dépendance à Firebase Messaging au pilote.

### 12.3 Sécurité

- Authentification publique par Google, Facebook ou Instagram. Les jetons et codes OAuth sont vérifiés côté serveur.
- Mots de passe administrateurs hachés avec un algorithme lent, jamais réversibles.
- Contrôle d’accès par rôle, vérifié côté serveur : visiteur, candidat, recruteur, administrateur.
- Protection contre les tentatives OAuth abusives, les téléchargements massifs et l’accès au dossier d’une autre personne.
- Chiffrement TLS en transit. Chiffrement au repos des justificatifs recruteurs sur le conteneur S3 et des références de paiement.
- Les coordonnées ne sont lisibles que par les parties dont la sélection est acceptée. Après annulation, l’accès futur est retiré. L’historique nécessaire à un signalement reste accessible à l’admin selon la durée de conservation.
- Aucun contenu privé ne reste dans un cache accessible après déconnexion.
- Journalisation des actions sensibles : connexion admin, suspension, export, changement de tarif, confirmation de paiement, ouverture d’un justificatif.
- Les exports CSV sont générés à la demande, horodatés, et réservés au rôle finance ou super-admin.
- Images du Compose mises à jour selon une revue mensuelle.

### 12.4 Vie privée

- Finalité déclarée : mise en relation pour des missions courtes, confiance entre utilisateurs, facturation, sécurité.
- Données minimales à l’inscription : e-mail et/ou téléphone et photo issus du provider, nom d’usage, rôle, puis commune et compétence ou type de recruteur.
- L’adresse exacte, le numéro de mission et les justificatifs recruteurs ne sont visibles que des personnes autorisées.
- Aucune pièce d’identité n’est demandée aux candidats par défaut. Un justificatif de structure, s’il est fourni, suit la durée de conservation des pièces privées : suppression de S3 12 mois après la décision, ou plus tôt si le recruteur retire sa demande.
- Comptes et missions conservés 24 mois après la dernière activité, puis anonymisés, sous réserve de la validation locale. Les reçus de paiement suivent la durée comptable applicable.
- L’utilisateur demande une copie simple de ses données et la suppression de son compte depuis le profil.
- Aucune revente de la base de numéros.
- Les conditions de fonctionnement, la protection des données et le statut de l’activité de mise en relation font l’objet d’une validation locale avant lancement public.

### 12.5 Expérience utilisateur

- Interface simple, mobile-first, pensée pour un écran de 360 px de large.
- Inscription possible en moins de 3 minutes, profil minimal inclus.
- Navigation en français, phrases courtes, vocabulaire du quotidien (« mission », « candidater », « retenu »).
- Prévoir une évolution vers le lingala et l’anglais : toutes les chaînes visibles passent par des clés de traduction, y compris les titres et corps des notifications in-app.
- Fonctionnement sur connexion faible : peu d’images, listes paginées. Une coupure réseau affiche un état non envoyé. Rien n’est montré comme publié ou postulé avant la confirmation du serveur.
- Boutons d’action clairs : **Postuler**, **Proposer une place**, **Accepter**, **Décliner**, **Partager**, **Signaler**.
- Les statuts sont des mots français, avec une couleur stable : attente, succès, refus, alerte.
- Le parcours critique se fait d’une main, pouce en bas de l’écran.
- Une seule interface. Les fonctions affichées dépendent du mode actif, candidat ou recruteur.

### 12.6 Accessibilité et inclusion

- Contraste suffisant en plein soleil.
- Cibles tactiles d’au moins 44 px.
- Le montant, l’heure et la commune ne sont pas uniquement portés par la couleur.
- Formulaire utilisable sans photo et sans pièce d’identité.

### 12.7 Tâche — logo et design system

Cette tâche est un livrable de conception, avant les maquettes d’écrans et avant le développement de l’interface. Elle produit l’identité BoulotFlash et les règles visuelles que l’application reprend. Livrables dans `design/` ; captures d’inspiration UI dans `captures/`.

**Logo**

- Le nom est BoulotFlash. L’accroche associée est « Trouvez un travail aujourd’hui. »
- Logo adopté : squircle bleu `#3EA4FF` + éclair blanc, wordmark Job / Flash (Flash italique + double swoosh). Fichiers dans `design/logo/`. Inspiration initiale FLASH TRANSPORT URBAIN, sans reprendre le nom ni le slogan transport.
- Versions : logo principal, version monochrome, picto éclair, favicon, icône PWA (192 px et 512 px).
- Le signe reste reconnaissable à 24 px, sur fond clair et sur fond sombre, en plein soleil.
- Fichiers sources : SVG, puis PNG dérivés. Le vecteur est la source. Les exports sont rangés avec le projet.
- Le logo ne sert pas de bouton d’action. Les boutons restent des mots : Postuler, Publier, Accepter.

**Design system**

- Direction UI : mode clair soft (fond pastel `#F0F5FA`, cartes blanches très arrondies, boutons pills, chips soft, hero recherche) alignée sur les captures de référence, avec la couleur Flash comme primaire.
- Stack d’interface obligatoire : **Mantine UI** pour les composants, **Tailwind CSS** pour le layout et le responsive, **[Tabler Icons](https://tabler.io/icons)** pour toutes les icônes UI (`@tabler/icons-react`). Chaque brique est réutilisable ; un écran ne crée pas de style isolé. Pas d’autre bibliothèque d’icônes.
- Une seule source de jetons (`design/tokens/tokens.json`) pour Mantine et Tailwind : couleur, typographie, espacement, rayon, tailles de touche, breakpoints.
- Couleurs de statut stables : attente, succès, refus, alerte. Le montant, l’heure et la commune ne dépendent pas seulement de la couleur.
- Composants de base (inventaire `design/components/INVENTORY.md`) : bouton principal / secondaire, champ téléphone, groupe de recherche, carte de mission, carte Leaflet et distance en km, badge (« téléphone confirmé », « structure contrôlée », « sponsorisé »), statut, liste, état vide, coupure réseau, carte catégorie, chips.
- Responsive : mobile-first dès 360 px, fluide tablette et desktop (référence visuelle : captures iPhone, Pixel, iPad, MacBook).
- Cibles tactiles d’au moins 44 px. Contraste lisible dehors.
- Vouvoiement, français simple, peu d’images. Le design system documente ces règles à côté des jetons.
- Les maquettes des écrans de la section 15 utilisent ces composants.

**Critère de fin**

- Le logo est validé dans ses versions et ses fichiers.
- Une page de référence (`design/reference/index.html`) montre les jetons et les composants, adaptable de 360 px au desktop.
- Le thème Mantine et les jetons Tailwind portent les mêmes valeurs.

---

## 13. Architecture technique proposée

### 13.1 Frontend

- Application web responsive installable, de type PWA : Next.js, Mantine UI, Tailwind CSS.
- Carte : Leaflet. Tuiles OpenStreetMap, ou MapTiler si la clé est présente. Géocodage Nominatim. Distance Haversine. Même schéma que la carte de .
- Une interface commune. Les fonctionnalités s’affichent selon le rôle.
- Pas d’application iOS ou Android séparée au lancement. Une app native ne se justifie qu’après usage constaté.
- Espace admin séparé, non indexé, même API.

### 13.2 Backend

- NestJS, en une application. Pas de microservices au lancement.
- API REST sécurisée, JSON, préfixe versionné `/api/v1`.
- Authentification JWT.
- RBAC : candidat, recruteur, administrateur.
- Tâches planifiées : expiration des offres, expiration des propositions, relances internes, expiration des paiements non rapprochés.
- Aucune IA n’est requise pour publier, rechercher ou sélectionner.

Modules : identité, profils, référentiels, offres et versions de conditions, candidatures, propositions, participations, retours privés, signalements, notifications, paiements commerciaux, droits de publication, administration, audit.

### 13.3 Base de données

- PostgreSQL.
- Identifiants UUID.
- Dates en `timestamptz`.
- Contraintes d’unicité : un téléphone par compte, une candidature active par couple offre/candidat, un droit commercial par paiement confirmé.

### 13.4 Services

- Redis pour le cache des listes d’offres chaudes et le rate-limit des tentatives OAuth.
- File d’attente pour les notifications et les exports, consommée par un worker. La publication enregistre l’offre, puis le worker écrit les alertes in-app des profils correspondants. Ces alertes ne partent pas par e-mail.
- Conteneur `s3` pour tous les fichiers (photos, justificatifs de structure, exports). L’application parle l’API S3.
- Service OAuth (Google, Meta Facebook/Instagram). Pas de Firebase Cloud Messaging au pilote.
- Service de paiement mobile money derrière une interface unique, avec un mode manuel.

### 13.5 Stockage de fichiers — conteneur S3

Tous les fichiers passent par le conteneur `s3` du Compose. L’image est `quay.io/minio/minio`, qui expose l’API S3. PostgreSQL ne conserve pas les binaires. La base stocke la clé d’objet (`bucket` + `key`), jamais une URL permanente.

Deux buckets par environnement (`dev`, `test`, `prod`), accès public bloqué, CORS limité à l’origine de l’application :

| Bucket                   | Contenu                                        | Lecture                                                |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------ |
| `boulotflash-{env}-media`   | Photo de profil, vignette 200 px, image 800 px | URL pré-signée GET, courte durée                       |
| `boulotflash-{env}-private` | Justificatif de structure, export CSV          | URL pré-signée GET, 5 minutes, rôle autorisé seulement |

Clés d’objet :

- `profiles/{userId}/avatar.webp` et `profiles/{userId}/avatar-thumb.webp`
- `structures/{employerId}/{requestId}`
- `exports/{exportId}.csv`

Règles d’usage :

- L’API délivre une URL pré-signée PUT. Le téléphone envoie le fichier directement au conteneur S3, via l’adresse publique du proxy. L’API ne relaie pas le binaire.
- Types acceptés : JPEG, PNG, WebP pour les photos ; PDF ou image pour un justificatif de structure. Taille maximale : 5 Mo pour une photo, 10 Mo pour un justificatif. Aucune pièce d’identité candidat n’est collectée au pilote.
- Après l’upload d’une photo, le worker génère la vignette et l’image 800 px, les réécrit sur S3, puis supprime l’original trop lourd.
- Le bucket privé n’est pas lisible sans URL pré-signée. Le chiffrement au repos est activé sur le conteneur. Seuls le modérateur qui traite le dossier et le titulaire du compte obtiennent un lien de lecture.
- Un export CSV expire sous 7 jours. Un justificatif de structure est supprimé selon la durée de la section 12.4.
- Les clés d’accès S3 (`S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, noms des buckets) sont des variables du Compose, hors du dépôt.
- Au démarrage, les deux buckets de l’environnement sont créés s’ils n’existent pas. Le port du conteneur `s3` n’est pas ouvert sur Internet : seul le proxy publie l’adresse utilisée par les URL pré-signées.

### 13.6 Hébergement et Docker Compose

Le développement et le déploiement passent par le même Docker Compose. Tous les services que BoulotFlash exécute sont des conteneurs de ce fichier. Il n’y a pas d’installation manuelle de Node, PostgreSQL ou Redis sur la machine.

| Service Compose | Rôle                                                  |
| --------------- | ----------------------------------------------------- |
| `web`           | Application Next.js, PWA et espace admin              |
| `api`           | API NestJS                                            |
| `worker`        | File d’attente : notifications in-app différées, exports, traitements photo |
| `postgres`      | PostgreSQL                                            |
| `redis`         | Cache et file                                         |
| `s3`            | `quay.io/minio/minio`, API S3, volume persistant      |
| `proxy`         | Reverse proxy HTTPS vers `web`, `api` et `s3`         |

Les fournisseurs externes ne sont pas des conteneurs : Google Identity, Meta (Facebook et Instagram) et le mobile money. L’API et le worker les appellent avec les variables d’environnement du Compose. Firebase Cloud Messaging n’est **pas** un fournisseur du pilote.

Règles :

- Un `docker-compose.yml` décrit les services, les réseaux internes et les volumes. Le développement, le test et la production utilisent ce fichier. Seul le fichier d’environnement change (`.env.development`, `.env.test`, `.env.production`).
- En développement, `docker compose up` suffit à lancer toute la pile. Les ports publics utiles sont le proxy et, si besoin, l’API.
- En déploiement, la même commande tourne sur le VPS. Le proxy termine le HTTPS. Les autres services ne sont pas publiés sur Internet.
- PostgreSQL, Redis et `s3` ont un volume nommé. Les photos et justificatifs sont dans le volume de `s3`, pas dans PostgreSQL.
- Les secrets restent hors du dépôt : paiement, base, clés S3, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `META_APP_ID`, `META_APP_SECRET`. Pas de compte de service Firebase au pilote.
- Les images sont versionnées. Une mise à jour se fait par reconstruction des images et `docker compose up -d`. Les dépendances sont revues chaque mois.
- Sauvegarde quotidienne des volumes PostgreSQL et `s3`, conservation 30 jours. La restauration se démontre avec le même Compose avant l’ouverture du pilote.
- Les logs des conteneurs `api`, `worker` et `proxy` sont la source de supervision, avec le suivi de la file.

### 13.7 Qualité

- Jeux de tests sur les transitions de statuts, la réservation de place, l’expiration d’une proposition, la révélation du contact et l’unicité d’un droit de publication.
- Une offre en modération, suspendue ou annulée ne peut pas apparaître dans la recherche publique ni recevoir une candidature.
- Journal d’erreurs sans numéro de téléphone complet : les logs masquent le numéro (`+2438****1234`).

---

## 14. Modèle de données

Le schéma ci-dessous complète les entités initiales. Les noms de colonnes restent en anglais pour le code ; les statuts stockés sont les codes de la section 9.

### users

- id
- phone (nullable, unique si présent)
- email (nullable, unique si présent)
- Liens OAuth : table `auth_identities` (`provider` ∈ google|facebook|instagram, `provider_user_id`, unique couple)
- password_hash (nullable, comptes internes)
- status : ACTIVE, INCOMPLETE, SUSPENDED, CLOSED
- locale
- created_at, updated_at, last_login_at

Un compte public a au moins une ligne `auth_identities`. L’e-mail et le téléphone sont optionnels à la création mais le téléphone est exigé avant candidature ou publication. Un compte interne a un `password_hash` et aucune identité OAuth publique.

### user_roles

Un compte, plusieurs rôles.

- id
- user_id
- role : WORKER, EMPLOYER, ADMIN
- admin_scope : SUPPORT, MODERATOR, FINANCE, SUPER (nullable)

### worker_profiles

- id
- user_id
- display_name
- bio
- main_category_id
- commune_id
- availability
- experience_note
- profile_photo_key (clé S3, nullable)
- is_available
- terms_accepted_at

Pas de date de naissance, pas de note publique, pas de pièce d’identité dans ce profil au pilote.

### worker_skills

- worker_profile_id
- category_id

### employer_profiles

- id
- user_id
- type : INDIVIDUAL, BUSINESS, ARTISAN, ORGANIZATION
- display_name
- contact_person
- commune_id
- address_private
- mission_phone
- presentation
- phone_confirmed
- structure_check_status : NONE, PENDING, VERIFIED, REJECTED

### categories

- id
- slug
- name
- family
- is_sensitive
- is_active
- sort_order

### cities / communes

- city : id, name, is_active
- commune : id, city_id, name, latitude, longitude, is_active

`latitude` et `longitude` sont le centre de repli de la commune.

### jobs

- id
- employer_id
- title
- description
- category_id
- commune_id
- public_landmark
- public_latitude, public_longitude
- address_private
- private_latitude, private_longitude
- start_at
- duration_hours
- workers_needed
- amount
- currency : CDF, USD
- pay_unit : HOUR, DAY, MISSION
- pay_channel : CASH, MOBILE_MONEY
- pay_timing
- skills_required
- material_conditions
- transport_support, meals_support, equipment_support
- apply_deadline
- selection_deadline
- status
- is_featured
- featured_until
- current_version_id
- published_at, expires_at, created_at, updated_at

### job_versions

Une ligne par version de conditions. Une acceptation pointe vers la version acceptée, pas vers la fiche courante.

- id
- job_id
- version_number
- snapshot (champs de conditions)
- created_at
- created_by

### applications

- id
- job_id
- worker_id
- status : SUBMITTED, SHORTLISTED, OFFERED, ACCEPTED, REJECTED, DECLINED, WITHDRAWN, EXPIRED
- message
- applied_at
- contrainte unique (job_id, worker_id)

### selection_offers

- id
- application_id
- job_version_id
- expires_at
- status : PENDING, ACCEPTED, DECLINED, EXPIRED, CANCELLED
- reserved_slot

### participations

- id
- job_id
- application_id
- selection_offer_id
- worker_id
- employer_id
- job_version_id
- status : CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
- dispute_flag
- worker_declaration, employer_declaration
- employer_payment_declared_at
- worker_payment_confirmed_at
- created_at, cancelled_at

### private_feedback

- id
- participation_id
- author_id
- comment
- created_at
- visible uniquement par l’auteur et l’admin

### platform_settings

- services_payants : booléen, `false` au départ
- updated_by
- updated_at

### subscriptions

- id
- employer_id
- status : ACTIVE, SUSPENDED, EXPIRED
- started_at
- ends_at (nullable tant que les services sont gratuits)
- created_at

### payments

- id
- user_id
- job_id (nullable)
- purpose : JOB_POST, FEATURED
- amount
- currency
- method : MPESA, ORANGE_MONEY, AIRTEL_MONEY, AFRIMONEY, MANUAL
- status : PENDING, UNDER_REVIEW, CONFIRMED, REJECTED, REFUNDED
- provider_reference
- reviewed_by
- created_at, confirmed_at
- contrainte : un paiement confirmé ne produit qu’un droit

### publication_rights

- id
- employer_id
- payment_id (nullable et unique quand il est renseigné)
- source : FREE, PAID
- type : POST, FEATURED
- job_id (nullable jusqu’à consommation)
- status : AVAILABLE, USED, EXPIRED, REVOKED
- valid_until

### device_tokens (hors pilote)

Table réservée à une éventuelle réintroduction du push. **Non utilisée au pilote** : pas d’API, pas de peuplement, pas de jeton FCM.

- id
- user_id
- fcm_token
- platform : WEB
- created_at, last_seen_at, invalid_at
- contrainte unique (fcm_token)

### notifications

- id
- user_id
- channel : IN_APP, EMAIL (FCM hors pilote, non utilisé)
- template_key
- title
- message
- status : QUEUED, SENT, DELIVERED, FAILED, READ
- related_type, related_id
- sent_at, read_at

### reports

- id
- reporter_id
- target_type : JOB, USER, PARTICIPATION, SELECTION
- target_id
- reason : MONEY_REQUEST, FAKE_OFFER, HARASSMENT, DANGER, NO_SHOW, PAY_DISPUTE, OTHER
- details
- status : OPEN, IN_REVIEW, CLOSED
- resolution
- handled_by
- created_at, closed_at

### structure_checks

- id
- user_id
- document_type
- document_key (clé S3 dans le bucket privé)
- status
- reviewer_id
- reviewed_at
- rejection_reason

### audit_logs

- id
- actor_id
- action
- entity_type
- entity_id
- metadata
- created_at

### Index attendus

- Offres publiées par commune, catégorie et date de publication.
- Candidatures par candidat et par offre.
- Propositions non expirées qui réservent une place.
- Participations par candidat et par recruteur.
- Notifications non lues par utilisateur.
- Paiements en vérification.
- Droits de publication encore disponibles.

Chaque objet sensible a un propriétaire, une date de création, l’historique utile et une règle d’accès. La règle d’accès des coordonnées est : parties de la participation `CONFIRMÉE`, et administrateur journalisé.

---

## 15. Écrans du MVP

1. Accueil et liste des missions.
2. Recherche et filtres.
3. Détail d’une mission publiée, avec **Partager**, sans coordonnées privées.
4. Inscription et connexion : **Continuer avec Google**, **Facebook** ou **Instagram**. Déconnexion.
5. Profil candidat et disponibilités.
6. Mes candidatures et propositions reçues.
7. Profil recruteur.
8. Création et modification de mission.
9. Mes missions et candidatures reçues, avec **Partager** sur chaque offre publiée.
10. Confirmation de sélection et coordonnées privées, avec appel et WhatsApp.
11. Notifications, déclarations de fin et signalements.
12. Offres commerciales et historique de paiement.
13. Administration.
14. Aide, règles d’utilisation et confidentialité.

---

## 16. Indicateurs de succès

### 16.1 Mise en relation

- Recruteurs inscrits et recruteurs ayant publié.
- Missions validées, ouvertes et pourvues.
- Délai jusqu’à la première candidature jugée pertinente par le recruteur.
- Missions pourvues / missions publiées, sur une même cohorte.
- Sélections acceptées, annulations et absences déclarées.
- Missions déclarées réalisées par les deux parties.
- Signalements par catégorie et délai de premier examen.

### 16.2 Paiement et retour

- Recruteurs qui republient.
- Recruteurs qui paient.
- Recettes encaissées, remboursements et coûts opérationnels.
- Coût des services payants recruteur. Pas de coût push (canal absent au pilote).
- Contribution mensuelle définie en section 10.6.

Le nombre d’inscriptions ne suffit pas. La répétition des recrutements utiles et payants est le signal principal.

### 16.3 Lecture hebdomadaire

L’admin voit, sans export : inscrits, offres validées, places acceptées, missions déclarées réalisées des deux côtés, signalements ouverts, paiements en vérification. Le CSV sert à l’analyse.

---

## 17. Déroulement

Le calendrier dépend de l’équipe et des résultats de recette. Le développement ne commence qu’après les décisions de la section 23.

### Étape 1 — Validation terrain

Interroger environ 10 recruteurs et 20 candidats dans la zone choisie. Identifier les missions fréquentes, les conditions de rémunération, les freins de confiance et les prix acceptables. Choisir les communes actives.

### Étape 2 — Conception

Livrables : logo, design system, parcours, maquettes mobiles sur ce design system, règles de transition, modèle de données, politique de modération et estimation des coûts de la section 24.

### Étape 3 — Développement et recette

Livrables : code source, application de test, administration, documentation d’installation, tests des droits et des sélections, procédure de sauvegarde et restauration démontrée, guides utilisateur.

Ordre de construction :

1. Référentiels, comptes OAuth, conteneur S3.
2. Profils et offres, versions de conditions.
3. Recherche et candidature.
4. Proposition, acceptation, réservation de place, coordonnées.
5. Notifications internes, puis messages prioritaires.
6. Admin, signalements, paiements manuels, droits de publication.
7. Textes des règles, suppression de compte, essais de coupure réseau.

### Étape 4 — Pilote accompagné

Tester avec un petit groupe de recruteurs. Vérifier manuellement les premières annonces. Accompagner les premiers recrutements. Mesurer les indicateurs de la section 16.

### Étape 5 — Décision d’extension

Étendre à d’autres communes seulement après des recrutements répétés, un traitement maîtrisé des signalements et une volonté de payer constatée.

### Évolutions possibles après cette décision

- Alertes d’offres selon préférences et disponibilité.
- Packs et abonnements.
- Comptes à plusieurs collaborateurs.
- Encaissement automatique des services BoulotFlash.
- Langues locales.
- Rapprochement simple par compétence et disponibilité.
- Recommandations publiques avec contestation.
- Application native si l’usage justifie son coût.
- CV, formations, agents relais, autres villes.

Ces évolutions ne font pas partie du pilote. Le salaire reste payé entre les parties tant qu’une décision contraire n’est pas écrite.

---

## 18. Risques et mesures

| Risque                                  | Impact                                               | Mesure                                                                                                                            |
| --------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Faux profils                            | Perte de confiance                                   | OAuth provider, profil minimal, modération des nouveaux recruteurs, signalement. Le téléphone (provider ou profil) n’est pas présenté comme une identité civile |
| Offres frauduleuses ou demande d’argent | Préjudice aux candidats                              | Filtre, rémunération obligatoire, interdiction de versement préalable, signalement, suspension                                    |
| Faible volonté de payer | Recettes nulles après activation | Les services restent gratuits au départ. Les prix ne s’appliquent qu’après l’interrupteur admin, une fois des recruteurs déjà actifs |
| Offres sans candidatures                | Recruteurs qui ne reviennent pas                     | Référentiel large par familles, communes choisies avec le terrain, conditions lisibles avant candidature                          |
| Notification non vue                    | Événement manqué                                     | Centre in-app toujours écrit à l’événement ; badge / liste non lus                                                               |
| Connexion faible                        | Actions crues envoyées alors qu’elles ne le sont pas | État non envoyé tant que le serveur n’a pas confirmé                                                                              |
| Désaccord sur le salaire                | Mauvaise expérience                                  | Montant, moment et mode obligatoires, déclaration des deux côtés, sans preuve bancaire prétendue                                  |
| Absence le jour J                       | Le recruteur quitte le pilote                        | Déclaration d’absence, contestation, signalement, place libérée si la proposition expire avant le jour J                          |
| Double activation d’un paiement         | Avantage commercial indu                             | Un paiement confirmé, un seul droit                                                                                               |
| Données exposées                        | Atteinte aux personnes                               | Coordonnées après acceptation seulement, justificatifs sur S3 privé, cache vidé à la déconnexion                                  |
| Extension trop tôt                      | Complexité sans usage                                | Décision d’extension conditionnée aux recrutements répétés                                                                        |

---

## 19. Livrables attendus

- Logo BoulotFlash et design system (section 12.7), appliqués à l’application web.
- Application web installable, candidat et recruteur.
- Espace administrateur.
- API backend sécurisée, versionnée, sans microservices.
- Base initiale : référentiel large de la section 6, familles, catégories sensibles, ville proposée, communes activables, tarifs de test.
- Notifications in-app uniquement (push FCM hors pilote).
- Vérification manuelle des paiements de services, sans double droit.
- Conteneur S3, buckets média et privé, URLs pré-signées.
- Règles d’utilisation et politique de confidentialité en français simple, après validation locale.
- Fichier Docker Compose, fichiers d’environnement par contexte, schéma, sauvegarde et restauration.
- Guide candidat et guide recruteur.
- Compte rendu d’entretiens terrain et plan du pilote accompagné.

---

## 20. Critères de recette

Le pilote est acceptable lorsque ces scénarios passent sur téléphone, en français, y compris après une coupure réseau.

1. Un visiteur consulte les missions ouvertes sans voir de coordonnées privées.
2. Une offre sans rémunération, lieu, durée ou tâche précise ne peut pas être soumise. « À discuter » est refusé.
3. Une offre en modération, suspendue ou annulée ne reçoit aucune candidature, n’apparaît pas dans la liste et n’a pas de lien public à partager.
4. Une catégorie absente du référentiel actif ne peut pas être publiée. Une catégorie sensible n’apparaît qu’après revue. Une offre impliquant des mineurs, un travail en hauteur ou un acte médical est rejetée.
5. Un candidat ne postule pas deux fois à la même mission.
6. Deux acceptations simultanées ne dépassent pas les places disponibles.
7. Une proposition expirée libère sa place et ne peut plus être acceptée.
8. Les coordonnées et l’adresse exacte sont accessibles uniquement après acceptation, et uniquement aux deux parties concernées.
9. Un recruteur ne consulte pas les candidatures d’un autre recruteur.
10. Une modification importante conserve les conditions déjà acceptées, repart en validation et prévient les candidats concernés.
11. Une annulation prévient les participants. L’accès futur aux coordonnées est retiré.
12. Tant que les services payants sont désactivés, une annonce et une mise en avant partent sans paiement si l’abonnement est actif. Quand l’option est activée, un paiement en attente ou une capture d’écran seule ne livre aucun service.
13. Une même confirmation de paiement ne livre pas deux fois le même service.
14. Un recruteur sans abonnement actif, ou suspendu, ne publie pas et ne met pas en avant.
15. Un signalement arrive dans l’administration avec un historique. Le retour de mission reste privé et n’affiche pas de note publique.
16. Le bouton WhatsApp ouvre la conversation sans envoyer de message automatique.
17. Une restauration de sauvegarde est démontrée avant lancement.
18. La liste reste utilisable en moins de quatre secondes sur le profil réseau fixé pour la recette.
19. Un compte s’ouvre par Google, Facebook ou Instagram. Un second compte n’est pas créé si l’e-mail vérifié existe déjà. Sans numéro issu du provider, la candidature et la publication restent bloquées.
20. Quand une offre passe à `PUBLIÉE` et correspond au profil, le candidat a une notification in-app, sans e-mail. Un profil qui ne correspond pas, et l’auteur de l’offre, ne reçoivent pas cette alerte. Aucun push.

---

## 21. Exigences de contenu et de ton

- Vouvoiement simple : « Publiez », « Postulez », « Acceptez ».
- Pas de jargon RH.
- Les montants sont toujours accompagnés de la devise et de la base : heure, journée ou mission.
- Les erreurs disent quoi faire : « Indiquez le montant pour publier ».
- Les notifications tiennent en deux phrases et rappellent l’heure, le lieu public et l’action attendue.
- Les badges et les mises en avant ne sont pas rédigés comme des garanties.

---

## 22. Glossaire

| Terme                    | Sens dans BoulotFlash                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Candidat                 | Personne qui postule. Appelé aussi travailleur dans les anciennes notes.           |
| Recruteur                | Personne ou structure qui publie. Appelé aussi employeur dans les anciennes notes. |
| Offre ou mission publiée | Annonce structurée.                                                                |
| Participation            | Lien créé quand une place proposée est acceptée.                                   |
| Place                    | Une des personnes recherchées. Une proposition en attente en réserve une.          |
| Version de conditions    | Instantané du montant, du lieu, de la durée et des prises en charge.               |
| Badge                    | Description d’un contrôle effectué, sans garantie de paiement ni de qualité.       |
| Abonnement | Droit d’utiliser les services recruteur. Actif dès l’ouverture du profil. |
| Services payants | Option admin, désactivée au départ. Elle rend payants l’annonce, la mise en avant et les autres services recruteur. |
| Mise en avant | Emplacement sponsorisé, identifié, retiré quand l’offre n’est plus ouverte. Gratuite ou payante selon l’option. |
| Paiement direct | Le salaire va du recruteur au candidat sans passer par BoulotFlash. |

---

## 23. Décisions à prendre avant développement

| Sujet               | Hypothèse retenue en attendant le terrain                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Ville               | Kinshasa, à confirmer.                                                                                                                       |
| Communes            | Quelques communes voisines, choisies après les entretiens. Le référentiel contient les 24, toutes inactives par défaut.                      |
| Catégories          | Référentiel large de la section 6, actif au lancement. Les catégories sensibles sont revues avant publication.                               |
| Compte | Un compte, modes candidat et recruteur distincts. Ouverture par Google, Facebook ou Instagram. Plusieurs providers peuvent être liés au même compte. |
| Mot de passe public | Aucun. OAuth public uniquement. Second facteur pour les admins. |
| Majorité            | Confirmation déclarative. Pas de date de naissance publiée. Pas de pièce candidat.                                                           |
| Limite anti-spam    | 5 candidatures par jour glissant, sans déblocage payant.                                                                                     |
| Abonnement | Obligatoire pour les services recruteur. Créé actif et gratuit avec le profil. |
| Services payants | Désactivés au départ. Un administrateur BoulotFlash les active. Alors l’annonce, la mise en avant et les autres services sont payants. |
| Prix | Préparés (2 à 5 USD la publication, 5 à 20 USD la mise en avant) et appliqués seulement après activation. |
| Paiement BoulotFlash | Inutile tant que l’option est désactivée. Ensuite, rapprochement manuel. Une capture ne suffit pas. Un paiement, un service. |
| Contact             | Numéro et adresse exacte seulement après acceptation de la place. Avant cela : commune, repère, carte du point public et distance Haversine. |
| Carte               | Leaflet, tuiles OpenStreetMap ou MapTiler, géocodage Nominatim. Pas de suivi GPS continu.                                                    |
| Messagerie          | Pas de chat interne. Appel et WhatsApp sans message automatique.                                                                             |
| Salaire             | Toujours direct. Pas de portefeuille, de séquestre ni de commission.                                                                         |
| Notes               | Retours privés. Pas de note publique au pilote.                                                                                              |
| Proposition         | Expire au plus tard à la clôture des sélections, avec un minimum proposé de 2 heures.                                                        |
| Opérateurs          | Un ou deux, après test de réception dans la ville.                                                                                           |
| Fichiers            | Conteneur `s3`, image `quay.io/minio/minio`. Bucket média et bucket privé. La base ne stocke que la clé d’objet.                             |
| Notifications       | Centre in-app uniquement. Une offre qui correspond au profil reste in-app, sans e-mail. Push hors pilote. |
| Exécution           | Docker Compose pour le développement et le déploiement. Services : `web`, `api`, `worker`, `postgres`, `redis`, `s3`, `proxy`.               |
| Langue              | Français. Chaînes externalisées pour une langue locale ultérieure.                                                                           |
| Extension           | Uniquement après recrutements répétés, signalements traités et paiements constatés.                                                          |

Principe directeur : démontrer qu’un recruteur trouve une personne adaptée, que la mission se réalise dans les conditions annoncées et que le recruteur revient utiliser BoulotFlash.

---

## 24. Coûts à chiffrer séparément

- Développement.
- Logo et design system.
- Hébergement du VPS qui exécute le Docker Compose, domaine, volume du conteneur S3.
- Connexion OAuth Google, Facebook et Instagram (configuration détaillée dans `docs/implementation/AUTH_OAUTH_PROVIDERS.md`).
- Pas de projet Firebase Messaging requis pour le pilote (push hors périmètre).
- Frais d’encaissement.
- Modération et assistance.
- Prospection terrain.
- Maintenance.

Calcul de pilotage : contribution mensuelle = recettes encaissées − remboursements − frais de paiement − coûts variables de notification et d’assistance. Cette contribution doit ensuite couvrir les coûts fixes. Elle ne représente pas à elle seule le bénéfice.

Fin du cahier des charges.
