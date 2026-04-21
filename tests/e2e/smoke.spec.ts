import { test, expect } from '@playwright/test';

/**
 * Smoke tests — garantissent que le frontend se charge et que les ecrans
 * critiques sont presents. Non-destructif : pas de submit, pas de compte cree.
 */

test.describe('Frontend smoke', () => {
  test('homepage loads and auth screen is reachable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/');
    await expect(page).toHaveTitle(/AgroPrix/i);

    // L'auth screen est injecte tot : soit affiche, soit accessible via #authScreen
    const authScreen = page.locator('#authScreen');
    await expect(authScreen).toBeAttached();

    // Aucune erreur JS fatale au boot
    expect(errors, `Erreurs JS au boot:\n${errors.join('\n')}`).toEqual([]);
  });

  test('auth tabs Connexion / Inscription are wired', async ({ page }) => {
    await page.goto('/');
    // Force l'affichage de l'auth screen si l'app a deja un token en cache (CI = fresh)
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload();

    const loginTab = page.locator('#authTabLogin');
    const registerTab = page.locator('#authTabRegister');
    await expect(loginTab).toBeAttached();
    await expect(registerTab).toBeAttached();

    // Champ email du login present
    await expect(page.locator('#loginEmail')).toBeAttached();
  });

  test('service worker + manifest reachable (PWA basics)', async ({ request }) => {
    const manifest = await request.get('/manifest.json');
    expect(manifest.status()).toBe(200);
    const body = await manifest.json();
    expect(body.name || body.short_name).toBeTruthy();
  });
});
