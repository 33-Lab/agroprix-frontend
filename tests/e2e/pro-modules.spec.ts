import { test, expect } from '@playwright/test';

/**
 * QA des modules Pro (Cacao / Tomate / Hevea / Plantain) — auth-gated niveau 2.
 *
 * Le gating est CÔTÉ CLIENT (getUserPlanLevel lit localStorage 'agroprix_user' ;
 * role:'admin' => niveau 99). On injecte donc un user admin puis on pilote
 * showView() directement, ce qui reproduit le rendu réel des vues Pro dans un
 * vrai Chromium, sans créer de compte (non-destructif). Les prix viennent du
 * vrai backend (endpoints publics). Les features authentifiées (diagnostic,
 * EUDR, sync négoce) répondent 401 sans cookie — on vérifie juste que l'UI se
 * rend et que les boutons existent.
 */

const PRO = [
  { view: 'cacao', dash: '#cacao-dashboard', label: 'Cacao Pro' },
  { view: 'tomate', dash: '#tomate-dashboard', label: 'Tomate Pro' },
  { view: 'hevea', dash: '#hevea-dashboard', label: 'Hevea Pro' },
  { view: 'plantain', dash: '#plantain-dashboard', label: 'Plantain Pro' },
];

async function asAdmin(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('agroprix_user', JSON.stringify({
        role: 'admin', email: 'qa@agroprix.test', name: 'QA Bot',
      }));
    } catch (e) {}
  });
}

test.describe('Modules Pro — rendu sans crash', () => {
  for (const m of PRO) {
    test(`${m.label} : la vue se rend et le dashboard se remplit`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(String(err)));

      await asAdmin(page);
      await page.goto('/');

      // (Re)pose le user admin et ouvre la vue Pro directement.
      await page.evaluate((view) => {
        try {
          localStorage.setItem('agroprix_user', JSON.stringify({
            role: 'admin', email: 'qa@agroprix.test', name: 'QA Bot',
          }));
        } catch (e) {}
        // @ts-ignore
        if (typeof window.showView === 'function') window.showView(view);
      }, m.view);

      // Le dashboard se peuple après le chargement des prix live (peut prendre qqs s).
      const dash = page.locator(m.dash);
      await expect(dash).toBeAttached();
      await expect(async () => {
        const html = await dash.innerHTML();
        expect(html.length, `${m.label}: dashboard vide`).toBeGreaterThan(80);
      }).toPass({ timeout: 15_000 });

      // Pas d'erreur JS fatale pendant le rendu de la vue.
      const fatal = errors.filter((e) => !/ResizeObserver|Non-Error/.test(e));
      expect(fatal, `${m.label} erreurs JS:\n${fatal.join('\n')}`).toEqual([]);
    });
  }

  test('Cacao Pro : diagnostic photo (et EUDR réel si déployé)', async ({ page }) => {
    await asAdmin(page);
    await page.goto('/');
    const globals = await page.evaluate(() => {
      try { localStorage.setItem('agroprix_user', JSON.stringify({ role: 'admin', email: 'qa@agroprix.test', name: 'QA' })); } catch (e) {}
      // @ts-ignore
      window.showView('cacao');
      // @ts-ignore — ouvrir l'onglet "Mon Dossier" (carte EUDR)
      if (typeof window.cacaoSwitchTab === 'function') window.cacaoSwitchTab('dossier');
      // @ts-ignore
      const AP = window.AgroPrix || {};
      return { diag: typeof AP.cacaoDiagPhoto === 'function', eudr: typeof AP.cacaoCheckEUDR === 'function', dds: typeof AP.cacaoExportDDS === 'function' };
    });

    // Diagnostic photo : live depuis v7.4 — toujours attendu.
    expect(globals.diag, 'cacaoDiagPhoto non exposé').toBe(true);

    // EUDR réel : v7.8. Si le déploiement (Vercel) n'a pas encore propagé, on
    // skip plutôt que d'échouer sur un simple décalage de cache CDN.
    if (!globals.eudr) {
      test.skip(true, 'cacao.js < 7.8 sur la prod (déploiement Vercel en cours) — EUDR pas encore servi');
    }
    expect(globals.dds, 'cacaoExportDDS non exposé').toBe(true);
    await expect(page.locator('#cacao-eudr-real')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator('#cacao-dds-btn')).toBeAttached();
  });

  test('Les 4 modules Pro sont dans le menu (showView résout une vraie vue)', async ({ page }) => {
    await asAdmin(page);
    await page.goto('/');
    const map = await page.evaluate(() => {
      // @ts-ignore
      const m = (window.AgroPrix && window.AgroPrix.viewIdMap) || {};
      return { cacao: m.cacao, tomate: m.tomate, hevea: m.hevea, plantain: m.plantain };
    });
    expect(map.cacao).toBe('viewCacao');
    expect(map.tomate).toBe('viewTomate');
    expect(map.hevea).toBe('viewHevea');
    expect(map.plantain).toBe('viewPlantain');
    for (const id of ['#viewCacao', '#viewTomate', '#viewHevea', '#viewPlantain']) {
      await expect(page.locator(id)).toBeAttached();
    }
  });
});
