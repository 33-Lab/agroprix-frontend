# AgroPrix — Tests E2E (Playwright)

## Run local

```bash
npm install
npm run test:e2e:install    # chromium + deps (une fois)
npm run test:e2e            # headless, cible prod par defaut
npm run test:e2e:ui         # mode interactif
```

## Override des cibles

Les tests visent `https://app.agroprix.app` + `https://web-production-46fb2.up.railway.app` par defaut.

```bash
BASE_URL=http://localhost:3000 API_BASE=http://localhost:8000 npm run test:e2e
```

## Specs actuelles

- `smoke.spec.ts` — frontend charge, ecran auth present, PWA manifest OK
- `backend.spec.ts` — `/api/ping` (GET+HEAD), `/api/status/monitors`, `/api/prices` sanity (regression bug -100%)
- FedaPay sandbox — skippe tant que `FEDAPAY_SANDBOX_KEY` n'est pas defini dans l'env CI.

## Activer le test FedaPay sandbox

1. Creer un compte sur https://sandbox.fedapay.com
2. Copier la cle publique `pk_sandbox_...`
3. Dans GitHub repo -> Settings -> Secrets -> Actions : ajouter `FEDAPAY_SANDBOX_KEY`
4. Le workflow CI expose automatiquement la variable aux tests.

## Non-destructif

Aucun test ne cree de compte, ne lance de paiement reel, ni ne modifie de donnees en prod. Le scenario register/login est volontairement omis tant qu'une DB de staging isolee n'est pas en place.
