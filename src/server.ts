import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import multer from 'multer';
import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Comprobantes de pago (recibos/vouchers) que se suben desde el formulario
 * de factura. Se guardan en `public/uploads/comprobantes`, resuelto desde
 * el directorio donde se ejecuta el proceso (la raíz del proyecto tanto en
 * `ng serve` como al correr el server compilado), y se sirven aparte con su
 * propio `express.static` para no depender de que ese archivo ya estuviera
 * copiado en `dist/.../browser` al momento del build.
 */
const uploadsDir = join(process.cwd(), 'public', 'uploads', 'comprobantes');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const TIPOS_PERMITIDOS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

// El id de la factura llega como campo de texto ANTES del archivo en el
// FormData (ver ComprobantesService.subir en el frontend, que lo agrega
// primero a propósito): multer va llenando `req.body` a medida que procesa
// las partes del multipart, así que para cuando corren estos callbacks del
// archivo ya está disponible. Con factura conocida (edición), el nombre es
// "factura-<id>.<ext>" — corto (ayuda a no exceder el límite de la
// descripción, ver comprobante-descripcion.util.ts) y estable, así que
// volver a subir para la misma factura reemplaza el archivo anterior en vez
// de acumular archivos sueltos. Sin id (factura nueva, todavía sin guardar)
// se usa un nombre al azar, porque el id real no existe hasta que el
// backend crea la factura.
function nombreBase(req: express.Request): string | null {
  const idFactura = req.body?.idFactura;
  return typeof idFactura === 'string' && /^\d+$/.test(idFactura) ? `factura-${idFactura}` : null;
}

// Busca en la carpeta un archivo "<base>.<ext>" (cualquiera de las
// extensiones permitidas). No hay tabla en el backend .NET para el
// comprobante de una factura (ver comprobante-descripcion.util.ts en el
// frontend, que antes empalmaba la URL en la descripción); en vez de pedirle
// al backend que la guarde, la relación factura↔comprobante vive solo en el
// nombre del archivo ("factura-<id>.<ext>"), así que para saber si una
// factura tiene comprobante basta con mirar la carpeta.
function buscarArchivoPorBase(base: string): string | null {
  try {
    return readdirSync(uploadsDir).find((nombre) => nombre.startsWith(`${base}.`)) ?? null;
  } catch {
    return null;
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      // Si ya había un comprobante para esta factura (con otra extensión,
      // p. ej. se cambió de foto a PDF), se borra antes de guardar el nuevo.
      // Este borrado es "best effort": si falla (en Windows, `public/` lo
      // vigila el dev server de Angular para el live-reload y puede dejar
      // el archivo bloqueado un instante) NO debe tumbar el servidor — acá
      // adentro una excepción no atrapada mata el proceso completo, porque
      // ocurre dentro de un callback interno de multer que Express no
      // puede envolver en un try/catch de la ruta.
      const base = nombreBase(req);
      if (base) {
        try {
          for (const nombre of readdirSync(uploadsDir)) {
            if (nombre.startsWith(`${base}.`)) {
              try {
                unlinkSync(join(uploadsDir, nombre));
              } catch (err) {
                console.warn(`No se pudo borrar el comprobante anterior "${nombre}" (se sigue de largo):`, err);
              }
            }
          }
        } catch (err) {
          console.warn('No se pudo leer la carpeta de comprobantes (se sigue de largo):', err);
        }
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${nombreBase(req) ?? randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(extname(file.originalname).toLowerCase())) {
      cb(new Error('Solo se aceptan imágenes (JPG, PNG, WEBP) o PDF.'));
      return;
    }
    cb(null, true);
  },
});

app.post('/api/uploads/comprobante', (req, res) => {
  upload.single('archivo')(req, res, (err: unknown) => {
    if (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo subir el archivo.';
      res.status(400).json({ exito: false, mensaje, datos: null });
      return;
    }
    if (!req.file) {
      res.status(400).json({ exito: false, mensaje: 'No se recibió ningún archivo.', datos: null });
      return;
    }
    // El nombre puede repetirse entre una subida y otra (factura-42.jpg
    // reemplaza a factura-42.jpg); el "?v=" evita que el navegador siga
    // mostrando la versión vieja desde su caché.
    res.json({
      exito: true,
      mensaje: 'Archivo subido correctamente',
      datos: { url: `/uploads/comprobantes/${req.file.filename}?v=${Date.now()}` },
    });
  });
});

/**
 * Dado un id de factura, dice si tiene comprobante guardado (mirando la
 * carpeta, sin tocar el backend .NET) y su URL si existe.
 */
app.get('/api/uploads/comprobante/:idFactura', (req, res) => {
  const { idFactura } = req.params;
  if (!/^\d+$/.test(idFactura)) {
    res.status(400).json({ exito: false, mensaje: 'Id de factura inválido.', datos: null });
    return;
  }
  const nombre = buscarArchivoPorBase(`factura-${idFactura}`);
  res.json({
    exito: true,
    mensaje: '',
    datos: { url: nombre ? `/uploads/comprobantes/${nombre}?v=${Date.now()}` : null },
  });
});

// Nombre temporal que `filename()` le pone a un comprobante subido antes de
// que la factura exista (randomUUID() + extensión); solo eso se deja pasar a
// `confirmar` para no permitir nombres de archivo arbitrarios.
const NOMBRE_TEMPORAL_VALIDO = /^[0-9a-f-]+\.(jpe?g|png|webp|pdf)$/i;

/**
 * Una factura nueva no tiene id todavía cuando se sube el comprobante, así
 * que el archivo queda con un nombre al azar; una vez el backend .NET crea
 * la factura y devuelve su id real, el frontend llama aquí para renombrarlo
 * a "factura-<id>.<ext>" y que quede con el mismo nombre estable que usan
 * las ediciones.
 */
app.post('/api/uploads/comprobante/confirmar', express.json(), (req, res) => {
  const { nombreTemporal, idFactura } = req.body ?? {};
  if (typeof nombreTemporal !== 'string' || !NOMBRE_TEMPORAL_VALIDO.test(nombreTemporal)) {
    res.status(400).json({ exito: false, mensaje: 'Nombre de archivo inválido.', datos: null });
    return;
  }
  if (typeof idFactura !== 'number' || !Number.isInteger(idFactura) || idFactura <= 0) {
    res.status(400).json({ exito: false, mensaje: 'Id de factura inválido.', datos: null });
    return;
  }
  const origen = join(uploadsDir, nombreTemporal);
  if (!existsSync(origen)) {
    res.status(404).json({ exito: false, mensaje: 'No se encontró el archivo subido.', datos: null });
    return;
  }
  const base = `factura-${idFactura}`;
  const existente = buscarArchivoPorBase(base);
  if (existente) {
    try {
      unlinkSync(join(uploadsDir, existente));
    } catch (err) {
      console.warn(`No se pudo borrar el comprobante anterior "${existente}" (se sigue de largo):`, err);
    }
  }
  const destino = join(uploadsDir, `${base}${extname(nombreTemporal)}`);
  try {
    renameSync(origen, destino);
  } catch (err) {
    console.warn('No se pudo renombrar el comprobante temporal:', err);
    res.status(500).json({ exito: false, mensaje: 'No se pudo confirmar el comprobante.', datos: null });
    return;
  }
  res.json({
    exito: true,
    mensaje: 'Comprobante confirmado',
    datos: { url: `/uploads/comprobantes/${base}${extname(nombreTemporal)}?v=${Date.now()}` },
  });
});

/**
 * Sirve los comprobantes subidos, aparte de /browser (ver comentario arriba).
 */
app.use('/uploads/comprobantes', express.static(uploadsDir, { maxAge: '1y' }));

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
