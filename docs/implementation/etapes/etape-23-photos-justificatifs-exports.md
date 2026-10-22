<!-- Document unique — ne pas fusionner avec d'autres étapes -->
| | |
| --- | --- |
| Étape | 23 — Photos, justificatifs, exports |
| Normatif produit | [CDC.md](../../CDC.md) |
| Plan d'implémentation | [PLAN_IMPLEMENTATION_BOULOTFLASH.md](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md) §9 |
| Index des étapes | [README.md](README.md) |
| Précédente | [etape-22-services-gratuits-paiement-droits.md](etape-22-services-gratuits-paiement-droits.md) |
| Suivante | [etape-24-indicateurs-tableau-de-bord.md](etape-24-indicateurs-tableau-de-bord.md) |

> Une seule étape par fichier. Toujours respecter le CDC et le plan. Ne pas enchaîner l'étape suivante sans recette de celle-ci.

---

# Étape 23 — Photos, justificatifs et exports

**Objectif et résultat visible**

Le candidat ajoute une photo facultative. Le recruteur dépose un justificatif privé. La finance exporte un CSV qui expire sous 7 jours.

**Exigences couvertes**

BF-E-03, BF-AD-07, BF-AD-08, BF-W-05, §13.5. Pas de pièce d’identité candidat.

**Prérequis et dépendances**

Étapes 07, 10, 11.

**Travaux à réaliser, dans l’ordre**

1. Upload d’avatar par URL pré-signée. Le worker écrit la vignette 200 px et l’image 800 px, supprime l’original trop lourd.
2. Refus au-delà de 5 Mo et des types hors JPEG, PNG, WebP.
3. Justificatif : bucket privé, 10 Mo, PDF ou image. Statuts `NONE`, `PENDING`, `VERIFIED`, `REJECTED`. Badge « structure contrôlée » seulement si `VERIFIED`. La pièce n’est pas sur le profil public.
4. Lecture du fichier : titulaire ou modérateur, URL 5 minutes, journal `OPEN_DOCUMENT`.
5. Retrait de la demande par le recruteur : supprimer l’objet tout de suite.
6. Export : `POST /admin/exports` par finance ou super. Le worker écrit le CSV dans le privé. Lien 5 minutes. Un balayage supprime l’objet à 7 jours. Le CSV n’a pas d’adresse exacte ni de numéro complet : téléphone masqué.
7. Aucun champ « pièce d’identité » dans le formulaire candidat.

**Règles techniques et métier**

Le badge ne dit pas que la mission sera payée. Le texte d’interface reprend la section 11.1 du CDC.

**Tests manuels après cette étape**

| ID | Scénario et objectif | Compte et préconditions | Actions exactes | Résultat attendu | Vérification complémentaire |
| --- | --- | --- | --- | --- | --- |
| 23-A | Photo | `C-COMPLET` | Choisir un JPEG de 1 Mo, enregistrer | Vignette visible après le traitement worker | La base a la clé, pas le binaire |
| 23-B | Trop lourd | Fichier de 6 Mo | Tenter l’envoi | Refus | Objet supprimé |
| 23-C | Justificatif | `R-2` | Déposer un PDF | Statut en attente. Pas de badge | Le profil public n’a pas de lien permanent |
| 23-D | Revue | `modo` | Ouvrir le fichier, accepter | Badge « structure contrôlée » | Journal d’ouverture. URL inutilisable après 5 minutes |
| 23-E | Tiers | `C-A` | Deviner l’URL du justificatif sans signature | 403 |  |
| 23-F | Export | `finance` | Exporter les utilisateurs du mois | Fichier téléchargé, téléphones masqués | `support` reçoit 403. Après déplacement d’horloge de 8 jours, l’objet n’est plus lisible |
| 23-G | Pas de pièce candidat | Formulaire candidat | Parcourir les champs | Aucune demande de pièce d’identité |  |

**Tests automatisés nécessaires**

Jest : types et tailles, badge seulement si vérifié, scope de l’export, masquage du téléphone dans le CSV.

**Critères de fin**

L’étape n’est **close** que si tous les points ci-dessous sont cochés. Exécuter les tests manuels du tableau **dans l’ordre**, noter OK/KO et l’anomalie éventuelle. Ne pas ouvrir l’étape suivante sans cette recette. Références : [CDC.md](../../CDC.md), [PLAN §9](../../PLAN_IMPLEMENTATION_BOULOTFLASH.md).

**Tests manuels (obligatoires)**
- [ ] `23-A` — Photo
- [ ] `23-B` — Trop lourd
- [ ] `23-C` — Justificatif
- [ ] `23-D` — Revue
- [ ] `23-E` — Tiers
- [ ] `23-F` — Export
- [ ] `23-G` — Pas de pièce candidat

**Livrables et règles**
- [ ] Privé séparé du média.
- [ ] Export réservé et expiré.
- [ ] Badge honnête.
- [ ] Tests automatisés exécutés avec succès : Jest types/tailles, badge, scope export.
- [ ] Compte rendu de recette fourni (IDs manuels OK/KO + anomalies).

Anomalie bloquante : justificatif en URL permanente, ou CSV avec numéro complet.

**Instruction d’exécution pour Cursor**

Implémente uniquement l’étape 23 : photos, justificatifs et exports. Ne change pas les règles de paiement. Fournis la recette 23-A à 23-G.

