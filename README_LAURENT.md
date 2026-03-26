# AgroPrix V6.5 — Dossier de Passation Laurent
**Date :** 26 mars 2026
**Préparé par :** David + Claude (33 Lab Agency Solutions)
**Version déployée :** V6.5 — agroprix-v6.surge.sh

---

## 1. STACK TECHNIQUE

| Composant | Technologie | Notes |
|---|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JS | **Pas de React, pas de npm, pas de build system** |
| CSS | styles.css + design-premium.css | design-premium.css est une surcouche, chargée EN SECOND |
| JS | Modules IIFE exposés sur `window.AgroPrix` | Pas de bundler |
| Backend | FastAPI + SQLAlchemy + PostgreSQL | Railway (voir section Infrastructure) |
| Auth | JWT (python-jose) + bcrypt | Tokens localStorage |
| PWA | manifest.json + sw.js manuel | Pas de Vite/Workbox |
| Icônes | Lucide CDN (`unpkg.com/lucide`) | Rendu via `lucide.createIcons()` |
| Cartes | Leaflet CDN | Vue Carte Interactive |
| Charts | Chart.js CDN | Courbes historique prix |
| Paiement | FedaPay (validation en cours) + KKiaPay | Simulation active en attendant mode live |
| Analytics | Plausible.io | Sur le site vitrine uniquement |
| Déploiement | Surge CLI | `surge . agroprix-v6.surge.sh` |

---

## 2. ARCHITECTURE FICHIERS

```
frontend/
├── index.html              ← MONOLITHE — toutes les vues HTML sont ici (≈1200 lignes)
├── manifest.json           ← PWA manifest (mis à jour V6.5)
├── sw.js                   ← Service Worker stratégie hybride (mis à jour V6.5)
├── favicon.ico
├── CNAME                   ← agroprix-v6.surge.sh (Surge)
├── 200.html                ← Copie d'index.html pour SPA routing sur Surge
│
├── css/
│   ├── styles.css          ← Styles de base (grille, layout, variables CSS)
│   └── design-premium.css  ← Surcouche design premium (NOUVEAU V6.5)
│
├── js/                     ← RÈGLE CRITIQUE : toujours éditer le .src, puis copier en .js
│   ├── config.js(.src)     ← Variables globales, pays, marchés, viewIdMap
│   ├── data.js(.src)       ← Prix hardcodés + helpers de données
│   ├── api.js(.src)        ← Appels backend Railway (fetch + JWT)
│   ├── auth.js(.src)       ← Login/Register/Session + initAuth()
│   ├── ui.js(.src)         ← showView(), toggles, refreshIcons(), icon()
│   ├── app.js(.src)        ← init(), SW registration, demoMode(), paiement
│   ├── analysis.js(.src)   ← Analyse des prix (vue principale)
│   ├── negoce.js(.src)     ← Carnet de négoce + opportunités
│   ├── production.js(.src) ← Assistant production + conseils producteur
│   ├── export.js(.src)     ← Tableau export international
│   ├── security.js(.src)   ← Module sécurité + console warning anti-inspect
│   ├── cgu.js(.src)        ← CGU périodiques + archivage profil (tous les 90 jours)
│   ├── inputs.js(.src)     ← Prix Intrants (catalogue embarqué en inline — PLUS de fetch)
│   ├── marketplace.js(.src)← Place de marché + QR traçabilité + FedaPay + WhatsApp
│   ├── financing.js(.src)  ← GPS Financement (90+ institutions, 8 pays)
│   ├── scoring.js(.src)    ← Score Crédit 0-1000 (6 dimensions)
│   ├── ndvi.js(.src)       ← Santé Parcelle NDVI + Leaflet
│   └── dashboard.js(.src)  ← Dashboard (non utilisé actuellement — vide)
│
├── data/
│   ├── prix_reels_uemoa.json    ← 2940 prix (21 produits × 8 pays × périodes)
│   ├── institutions.json        ← 90+ institutions de financement agricole UEMOA
│   └── inputs_catalog.json      ← Catalogue intrants (copie de sécurité — déjà embarqué dans inputs.js)
│
└── img/
    ├── icon-192.png             ← Icône PWA (maskable)
    ├── icon-512.png             ← Icône PWA (maskable)
    ├── logo_agroprix.png        ← Logo original (fond blanc)
    └── logo_agroprix_cropped.png← Logo recadré (utilisé dans topbar)
```

---

## 3. RÈGLE CRITIQUE — WORKFLOW FICHIERS JS

**TOUJOURS** suivre cette procédure pour modifier le JavaScript :

```bash
# 1. Éditer le fichier source
nano js/monmodule.js.src

# 2. Copier vers le fichier déployé (pas de build, pas de minification)
cp js/monmodule.js.src js/monmodule.js

# 3. Déployer
surge . agroprix-v6.surge.sh
```

**Ne JAMAIS éditer directement le `.js`** — il sera écrasé à la prochaine copie depuis `.src`.

---

## 4. INFRASTRUCTURE DÉPLOYÉE

| Service | URL | Accès |
|---|---|---|
| **Frontend DEMO** | https://agroprix-v6.surge.sh | Public |
| **Frontend PROD** | https://frontend-theta-fawn-57.vercel.app | Vercel (David) |
| **Backend PROD** | https://web-production-717dd0.up.railway.app | Railway (Laurent) |
| **Base de données** | PostgreSQL sur Railway | Voir Railway dashboard |
| **Domaine** | agroprix.app (DNS Porkbun) | David — noveadg@gmail.com |
| **Sous-domaine app** | app.agroprix.app | DNS → Surge (propagation en cours) |
| **Site vitrine** | https://agroprix-site.surge.sh | Surge |

### Variables d'environnement Railway (backend)
```
DATABASE_URL = ${{Postgres.DATABASE_URL}}   ← Référence Railway (PAS une string littérale)
SECRET_KEY   = [clé JWT — voir Railway dashboard]
ALLOWED_ORIGINS = https://agroprix-v6.surge.sh,https://app.agroprix.app,https://frontend-theta-fawn-57.vercel.app
```

### URL Backend dans le frontend
Fichier : `js/config.js` ligne 10 :
```javascript
AP.API_BASE = 'https://web-production-717dd0.up.railway.app';
```
Pour dev local : décommenter `AP.API_BASE = 'http://localhost:8000';`

---

## 5. MODULES JS — DÉTAIL FONCTIONNEL

### `config.js` — Variables globales
- `AP.countryMeta` : 8 pays UEMOA (flag, lat/lng, iso3)
- `AP.marketsByCountry` : marchés par pays (nom + coordonnées GPS)
- `AP.cultureNames` : 21 cultures (FR)
- `AP.viewIdMap` : mapping `showView('inputs')` → `document.getElementById('viewInputs')`
- `AP.viewTitles` : titre affiché dans la topbar

### `auth.js` — Authentification
- `AP.auth.initAuth()` : appelé au démarrage, vérifie le token localStorage
- `AP.auth.getUser()` : retourne l'objet user courant ou null
- Mode démo : `demoMode()` — injecte un faux user `demo@agroprix.app` sans passer par l'API
- Le token JWT est stocké dans `localStorage.agroprix_token`
- L'utilisateur est dans `localStorage.agroprix_user` (JSON)

### `ui.js` — Navigation
- `showView(viewId, el)` : affiche une vue, cache les autres, appelle l'init du module
- Modules initialisés par `showView` : negoce, export, inputs, marketplace, financing, scoring, ndvi
- `refreshIcons()` : appelé après chaque render dynamique pour activer Lucide
- `icon(name, size)` : helper retourne `<i data-lucide="...">` (ex: `icon('search', 20)`)

### `inputs.js` — Prix Intrants ⚠️ FIX IMPORTANT
**AVANT (bugué)** : le module faisait un `fetch('/data/inputs_catalog.json')` → module bloqué si le fichier est absent ou réseau lent.
**APRÈS (corrigé V6.5)** : le catalogue est embarqué directement en variable JS inline. Plus aucun fetch. Chargement instantané.
Si tu veux ajouter/modifier des produits dans le catalogue, édite la variable `catalog` en haut de `inputs.js.src` (ligne 8).

### `marketplace.js` — Place de marché
- Offres/Demandes avec filtre par produit et pays
- QR code de traçabilité par offre (via `showQR()` + api.qrserver.com)
- WhatsApp direct sur chaque offre (`wa.me/...`)
- Paiement simulé FedaPay (MTN MoMo, Moov Money) — prêt pour le mode live

### `financing.js` — GPS Financement
- 90+ institutions de financement (BOAD, BNDA, FNDA, IMFs, banques)
- Données chargées depuis `data/institutions.json` + données fallback inline
- Filtre par pays, type d'institution, montant
- Formulaire de profil éleveur pour le matching

### `scoring.js` — Score Crédit
- Score 0-1000 calculé côté client en 6 dimensions :
  1. Stabilité activité (ancienneté compte)
  2. Diversification cultures
  3. Superficie déclarée
  4. Historique prix saisis (inputs.js)
  5. Marchés visités
  6. Profil CGU complété
- Jauge SVG animée (arc cercle)

### `ndvi.js` — Santé Parcelle
- Carte Leaflet centrée sur le pays de l'utilisateur
- Couche NDVI simulée (vraie intégration Sentinel-2 → tâche Laurent)
- Bouton "Enregistrer ma parcelle" → localStorage

### `cgu.js` — CGU Périodiques
- Revalidation tous les 90 jours (modèle Google/Meta)
- À chaque acceptation, sauvegarde un snapshot du profil dans `localStorage.agroprix_profile_history`
- Données collectées : pays, cultures, superficie, genre, âge, expérience, type exploitation
- Mode démo (`user.demo === true`) → skip la CGU

### `security.js` — Sécurité
- Console warning anti-ingénierie inverse (intentionnel)
- Garder ce console.warn — ne pas le supprimer

### `app.js` — Point d'entrée
- `init()` : check API, updateMarkets, registerSW, setupInstallPrompt, initAuth, checkCGU, handleStartupView
- `handleStartupView()` : gère `?view=xxx` dans l'URL (shortcuts PWA manifest)
- `demoMode()` : mode démonstration sans auth
- `souscrirePlan(plan, montant)` : modal de paiement FedaPay simulé
- `simulerPotentiel()` : simulateur pour la vue Propriétaire

---

## 6. CSS — ARCHITECTURE

### `styles.css` — Base
Variables CSS racine (`:root`) :
```css
--primary: #2D6A4F;
--green: #2D6A4F;
--dark-green: #1B4332;
--gold: #E8862A;
--alert: #E53E3E;
--bg: #F8F9FA;
--text: #1A1A2E;
--text-light: #6B7280;
--border: #E5E7EB;
```

Layout :
- `.topbar` : header fixe vert foncé
- `.sidebar` : navigation latérale desktop, glisse depuis la gauche sur mobile
- `.main` : zone de contenu (⚠️ c'est `.main` PAS `.main-content` — bug corrigé V6.5)
- `.bottom-nav` : navigation mobile (5 tabs)
- `.view-container` : chaque vue. Visible uniquement si classe `.show` + `display:block`
- `.view-container.show { opacity: 1 !important; visibility: visible !important; }` ← NE PAS remettre une animation ici — ça cache les pages

### `design-premium.css` — Surcouche V6.5
Chargé **après** styles.css dans index.html. Utilise `!important` pour overrider.
Cible les éléments générés par JS via attribut-selectors :
```css
div[style*="border-radius"][style*="padding"][style*="background:#fff"] { ... }
```
Apporte : ombres diffuses, radius 16px, typographie 700+, micro-transitions 0.2s, boutons box-shadow.

---

## 7. SERVICE WORKER — STRATÉGIE V6.5

```
sw.js — Cache version : agroprix-v6.5.1
```

| Type requête | Stratégie | Fallback offline |
|---|---|---|
| `/api/*` et Railway | Network-only | JSON `{ error: 'Hors ligne', offline: true }` |
| CDN (fonts, Chart.js, Leaflet) | Cache-first | `503` |
| Assets locaux (.js, .css, .html) | Network-first → cache | `index.html` (SPA) |

**⚠️ Pour bumper la version du SW** (forcer refresh chez tous les utilisateurs) :
Changer la ligne 5 de `sw.js` :
```javascript
const CACHE_VERSION = 'v6.5.2'; // incrémenter à chaque déploiement majeur
```

---

## 8. PWA MANIFEST

Fichier : `manifest.json`
- `display: "standalone"` ✅
- Icons avec `purpose: "any"` ET `purpose: "maskable"` séparés ✅ (Lighthouse exige 2 entrées distinctes)
- 3 shortcuts : Analyse, Négoce, GPS Financement
- `?view=xxx` dans les shortcuts → géré par `handleStartupView()` dans app.js

---

## 9. MODE DÉMO

L'application a un mode démo complet **sans backend** :
- Bouton "Mode Démo" sur l'écran de login
- Appelle `demoMode()` → injecte `{ demo: true, role: 'pro', pays: 'benin' }` en localStorage
- Toutes les fonctionnalités sont disponibles avec données simulées
- CGU skippées en mode démo (`user.demo === true`)
- Prix chargés depuis `data/prix_reels_uemoa.json` (2940 entrées, pas d'API nécessaire)

---

## 10. BACKEND API — ENDPOINTS DISPONIBLES

Base URL : `https://web-production-717dd0.up.railway.app`

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Connexion → JWT |
| GET | `/api/auth/me` | Profil utilisateur courant |
| GET | `/api/prices/?country=XX&culture=XX` | Prix du marché |
| POST | `/api/prices/contribute` | Crowdsourcing prix |
| POST | `/api/sync/seed` | Injecter 2940 prix de base |
| GET | `/api/market/buyers` | 10 acheteurs internationaux (Olam, Cargill...) |
| GET | `/api/weather/?lat=X&lng=Y` | Météo via Open-Meteo |
| GET | `/docs` | Documentation Swagger complète |

**Headers requis pour les routes authentifiées :**
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

## 11. PAIEMENT — ÉTAT ACTUEL

| Provider | Statut | Mode |
|---|---|---|
| **FedaPay** | En cours de validation (24-72h) | Simulation active |
| **KKiaPay** | Validé ✅ | À brancher |

La simulation FedaPay est dans `app.js` (`souscrirePlan()`, `confirmerPaiement()`).
**Quand FedaPay passe en mode live**, remplacer la simulation par l'appel SDK FedaPay :
```javascript
// Remplacer le modal de simulation par :
FedaPay.init({
  public_key: 'pk_live_XXXXXXXXXXXX',
  transaction: { amount: montant, description: 'Plan ' + plan },
  customer: { email: user.email, phone_number: phone }
}).open();
```
Clé publique live : à récupérer dans le dashboard FedaPay (acc_1018322681, noveadg@gmail.com).

---

## 12. APIS EXTERNES — À BRANCHER (tâche Laurent)

Les connecteurs suivants sont identifiés mais pas encore intégrés côté backend :

| API | Usage | Statut |
|---|---|---|
| **WFP VAM** | Prix alimentaires UEMOA réels | Gratuite, endpoint disponible |
| **FAOSTAT** | Prix agriculture FAO | Gratuite, accès direct |
| **Agromonitoring** | NDVI réel Sentinel-2 | Nécessite création compte + clé API |
| **ANOPACI** | Prix anacarde Côte d'Ivoire | Contact direct |
| **INSAE** | Stats Bénin | Demande manuelle (délai 2-4 sem.) |
| **Open-Meteo** | Météo | ✅ Déjà intégré backend |

Pour NDVI Agromonitoring :
1. Créer compte sur agromonitoring.com
2. Ajouter `AGROMONITORING_KEY=xxx` dans Railway
3. Endpoint : `GET /api/ndvi/?lat=X&lng=Y&polygon=[[...]]`

---

## 13. BUGS CONNUS ET FIXES APPLIQUÉS

### Fixes V6.5 (cette session)

| Bug | Fichier | Fix |
|---|---|---|
| Module Prix Intrants bloqué sur "Chargement..." | `inputs.js` | Catalogue embarqué inline (suppression du `fetch`) |
| `.main-content` vs `.main` (CSS/HTML mismatch) | `css/styles.css` | Corrigé → `.main` |
| `animation: fadeInUp` avec `fill-mode: backwards` cachait les pages | `css/styles.css` | Supprimé, remplacé par `opacity:1 !important` sur `.view-container.show` |
| SW ne cachait pas les nouveaux modules JS | `sw.js` | inputs/marketplace/financing/scoring/ndvi/cgu/design-premium ajoutés |
| Manifest : icons `purpose: "any maskable"` combiné | `manifest.json` | Séparé en 2 entrées distinctes (Lighthouse score PWA) |
| Shortcuts PWA ne naviguaient pas vers la bonne vue | `app.js` | Ajout de `handleStartupView()` qui lit `?view=xxx` |

### Bugs connus restants

| Bug | Priorité | Description |
|---|---|---|
| SSL app.agroprix.app | 🔴 HAUT | DNS changé vers Surge, certificat en cours de propagation (24-48h) |
| NDVI données réelles | 🟡 MOYEN | Carte affiche simulation, pas de vraies données Sentinel-2 |
| FedaPay mode live | 🟡 MOYEN | Validation compte en attente (24-72h) |
| Scores Crédit basés sur localStorage | 🟡 MOYEN | À terme, brancher sur données backend pour persistance cross-device |
| Screenshots manifest.json | 🟢 BAS | `img/screenshot-analyse.png` et `img/screenshot-negoce.png` n'existent pas encore |

---

## 14. DÉPLOIEMENT

### Déployer sur Surge (frontend démo)
```bash
cd "C:/Users/novea/OneDrive/Bureau/SAAS DEMO/AgroPrix/AgroPrix_V6_Unified/frontend"
surge . agroprix-v6.surge.sh
```
Compte Surge : noveadg@gmail.com

### Déployer sur Vercel (frontend prod)
```bash
# Via GitHub (auto-deploy sur push vers main)
git add -A && git commit -m "feat: description" && git push
```
Vercel surveille https://github.com/33-Lab/agroprix-frontend

### Backend Railway
Push sur le repo backend → Railway redéploie automatiquement.

---

## 15. TESTS

### Tests E2E Playwright (partiels)
- 14/21 tests passent contre agroprix-v6.surge.sh
- Parcours couverts : Login, Mode Démo, Analyse, Négoce, Export
- Parcours à couvrir : Marketplace (FedaPay), GPS Financement, Score Crédit

### Test manuel rapide (checklist)
1. Ouvrir https://agroprix-v6.surge.sh
2. Cliquer "Mode Démo"
3. Vérifier : Analyse → sélectionner pays + culture → "Analyser" → résultats affichés
4. Vérifier : Prix Intrants → s'affiche immédiatement (pas de spinner)
5. Vérifier : GPS Financement → liste d'institutions
6. Vérifier : Score Crédit → jauge SVG animée
7. Vérifier : Marketplace → offres + bouton WhatsApp
8. Vérifier mobile 375px : bottom-nav visible, sidebar masquée

---

## 16. CONTACTS

| Personne | Rôle | Contact |
|---|---|---|
| **David** | Fondateur 33 Lab, Product Owner | Propriétaire du compte Surge/Porkbun/FedaPay |
| **Laurent** | Lead Dev, Backend + infra | Railway dashboard + GitHub 33-Lab |
| **Kolawolé Ogounchi** | Ambassadeur Commercial | SARL Les Domaines du Terroir (LDT) |
| **Savanna** | Designer | Prochaine tâche : screenshots PWA + pictogrammes |

---

## 17. PRIORITÉS TECHNIQUES RESTANTES

| # | Tâche | Effort | Responsable |
|---|---|---|---|
| 1 | Activer FedaPay mode live (quand validé) | 2h | Laurent |
| 2 | Brancher API WFP pour vrais prix temps réel | 4h | Laurent |
| 3 | Intégrer Agromonitoring NDVI (créer compte) | 3h | Laurent |
| 4 | Créer screenshots PWA (manifest) | 30min | Savanna |
| 5 | Audit Lighthouse (cible 95+ PWA) | 2h | Laurent |
| 6 | Tests Playwright complets (21/21) | 3h | Laurent |
| 7 | Connecter Score Crédit au backend | 4h | Laurent |
| 8 | Page /cgu et /cgv accessibles sans login | 1h | Laurent |
| 9 | Intégrer KKiaPay (déjà validé) | 2h | Laurent |
| 10 | Site vitrine Design Premium (agroprix.app) | 2h | David+Claude |

---

*Document généré le 26 mars 2026 — AgroPrix V6.5 — 33 Lab Agency Solutions*
