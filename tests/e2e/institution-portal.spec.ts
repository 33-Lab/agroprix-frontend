/**
 * QA — Portail institution (L4-L6).
 *
 * Vérifie dans un navigateur : un compte role="institution" est routé vers son
 * espace (L4), le portail rend ses onglets et la liste des demandeurs scorée
 * (L5), sans erreur JS. Les endpoints /api/institution-portal/* sont stubés.
 *
 * Cible BASE_URL (prod par défaut ; en local : BASE_URL=http://localhost:8099).
 * Garde `skip` : tant que AP.institution n'est pas déployé sur la cible, le test
 * se désactive (couverture active automatiquement après merge + déploiement).
 */
import { test, expect } from '@playwright/test';

async function asInstitution(page) {
  await page.addInitScript(() => {
    const u = { role: 'institution', email: 'banque@agroprix.test', name: 'Banque QA' };
    try {
      localStorage.setItem('agroprix_user', JSON.stringify(u));
      localStorage.setItem('agroprix_cgu_accepted', JSON.stringify({ acceptedAt: new Date().toISOString(), version: '1.0.0' }));
    } catch (e) {}
    const json = (body) => Promise.resolve(new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const orig = window.fetch;
    window.fetch = function (input) {
      const url = String(input);
      if (url.includes('/api/auth/me')) return json({ utilisateur: u });
      if (url.includes('/api/institution-portal/me')) {
        return json({
          account: { id: 1, email: u.email, name: u.name },
          institution: { institution_slug: 'qa_bank', institution_name: 'Banque QA', institution_type: 'bank', criteria: { min_total_score: 500, max_loan_fcfa: 1000000, dimensions: {} } },
        });
      }
      if (url.includes('/api/institution-portal/applicants/')) {
        return json({ user_id: 42, application: { status: 'pending', applied_at: '2026-06-27' }, profile: { name: 'Producteur Test', country: 'benin' }, score: { total_score: 640, eligible: true, min_total_score: 500, max_loan_fcfa: 1000000, dimensions: { profil_agricole: { raw: 700, weight: 0.25, passes_min: true }, sante_climat: { raw: 600, weight: 0.25, passes_min: true }, capacite_financiere: { excluded: true }, activite_commerciale: { raw: 650, weight: 0.25, passes_min: true } } } });
      }
      if (url.includes('/api/institution-portal/applicants')) {
        return json({ count: 1, institution_slug: 'qa_bank', applicants: [{ user_id: 42, name: 'Producteur Test', country: 'benin', status: 'pending', applied_at: '2026-06-27', score: { total_score: 640, eligible: true, min_total_score: 500, max_loan_fcfa: 1000000 } }] });
      }
      return orig.apply(this, arguments as any);
    };
  });
}

async function hasInstitution(page): Promise<boolean> {
  return page.evaluate(() => !!(window as any).AgroPrix
    && (window as any).AgroPrix.institution
    && typeof (window as any).AgroPrix.institution.init === 'function');
}

test('compte institution : routage + portail rend sans erreur', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await asInstitution(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  test.skip(!(await hasInstitution(page)), 'AP.institution pas encore déployé sur la cible');

  // L4 : l'entrée de nav institution est révélée.
  await expect(page.locator('#navInstitution')).toBeVisible();

  // L5 : le portail s'affiche avec ses onglets + la liste des demandeurs.
  await page.evaluate(() => (window as any).showView('institution'));
  await page.waitForTimeout(800);
  const content = page.locator('#institutionContent');
  await expect(content).toContainText('Demandeurs');
  await expect(content).toContainText('Critères');
  await expect(content).toContainText('Producteur Test'); // demandeur stubé
  await expect(content).toContainText('640');              // score calculé

  expect(errors, errors.join('\n')).toHaveLength(0);
});
