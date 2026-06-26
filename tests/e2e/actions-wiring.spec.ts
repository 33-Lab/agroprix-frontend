/**
 * QA — Câblage de la délégation d'événements (CSP Phase 2).
 *
 * Garde statique : TOUTE action référencée dans le code via data-action(-change/
 * -submit/-enter)="nom" doit avoir un handler enregistré dans AP.actions.
 * Détecte les data-action orphelins (typo, action oubliée) sur l'ensemble du
 * code (index.html + js/*.js), à chaque PR. Lit les fichiers du dépôt (pas la
 * prod) → fonctionne en CI sur le code de la branche.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('aucun data-action orphelin (tout est enregistré dans AP.actions)', () => {
  const root = path.resolve(__dirname, '..', '..');
  const files = [
    path.join(root, 'index.html'),
    ...fs.readdirSync(path.join(root, 'js'))
      .filter((f) => f.endsWith('.js'))
      .map((f) => path.join(root, 'js', f)),
  ];

  const used = new Set<string>();
  const reg = new Set<string>();
  const reUsed = /data-action(?:-change|-submit|-enter|-input)?="([a-z0-9-]+)"/g;
  const reReg = /AP\.actions\[['"]([a-z0-9-]+)['"]\]\s*=/g;

  for (const fp of files) {
    const t = fs.readFileSync(fp, 'utf8');
    for (const m of t.matchAll(reUsed)) used.add(m[1]);
    for (const m of t.matchAll(reReg)) reg.add(m[1]);
  }

  // Enregistrements via boucles dans actions.js.src (non capturés par reReg).
  const src = fs.readFileSync(path.join(root, 'js', 'actions.js.src'), 'utf8');
  for (const m of src.matchAll(/'([a-z0-9-]+)'\s*:\s*'[A-Za-z]+'/g)) reg.add(m[1]); // SIMPLE_GLOBALS
  for (const c of ['hevea', 'plantain', 'cacao', 'tomate']) {
    for (const suf of ['toggle-ia', 'ask-ia', 'diag-photo']) reg.add(`${c}-${suf}`);
  }

  const orphans = [...used].filter((a) => !reg.has(a)).sort();
  expect(orphans, `data-action sans handler AP.actions: ${orphans.join(', ')}`).toEqual([]);
  // garde-fou : on doit bien trouver des actions (sinon regex cassée)
  expect(used.size).toBeGreaterThan(20);
});
