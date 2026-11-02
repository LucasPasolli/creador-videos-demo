// src/modules/presupuestador.js
// Video de demo del módulo Presupuestador:
// crear presupuesto con cliente existente, 3 productos, guardar y descargar PDF.

import fs from 'node:fs';                                  // Para crear carpetas y revisar archivos
import { chromium } from 'playwright';                     // El navegador automatizado
import { config } from '../config.js';                     // Tus datos y tiempos
import { instalarCursor, click, type, pausa, mostrarPdf } from '../helpers.js';

// Atajos a lo que vamos a usar de config.js
const { baseUrl, viewport, videosRawDir, demo, timing } = config;
const [prod1, prod2, prod3] = demo.productos;              // Los 3 productos de demo

// ---- Valores que dependen de tu ERP (ajustalos si hace falta) ----
const CANTIDAD_PROD1 = '2';   // Cantidad del primer producto
const VALOR_EXTRA = '10';     // El valor que escribiste en el 5.º campo de texto (ver nota abajo)

// ---- Sesión guardada: usa la de config; si no existe, usa auth.json ----
const sesion = fs.existsSync(config.authFile) ? config.authFile : 'auth.json';

// ---- 1. Abrir el navegador ----
const browser = await chromium.launch({ headless: false });   // Ventana visible

// ---- 2. Crear el contexto: sesión + grabación de video ----
const context = await browser.newContext({
  viewport,                                   // 1920x1080
  storageState: sesion,                       // Entra ya logueado
  recordVideo: { dir: videosRawDir, size: viewport },   // Graba el video en videos/raw
  acceptDownloads: true,                      // Permite descargar el PDF
});

await instalarCursor(context);                // Cursor falso en todas las páginas
const page = await context.newPage();         // Abre la pestaña (acá empieza el video)
// Diagnóstico: imprime en la terminal cada cambio de URL de la página
page.on('framenavigated', (f) => {
  if (f === page.mainFrame()) console.log('NAVEGÓ A:', f.url());
});

// ---- 3. Ir al ERP y entrar al Presupuestador ----
await page.goto(baseUrl);
await pausa(page, timing.readPause);          // Deja ver la pantalla inicial
await click(page, page.getByRole('link', { name: 'Presupuestador Creá nuevos' }));
await pausa(page, 800);

// ---- 4. Elegir el cliente ----
await type(page, page.getByRole('textbox', { name: 'Buscá por nombre o ID...' }), demo.cliente);
await click(page, page.getByRole('button', { name: demo.cliente }).first());

// ---- 5. Elegir forma de pago ----
await click(page, page.getByRole('button', { name: 'Transferencia 5% descuento' }));

// ---- 6. Producto 1: buscar por nombre, elegir y poner cantidad ----
await type(page, page.getByRole('textbox', { name: 'Nombre del producto...' }), prod1.buscar);
await click(page, page.getByRole('button', { name: `${prod1.buscar} #${prod1.codigo}` }));
await type(page, page.getByRole('textbox').first(), CANTIDAD_PROD1);

// ---- 7. Producto 2: agregar fila nueva y buscar por nombre ----
await click(page, page.getByRole('button', { name: 'Agregar ítem' }).nth(1));
const filaVacia = page.getByRole('row', { name: '1 — — $ 0,00' });   // La fila nueva, todavía vacía
await type(page, filaVacia.getByPlaceholder('Nombre del producto...'), prod2.buscar);
await click(page, page.getByRole('button', { name: `${prod2.buscar} #${prod2.codigo}` }));

// ---- 8. Producto 3: agregar fila nueva y cargar por ID ----
await click(page, page.getByRole('button', { name: 'Agregar ítem' }).nth(1));
await type(page, filaVacia.getByPlaceholder('ID'), prod3.codigo);
await type(page, page.locator('input[type="text"]').nth(4), VALOR_EXTRA);

// ---- 9. Guardar el presupuesto ----
await click(page, page.getByRole('button', { name: 'Guardar Presupuesto' }), { despues: 1200 });

// ---- 10. Descargar el PDF ----
// Hay que "escuchar" la descarga ANTES de hacer clic, si no se pierde.
const descarga = page.waitForEvent('download');
await click(page, page.getByRole('button', { name: 'Descargar PDF del Presupuesto' }));
const archivo = await descarga;
fs.mkdirSync('salida', { recursive: true });               // Crea la carpeta si no existe
await archivo.saveAs('salida/presupuesto.pdf');            // Guarda el PDF

await mostrarPdf(page, 'salida/presupuesto.pdf', 4500);   // Muestra el PDF generado en el video
await pausa(page, 500);                                    // Pequeña pausa final

// ---- 11. Cerrar y guardar el video ----
const video = page.video();                   // Referencia al video de esta página
await context.close();                        // IMPORTANTE: el video se termina de escribir al cerrar
await video.saveAs(`${videosRawDir}/presupuestador.webm`);  // Nombre final y ordenado
await browser.close();

console.log('Listo: videos/raw/presupuestador.webm y salida/presupuesto.pdf');