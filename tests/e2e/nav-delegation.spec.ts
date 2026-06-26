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

  test('module Cacao Pro : 0 onclick inline rendu + action EUDR fonctionnelle', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await asAdmin(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    test.skip(!(await hasAction(page, 'cacao-check-eudr')), 'module cacao délégué pas encore déployé sur la cible');

    await page.locator('#navCacao').click();
    await expect(page.locator('#viewCacao')).toBeVisible();
    await page.waitForTimeout(2500); // init module + 1er rendu

    // Rend tous les onglets (chacun génère du HTML qui contenait des onclick).
    for (const tab of ['journal', 'marche', 'dossier', 'dashboard']) {
      await page.evaluate((t) => (window as any).cacaoSwitchTab && (window as any).cacaoSwitchTab(t), tab);
      await page.waitForTimeout(300);
    }

    // Aucun handler inline résiduel dans le DOM généré par le module.
    expect(await page.locator('#viewCacao [onclick]').count()).toBe(0);

    // Action déléguée fonctionnelle : toggle d'un critère EUDR (état local).
    await page.evaluate(() => (window as any).cacaoSwitchTab('dossier'));
    await page.waitForTimeout(400);
    const toggle = page.locator('#viewCacao [data-action="cacao-toggle-eudr"]').first();
    if (await toggle.count()) await toggle.click();

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('module Hévéa Pro : 0 onclick inline rendu + action fonctionnelle', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await asAdmin(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    test.skip(!(await hasAction(page, 'hevea-check-eudr')), 'module hévéa délégué pas encore déployé sur la cible');

    await page.locator('#navHevea').click();
    await expect(page.locator('#viewHevea')).toBeVisible();
    await page.waitForTimeout(2500);

    // Rend tous les onglets (.hevea-tab pilotés par addEventListener) ; on
    // termine sur 'journal' (qui contient le bouton d'ajout de parcelle).
    for (const tab of ['marche', 'dossier', 'dashboard', 'journal']) {
      const t = page.locator(`#viewHevea .hevea-tab[data-tab="${tab}"]`);
      if (await t.count()) { await t.first().click(); await page.waitForTimeout(300); }
    }

    // Aucun handler inline résiduel dans le DOM généré par le module.
    expect(await page.locator('#viewHevea [onclick]').count()).toBe(0);

    // Action déléguée locale : afficher le formulaire d'ajout de parcelle.
    const addBtn = page.locator('#viewHevea [data-action="hevea-show-add-parcelle"]:visible').first();
    if (await addBtn.count()) await addBtn.click();

    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('petits modules : actions enregistrées + toggle CGU fonctionnel', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await asAdmin(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    test.skip(!(await hasAction(page, 'cgu-toggle-crop')), 'petits modules délégués pas encore déployés sur la cible');

    // Toutes les actions des petits modules sont enregistrées (= câblées).
    const registered = await page.evaluate(() => {
      const a = (window as any).AgroPrix.actions;
      return ['negoce-delete', 'scoring-pick-institution', 'cgu-toggle-crop', 'cgu-accept', 'remove-el']
        .every((n) => typeof a[n] === 'function');
    });
    expect(registered).toBeTruthy();

    // Fonctionnel : ouvre la modale CGU et bascule une filière (cgu-toggle-crop).
    await page.evaluate(() => (window as any).AgroPrix.cgu.forceShow());
    const crop = page.locator('#cguModal [data-action="cgu-toggle-crop"]').first();
    await expect(crop).toBeVisible();
    const before = await crop.evaluate((el) => (el as HTMLElement).style.background);
    await crop.click();
    const after = await crop.evaluate((el) => (el as HTMLElement).style.background);
    expect(after).not.toBe(before); // le toggle a changé le style → handler exécuté
  });
});
