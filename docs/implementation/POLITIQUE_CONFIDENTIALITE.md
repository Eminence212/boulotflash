# Politique de confidentialité — BoulotFlash

| | |
| --- | --- |
| Document | Politique de confidentialité (protection des données) |
| Version | 0.1 — 22 octobre 2026 |
| Statut | **Validé localement** (D24, registre 22 octobre 2026). Servi in-app (`terms_documents.kind = PRIVACY`) et accepté depuis `/connexion`. |
| Langue | Français simple |
| Produit | [CDC.md](../CDC.md) §12.3, §12.4, BF-AUTH-07, BF-W-04 |
| Conditions | [CONDITIONS_UTILISATION.md](CONDITIONS_UTILISATION.md) |

> Texte destiné à être servi par l’application (`terms_documents.kind = PRIVACY`) et lié depuis l’écran d’aide / la case d’acceptation.

---

## 1. Qui traite vos données

**Responsable du traitement (à compléter à la validation locale)** : l’entité qui exploite BoulotFlash pour le pilote à Kinshasa (RDC).

Coordonnées de contact : celles affichées dans l’aide in-app une fois le pilote ouvert.

Cette politique explique quelles données nous utilisons, pourquoi, combien de temps, et quels droits vous avez.

---

## 2. Pourquoi nous utilisons vos données

Finalités déclarées :

1. **Mise en relation** pour des missions courtes (profil, offres, candidatures, propositions, acceptations).
2. **Confiance et sécurité** (modération, signalements, journal des actions sensibles, lutte contre les abus).
3. **Facturation des services recruteur** BoulotFlash (quand les services payants sont activés) et conservation des reçus.
4. **Fonctionnement technique** (session, notifications in-app, sauvegardes, logs nécessaires).

Nous **ne revendons pas** votre numéro de téléphone ni votre base de contacts.

---

## 3. Quelles données nous collectons

### 3.1 À la connexion (providers)

Via Google, Facebook ou Instagram, selon ce que le provider nous envoie et que vous autorisez :

- identifiant technique du provider ;
- e-mail (s’il est fourni et vérifié) ;
- nom d’affichage ;
- photo de profil (si fournie).

Nous ne stockons pas votre mot de passe Google / Meta. Les jetons OAuth sont vérifiés côté serveur.

### 3.2 Sur votre profil

- nom d’usage ;
- confirmation de majorité (18 ans et plus) — la date de naissance n’est **pas** publiée ;
- numéro de téléphone (nécessaire pour candidater ou publier) ;
- rôle / mode (candidat, recruteur) ;
- commune, compétences ou type de recruteur ;
- disponibilités (créneaux) ;
- photo de profil (optionnelle au-delà du provider).

### 3.3 Sur les missions et échanges

- contenu des offres (tâche, montant, lieu approximatif, dates, etc.) ;
- candidatures, propositions, acceptations, annulations, déclarations de réalisation ou d’absence ;
- **adresse exacte et numéros de mission** : visibles seulement après acceptation d’une place, et seulement aux deux parties ;
- signalements et messages de recours ;
- retours privés (modération), sans note publique au lancement ;
- notifications in-app (titre, message, lu / non lu).

### 3.4 Recruteur — pièces et paiements

- justificatif de structure, s’il est fourni (accès restreint, stockage privé) ;
- références de paiement des services BoulotFlash, montants, statut, reçu.

### 3.5 Technique

- journaux de sécurité (connexion admin, suspension, export, confirmation de paiement, ouverture d’un justificatif) ;
- jetons de session ;
- position actuelle, **seulement si vous l’acceptez** : une seule coordonnée, remplacée à chaque connexion, pour afficher d’abord les missions les plus proches, en RDC. Pas d’historique et pas de suivi continu. Vous pouvez la retirer depuis votre compte.

Nous ne demandons **pas** de pièce d’identité aux candidats par défaut.

---

## 4. Qui peut voir quoi

| Donnée | Visibilité |
| --- | --- |
| Offre publique (sans adresse exacte ni téléphone) | Visiteurs et utilisateurs |
| Candidatures | Recruteur de l’offre + admin selon rôle |
| Adresse exacte / numéros après acceptation | Uniquement les deux parties de la place acceptée |
| Après annulation | Accès futur retiré ; historique utile à un signalement reste accessible à l’admin selon conservation |
| Justificatif de structure | Admin autorisé (URL privée courte) |
| Export CSV admin | Finance / super-admin seulement |
| Retours de mission | Privés (modération) |
| Position actuelle, si vous l’acceptez | Vous seul. Elle n’est pas montrée aux autres. |

Les administrateurs BoulotFlash accèdent aux données nécessaires à la modération, au support et à la finance, dans la limite de leur rôle.

---

## 5. Combien de temps nous gardons les données

Sous réserve de la **validation locale** (D24) :

| Élément | Durée de travail |
| --- | --- |
| Compte et missions | **24 mois** après la dernière activité, puis anonymisation |
| Compte fermé sur demande | Anonymisation : retrait téléphone / e-mail, suppression photo, empreintes bloquées **90 jours** (réinscription impossible avec le même téléphone, e-mail ou identifiant provider) |
| Justificatif de structure (S3 privé) | Suppression **12 mois** après la décision, ou plus tôt si vous retirez la demande |
| Export de vos données (fichier généré) | Lien privé ~**5 minutes** ; fichier supprimé sous **7 jours** |
| Export CSV admin | Même logique de lien court / suppression sous 7 jours |
| Reçus de paiement BoulotFlash | Durée comptable applicable (pas effacés avec le compte avant cette durée) |
| Sauvegardes techniques | Quotidiennes, conservation **30 jours** |

---

## 6. Vos droits

Depuis votre profil (une fois connecté) :

1. **Copie** de vos données (`export`) : JSON de votre compte. Il ne contient pas les coordonnées des missions des autres ; les vôtres seulement pour les participations encore autorisées.
2. **Fermeture** du compte : confirmation explicite, puis anonymisation selon le tableau ci-dessus.
3. **Correction** des informations de profil (nom d’usage, compétences, etc.).
4. **Changement de numéro** : demande traitée par le **support** (pas de changement automatique).

Pour une question ou une plainte relative aux données : contactez le support via l’aide in-app. Les voies de recours locales seront précisées à la validation juridique.

---

## 7. Sécurité (résumé)

- Connexion chiffrée (TLS).
- Coordonnées et justificatifs protégés (accès après acceptation ; S3 privé pour les pièces).
- Mots de passe admin hachés (comptes internes uniquement).
- Pas de contenu privé laissé dans un cache accessible après déconnexion.
- Notifications métier **in-app uniquement** au pilote (pas de push Firebase).

Aucun système n’est infaillible. Signalez-nous tout accès anormal via le support.

---

## 8. Cookies et stockage local

BoulotFlash utilise principalement une **session** (jeton / cookie de session sécurisé) pour vous garder connecté.

Nous évitons de stocker des données métier sensibles dans le `localStorage`. À la déconnexion, le stockage local du navigateur lié à la session est vidé.

Pas de publicité tierce basée sur un profil de navigation dans le périmètre pilote décrit par le CDC.

---

## 9. Prestataires

Pour fonctionner, BoulotFlash s’appuie notamment sur :

- **Google** et **Meta** (Facebook / Instagram) pour l’ouverture de session ;
- hébergement, base de données, fichiers (stockage type S3) ;
- opérateurs de paiement / mobile money pour les **services recruteur** (pas pour le salaire entre vous) ;
- cartographie (tuiles OpenStreetMap / MapTiler, géocodage Nominatim) — sans suivi continu de votre position.

Ces prestataires reçoivent seulement ce qui est nécessaire à leur rôle.

---

## 10. Mineurs

BoulotFlash est réservé aux **18 ans et plus**. Les offres visant des mineurs comme travailleurs sont interdites.

---

## 11. Modifications

Nous pouvons mettre à jour cette politique. La version publiée porte un numéro et une date. Une version importante pourra exiger une nouvelle acceptation, comme pour les conditions d’utilisation.

---

## 12. Validation locale

Les conditions de fonctionnement, la protection des données et le statut de l’activité de mise en relation doivent être **validés localement** avant lancement public (CDC §12.4, §19). Tant que le registre (D24) n’enregistre pas cette validation, ce document reste un **projet non opposable**.
