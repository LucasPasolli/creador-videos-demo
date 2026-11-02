const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext({
    viewport: {
      height: 720,
      width: 1280
    }
  });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/');
  await page.goto('http://localhost:5173/login');
  await page.getByRole('textbox', { name: 'Usuario' }).fill('lucas');
  await page.getByRole('textbox', { name: 'Usuario' }).press('Tab');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('lucas4369!');
  await page.getByRole('textbox', { name: 'Contraseña' }).press('Enter');
  await page.getByRole('link', { name: 'Presupuestador Creá nuevos' }).click();
  await page.getByRole('textbox', { name: 'Buscá por nombre o ID...' }).click();
  await page.getByRole('textbox', { name: 'Buscá por nombre o ID...' }).fill('martin bustos');
  await page.getByRole('button', { name: 'MARTIN BUSTOS ID #30 ·' }).click();
  await page.getByRole('button', { name: 'Transferencia 5% descuento' }).click();
  await page.getByRole('textbox', { name: 'Nombre del producto...' }).click();
  await page.getByRole('textbox', { name: 'Nombre del producto...' }).fill('casco');
  await page.getByRole('button', { name: 'Casco de Seguridad #198 · $' }).click();
  await page.getByRole('textbox').first().click();
  await page.getByRole('textbox').first().click();
  await page.getByRole('textbox').first().fill('2');
  await page.getByRole('button', { name: 'Agregar ítem' }).nth(1).click();
  await page.getByRole('row', { name: '1 — — $ 0,00' }).getByPlaceholder('Nombre del producto...').click();
  await page.getByRole('row', { name: '1 — — $ 0,00' }).getByPlaceholder('Nombre del producto...').fill('manguera de');
  await page.getByRole('button', { name: 'Manguera de Jardín 25 m #208 · $' }).click();
  await page.getByRole('button', { name: 'Agregar ítem' }).nth(1).click();
  await page.getByRole('row', { name: '1 — — $ 0,00' }).getByPlaceholder('ID').click();
  await page.getByRole('row', { name: '1 — — $ 0,00' }).getByPlaceholder('ID').fill('212');
  await page.locator('input[type="text"]').nth(4).click();
  await page.locator('input[type="text"]').nth(4).fill('10');
  await page.getByRole('button', { name: 'Guardar Presupuesto' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar PDF del Presupuesto' }).click();
  const download = await downloadPromise;
  await page.close();

  // ---------------------
  await context.storageState({ path: 'auth.json' });
  await context.close();
  await browser.close();
})();