// src/prueba.js: prueba del cursor falso (no graba video)

import { chromium } from 'playwright';                        // Playwright
import { instalarCursor, moverA, scroll, pausa } from './helpers.js';  // Tus helpers

// Abre Chromium con ventana visible
const browser = await chromium.launch({ headless: false });

// Contexto = perfil de navegador limpio. Carga la sesión guardada (ya logueado).
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  storageState: 'auth.json',
});

await instalarCursor(context);               // Cursor falso en todas las páginas
const page = await context.newPage();        // Abre una pestaña
await page.goto('http://localhost:5173');    // Va al ERP

await pausa(page, 1000);
await moverA(page, 400, 300);
await moverA(page, 1500, 800);
await moverA(page, 960, 200);
await scroll(page, 400);
await pausa(page, 1000);

await browser.close();