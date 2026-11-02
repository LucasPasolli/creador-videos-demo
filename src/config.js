// Importa dotenv: lee el archivo .env y carga sus valores
// en process.env (así no escribimos la contraseña en el código).
import 'dotenv/config';

export const config = {
  // URL base del ERP. Si no está en .env, usa localhost:5173.
  baseUrl: process.env.BASE_URL || 'http://localhost:5173',

  // Credenciales de la cuenta de demo, leídas desde .env.
  user: process.env.DEMO_USER,
  pass: process.env.DEMO_PASS,

  // Tamaño de la ventana y del video (Full HD).
  viewport: { width: 1280, height: 720 },

  // Archivo donde se guarda la sesión de login (ver Paso 8).
  authFile: '.auth/state.json',

  // Carpetas de salida de los videos.
  videosRawDir: 'videos/raw',
  videosFinalDir: 'videos/final',

  // Ritmo del video, en milisegundos. Ajustando estos números
  // hacés todos los videos más rápidos o más lentos.
  // Ritmo del video, en milisegundos (punto medio entre lento y rápido).
  timing: {
    typeDelay: 55,          // pausa entre cada letra al tipear
    afterClick: 450,        // pausa después de cada clic
    beforeClick: 180,       // pausa justo antes de hacer clic
    moveDuration: 1000,     // duración máxima de un movimiento de cursor
    readPause: 1200,        // pausa para que se lea la pantalla
  },
  // Datos que se usan en los videos.
  demo: {
    cliente: 'MARTIN BUSTOS',
    productos: [
      { buscar: 'Casco de Seguridad', codigo: '198' },
      { buscar: 'Manguera de Jardín 25 m', codigo: '208' },
      { buscar: 'Tijera de Podar', codigo: '212' },
    ],
  },
};