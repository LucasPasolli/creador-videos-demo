// pruebas/presupuesto-prueba.js
// Prueba del flujo "Crear presupuesto" SIN efectos. Solo valida selectores.

import { chromium } from 'playwright';        // Motor de navegador Chromium
import path from 'path';                      // Utilidad para armar rutas de archivos
import { pathToFileURL } from 'url';          // Convierte una ruta de Windows en URL file:///
import { config } from '../src/config.js';    // Tu configuración (URL, usuario, clave, datos demo)

const rutaPdf = path.resolve('salida', 'presupuesto.pdf');   // Dónde se guarda el PDF
const rutaError = path.resolve('salida', 'error.png');       // Captura si algo falla

// Cantidades que se cargan en cada producto, en orden
const cantidades = ['3', '5', '7'];

// slowMo: 400 agrega 0,4 s de pausa entre acciones para poder seguir lo que pasa
const browser = await chromium.launch({ headless: false, slowMo: 400 });

const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },     // Tamaño solo para la prueba
  acceptDownloads: true,                      // Permite recibir la descarga del PDF
});
const page = await context.newPage();         // Abre una pestaña

// filaProducto(n): devuelve la fila n de productos (0 = primera, 1 = segunda...)
// Una "fila de producto" es cualquier fila de tabla que contenga un campo con placeholder "ID"
const filaProducto = (n) =>
  page.getByRole('row')
      .filter({ has: page.getByPlaceholder('ID') })
      .nth(n);

// cargarCantidad(n, valor): escribe la cantidad en la fila n
// La cantidad es siempre el PRIMER campo de texto de la fila
const cargarCantidad = async (n, valor) => {
  await filaProducto(n).getByRole('textbox').first().fill(valor);
};

try {
  // ---------- LOGIN ----------
  await page.goto(`${config.baseUrl}/login`);
  await page.getByRole('textbox', { name: 'Usuario' }).fill(config.user);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(config.pass);
  await page.getByRole('textbox', { name: 'Contraseña' }).press('Enter');
  await page.waitForURL(url => !url.pathname.includes('login'));   // Espera a salir del login

  // ---------- IR AL PRESUPUESTADOR ----------
  // exact: true => solo el enlace cuyo nombre es EXACTAMENTE "Presupuestador" (menú lateral)
  await page.getByRole('link', { name: 'Presupuestador', exact: true }).click();

  // ---------- CLIENTE ----------
  await page.getByRole('textbox', { name: 'Buscá por nombre o ID...' }).fill(config.demo.cliente);
  await page.getByRole('button', { name: new RegExp(config.demo.cliente, 'i') }).click();

  // ---------- MEDIO DE PAGO ----------
  await page.getByRole('button', { name: /Transferencia/ }).click();

  // ---------- PRODUCTO 1 (por nombre) ----------
  await page.getByRole('textbox', { name: 'Nombre del producto...' }).fill('casco');
  await page.getByRole('button', { name: new RegExp(config.demo.productos[0].buscar) }).click();
  await cargarCantidad(0, cantidades[0]);                                  // Cantidad: 3

  // ---------- PRODUCTO 2 (por nombre) ----------
  await page.getByRole('button', { name: 'Agregar ítem' }).last().click(); // REVISAR: .nth(1)
  await filaProducto(1).getByPlaceholder('Nombre del producto...').fill('manguera de');
  await page.getByRole('button', { name: new RegExp(config.demo.productos[1].buscar) }).click();
  await cargarCantidad(1, cantidades[1]);                                  // Cantidad: 5

  // ---------- PRODUCTO 3 (por ID) ----------
  await page.getByRole('button', { name: 'Agregar ítem' }).last().click(); // REVISAR: .nth(1)
  await filaProducto(2).getByPlaceholder('ID').fill(config.demo.productos[2].codigo);
  await cargarCantidad(2, cantidades[2]);                                  // Cantidad: 7

  // ---------- GUARDAR ----------
  await page.getByRole('button', { name: 'Guardar Presupuesto' }).click();

  // ---------- DESCARGAR PDF ----------
  const descargaPromesa = page.waitForEvent('download');     // Se prepara ANTES del clic
  await page.getByRole('button', { name: 'Descargar PDF del Presupuesto' }).click();
  const descarga = await descargaPromesa;
  await descarga.saveAs(rutaPdf);

  // ---------- MOSTRAR EL PDF ----------
  await page.goto(pathToFileURL(rutaPdf).href);              // Abre el PDF en el visor de Chromium
  await page.waitForTimeout(10000);                          // 10 segundos a la vista

} catch (error) {
  console.error('\n❌ El script falló:\n', error.message);
  await page.screenshot({ path: rutaError });                // Captura del momento del fallo
  console.log('Captura guardada en:', rutaError);
  console.log('El navegador queda abierto 60 segundos para que veas dónde se trabó...');
  await page.waitForTimeout(60000);
} finally {
  await browser.close();                                     // Siempre cierra al final
}