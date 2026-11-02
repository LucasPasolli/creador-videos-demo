// src/helpers.js
// Funciones auxiliares compartidas por todos los módulos de demo:
// cursor falso, movimiento suave, click, type, scroll, pausa y visor de PDF.

import fs from 'node:fs';                      // NUEVO: para leer el PDF
import { config } from './config.js';          // Tus tiempos y tamaño de pantalla

const { timing, viewport } = config;           // Atajos para escribir menos

// Última posición conocida del cursor. Empieza en el centro de la pantalla.
let pos = { x: viewport.width / 2, y: viewport.height / 2 };

// ---------------------------------------------------------------
// instalarCursor: dibuja el cursor falso en TODAS las páginas del contexto
// ---------------------------------------------------------------
export async function instalarCursor(context, vp = viewport) {
  pos = { x: vp.width / 2, y: vp.height / 2 };   // Reinicia la posición al centro

  // Todo lo de adentro corre en el NAVEGADOR, no en Node.
  await context.addInitScript(() => {
    if (window.top !== window) return;            // Ignora iframes

    const iniciar = () => {
      if (document.getElementById('cursor-demo')) return;   // Evita crearlo dos veces

      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;
      try {
        const guardada = sessionStorage.getItem('cursor-demo-pos');
        if (guardada) { const p = JSON.parse(guardada); x = p.x; y = p.y; }
      } catch {}

      const cursor = document.createElement('div');
      cursor.id = 'cursor-demo';
      cursor.style.cssText =
        'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;';

      cursor.innerHTML =
        '<svg width="28" height="28" viewBox="0 0 28 28" ' +
        'style="position:absolute;left:0;top:0;transform-origin:2px 2px;' +
        'filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">' +
        '<path d="M2 2 L2 22 L7.5 17.2 L11 25 L14.2 23.6 L10.8 15.9 L18 15.9 Z" ' +
        'fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';

      document.documentElement.appendChild(cursor);
      const flecha = cursor.firstChild;

      // mover: coloca el cursor en (nx, ny) y recuerda la posición
      const mover = (nx, ny) => {
        x = nx; y = ny;
        cursor.style.transform = `translate(${x}px, ${y}px)`;
        try { sessionStorage.setItem('cursor-demo-pos', JSON.stringify({ x, y })); } catch {}
      };
      mover(x, y);

      // NUEVO: expone "mover" para que Node pueda recolocar el cursor tras una recarga
      window.__cursorMover = mover;

      document.addEventListener('mousemove', (e) => mover(e.clientX, e.clientY), true);

      document.addEventListener('mousedown', () => {
        flecha.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.82)' }],
          { duration: 120, fill: 'forwards' });

        const onda = document.createElement('div');
        onda.style.cssText =
          `position:fixed;left:${x - 18}px;top:${y - 18}px;width:36px;height:36px;` +
          'border-radius:50%;border:3px solid rgba(255,120,60,.9);' +
          'background:rgba(255,120,60,.25);pointer-events:none;z-index:2147483646;';
        document.documentElement.appendChild(onda);
        onda.animate(
          [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }],
          { duration: 500, easing: 'ease-out' }
        ).onfinish = () => onda.remove();
      }, true);

      document.addEventListener('mouseup', () => {
        flecha.animate([{ transform: 'scale(0.82)' }, { transform: 'scale(1)' }],
          { duration: 150, fill: 'forwards' });
      }, true);
    };

    if (document.documentElement) iniciar();
    document.addEventListener('DOMContentLoaded', iniciar);
  });

  // NUEVO: cada vez que una página termina de cargar, Node coloca el cursor
  // falso en la última posición real. Así nunca "salta" al medio.
  context.on('page', (p) => {
    p.on('domcontentloaded', async () => {
      try {
        await p.evaluate(([px, py]) => window.__cursorMover?.(px, py), [pos.x, pos.y]);
      } catch {}                                  // Si la página se cierra justo, se ignora
    });
  });
}

// ---------------------------------------------------------------
// pausa: espera una cantidad de milisegundos
// ---------------------------------------------------------------
export const pausa = (page, ms = timing.readPause) => page.waitForTimeout(ms);

// ---------------------------------------------------------------
// facilitar: curva "seno" (easeInOutSine). Es más gradual que la cúbica,
// así el cursor arranca y frena sin tirones.
const facilitar = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// ---------------------------------------------------------------
// moverA: lleva el cursor a (x, y) siguiendo una curva suave
// ---------------------------------------------------------------
export async function moverA(page, x, y, duracionMax = timing.moveDuration) {
  const inicio = { ...pos };
  const dx = x - inicio.x;
  const dy = y - inicio.y;
  const distancia = Math.hypot(dx, dy);
  if (distancia < 1) return;

  // Mínimo 400 ms y 0,8 ms por píxel: recorridos más pausados
  const ms = Math.max(400, Math.min(duracionMax, distancia * 0.8));

  const cx = inicio.x + dx / 2 - (dy / distancia) * distancia * 0.12;
  const cy = inicio.y + dy / 2 + (dx / distancia) * distancia * 0.12;

  const pasos = Math.max(12, Math.round(ms / 16));
  for (let i = 1; i <= pasos; i++) {
    const t = facilitar(i / pasos);
    const u = 1 - t;
    const px = u * u * inicio.x + 2 * u * t * cx + t * t * x;
    const py = u * u * inicio.y + 2 * u * t * cy + t * t * y;
    await page.mouse.move(px, py);
    await page.waitForTimeout(ms / pasos);
  }
  pos = { x, y };
}

// ---------------------------------------------------------------
// centroDe: espera a que el elemento sea visible y devuelve el centro de su caja
// ---------------------------------------------------------------
async function centroDe(locator) {
  await locator.waitFor({ state: 'visible' });
  await locator.scrollIntoViewIfNeeded();
  const caja = await locator.boundingBox();
  return { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };
}

// ---------------------------------------------------------------
// click: mueve el cursor al elemento y hace clic
// ---------------------------------------------------------------
export async function click(page, locator, opciones = {}) {
  const { x, y } = await centroDe(locator);
  await moverA(page, x, y);
  await pausa(page, timing.beforeClick);
  await page.mouse.down();
  await pausa(page, 80);
  await page.mouse.up();
  await pausa(page, opciones.despues ?? timing.afterClick);
}

// ---------------------------------------------------------------
// type: clic en el campo, borra lo que tenga y tipea a velocidad pareja
// ---------------------------------------------------------------
export async function type(page, locator, texto, opciones = {}) {
  await click(page, locator, { despues: 150 });
  if (opciones.limpiar !== false) {
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
  }
  await page.keyboard.type(texto, { delay: timing.typeDelay });
  await pausa(page, timing.afterClick);
}

// ---------------------------------------------------------------
// scroll: desplaza la página suavemente (positivo = abajo)
// ---------------------------------------------------------------
export async function scroll(page, pixeles, duracion = 1000) {
  const pasos = Math.max(10, Math.round(duracion / 16));
  let enviado = 0;
  for (let i = 1; i <= pasos; i++) {
    const objetivo = Math.round(pixeles * facilitar(i / pasos));
    const delta = objetivo - enviado;
    if (delta !== 0) await page.mouse.wheel(0, delta);
    enviado = objetivo;
    await page.waitForTimeout(duracion / pasos);
  }
  await pausa(page, timing.afterClick);
}

// ---------------------------------------------------------------
// NUEVO: mostrarPdf: muestra un PDF guardado en disco sobre la pantalla,
// dentro del video. Lo lee en Node, lo pasa al navegador como base64,
// crea una URL temporal (blob) y lo muestra en un visor flotante.
// ---------------------------------------------------------------
export async function mostrarPdf(page, ruta, ms = 4000) {
  const base64 = fs.readFileSync(ruta).toString('base64');   // Lee el PDF en Node

  // Esto corre en el NAVEGADOR
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));   // base64 -> bytes
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));

    // Fondo oscuro que cubre toda la pantalla
    const fondo = document.createElement('div');
    fondo.id = 'pdf-demo';
    fondo.style.cssText =
      'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.75);' +
      'display:flex;align-items:center;justify-content:center;';

    // Visor del PDF (sin barra de herramientas, ajustado al ancho)
    const visor = document.createElement('iframe');
    visor.src = url + '#toolbar=0&navpanes=0&view=FitH';
    visor.style.cssText =
      'width:min(900px,70vw);height:92vh;border:0;border-radius:8px;background:#fff;' +
      'box-shadow:0 20px 60px rgba(0,0,0,.6);';

    fondo.appendChild(visor);
    document.documentElement.appendChild(fondo);
  }, base64);

  await page.waitForTimeout(ms);                                   // Lo deja a la vista
  await page.evaluate(() => document.getElementById('pdf-demo')?.remove());   // Lo cierra
}