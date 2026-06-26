/**
 * QA — Navigation par délégation d'événements (CSP Phase 2).
 *
 * Les handlers de navigation d'index.html (sidebar, bottom-nav, menu « Plus »)
 * ont migré de `onclick="showView(...)"` vers `data-action="show-view"` routé
 * par js/actions.js. Ce test vérifie que la délégation fonctionne réellement
 * dans un navigateur : clic → la bonne vue s'affiche, menu « Plus » ouvre/ferme,
 * et aucune erreur JS au chargement.
 *
 * Cible BASE_URL (prod par défaut ; en local : BASE_URL=http://localhost:8099).
 */
import { test, expect } from '@playwright/test';

async function asAdmin(page) {
  // Injecte un user admin (gating client-side : role admin → niveau 99) ET
  // confirme la session : le boot appelle /api/auth/me ; sans réponse OK il
  // retombe sur l'écran de login (l'app shell serait masqué). On stube /me
  // pour garder l'app affichée — local (pas de backend) comme prod (user fictif).
  await page.addInitScript(() => {
    const u = { role: 'admin', email: 'qa@agroprix.test', name: 'QA Bot' };
    try {
      localStorage.setItem('agroprix_user', JSON.stringify(u));
      // Évite la modale CGU (qui intercepte les clics) en marquant l'acceptation
      // à la version courante (sinon revalidation → modale ré-affichée).
      localStorage.setItem('agroprix_cgu_accepted', JSON.stringify({ acceptedAt: new Date().toISOString(), version: '1.0.0' }));
    } catch (e) {}
    const orig = window.fetch;
    window.fetch = function (input) {
      if (String(input).includes('/api/auth/me')) {
        return Promise.resolve(new Response(JSON.stringify({ utilisateur: u }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }));
      }
      return orig.apply(this, arguments as any);
    };
  });
}

// Vrai si l'action déléguée demandée est enregistrée sur la page courante.
// Garde fin (par action) : la CI cible la prod et les actions arrivent par
// vagues de PR ; chaque test ne s'exécute que si SON action est déjà déployée.
async function hasAction(page, name: string): Promise<boolean> {
  return page.evaluate(
    (n) => !!(window as any).AgroPrix
      && typeof (window as any).AgroPrix.actions === 'object'
      && typeof (window as any).AgroPrix.actions[n] === 'function',
    name,
  );
}

test.describe('Navigation déléguée (data-action)', () => {
  test('le dispatcher est chargé et la page boote sans erreur', async ({ page }) => {
    test.slow();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await asAdmin(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const hasActions = await hasAction(page, 'show-view');
    // La CI cible la prod ; tant que la délégation n'y est pas déployée, on skip
    // (la couverture s'active automatiquement après merge + déploiement).
    test.skip(!hasActions, 'délégation data-action pas encore déployée sur la cible');
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('clic nav sidebar (desktop) affiche la bonne vue', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await asAdmin(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    test.skip(!(await hasAction(page, 'show-view')), 'délégation data-action pas encore déployée sur la cible');

    // Négoce → viewNegoce
    await page.locator('#navNegoce').click();
    await expect(page.locator('#viewNegoce')).toBeVisible();

    // Marché → viewMarket
    await page.locator('#navMarket').click();
    await expect(page.locator('#viewMarket')).toBeVisible();

    // Paramètres → viewParams
    await page.locator('#navParams').click();
    await expect(page.locator('#viewParams')).toBeVisible();
  });

  test('menu « Plus » (mobile) : ouvre, navigue, se ferme', async ({ page }) => {
    test.slow();
    // Le bottom-nav et le menu « Plus » sont mobile-only → viewport étroit.
    await page.setViewportSize({ width: 390, height: 844 });
    await asAdmin(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    test.skip(!(await hasAction(page, 'show-view')), 'délégation data-action pas encore déployée sur la cible');

    const moreMenu = page.locator('#moreMenu');
    // Ouvre
    await page.locator('#moreBtn').click();
    await expect(moreMenu).toBeVisible();

    // Clique un item (Financement) → vue affichée + menu refermé
    await moreMenu.locator('[data-view="financing"]').first().click();
    await expect(page.locator('#viewFinancing')).toBeVisible();
    await expect(moreMenu).toBeHidden();
  });

  test('toggle-switch (data-action sur élément non-nav) bascule la classe', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await asAdmin(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    test.skip(!(await hasAction(page, 'toggle-switch')), 'action toggle-switch pas encore déployée sur la cible');

    // Vue Analyse (par défaut) : #togCompare démarre actif → un clic le désactive.
    const tog = page.locator('#togCompare');
    await expect(tog).toHaveClass(/active/);
    await tog.click();
    await expect(tog).not.toHaveClass(/active/);
  });

  test('modale CGV : ouvre (modal-open) puis ferme (modal-close)', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await asAdmin(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    test.skip(!(await hasAction(page, 'modal-open')), 'action modal-open pas encore déployée sur la cible');

    // Les liens CGV/Privacy sont dans la vue Paramètres.
    await page.locator('#navParams').click();
    await expect(page.locator('#viewParams')).toBeVisible();

    const modal = page.locator('#cgvModal');
    await page.locator('[data-action="modal-open"][data-modal="cgvModal"]').click();
    await expect(modal).toBeVisible();
    await modal.locator('[data-action="modal-close"][data-modal="cgvModal"]').click();
    await expect(modal).toBeHidden();
  });
});
