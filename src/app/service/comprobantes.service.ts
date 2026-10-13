import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

interface SubidaComprobanteResp {
  exito: boolean;
  mensaje: string;
  datos: { url: string } | null;
}

interface ComprobanteUrlResp {
  exito: boolean;
  mensaje: string;
  datos: { url: string | null } | null;
}

// Sube comprobantes de pago (fotos de recibo/voucher) al servidor propio de
// esta app (src/server.ts, endpoint Express con multer), NO al backend
// .NET: por eso la URL es relativa y no lleva https://localhost:7086. El
// archivo se guarda en `public/uploads/comprobantes` y queda accesible en
// `/uploads/comprobantes/<archivo>`.
@Injectable({ providedIn: 'root' })
export class ComprobantesService {
  private http = inject(HttpClient);

  // `idFactura`: si ya existe (edición), el archivo se guarda como
  // "factura-<id>.<ext>" en vez de un nombre al azar — más corto (ayuda al
  // límite de 200 caracteres de la descripción) y estable, así que volver a
  // subir para la misma factura reemplaza el comprobante anterior en vez de
  // acumular archivos sueltos. Sin id (factura nueva, aún sin guardar) el
  // servidor genera un nombre al azar. Importante: `idFactura` se agrega
  // ANTES que `archivo` en el FormData porque el servidor lee los campos en
  // el orden en que llegan y necesita saberlo antes de procesar el archivo.
  subir(archivo: File, idFactura?: number): Observable<string> {
    const formData = new FormData();
    if (idFactura) {
      formData.append('idFactura', String(idFactura));
    }
    formData.append('archivo', archivo);
    return this.http.post<SubidaComprobanteResp>('/api/uploads/comprobante', formData).pipe(
      map((resp) => {
        if (!resp.exito || !resp.datos) {
          throw new Error(resp.mensaje || 'No se pudo subir el archivo.');
        }
        return resp.datos.url;
      }),
      catchError((err: HttpErrorResponse) => {
        const mensaje = err.error?.mensaje || 'No se pudo subir el archivo. Intenta de nuevo.';
        return throwError(() => new Error(mensaje));
      }),
    );
  }

  // Respaldo para facturas de antes de la columna comprobante_url: busca por
  // convención de nombre de archivo ("factura-<id>.<ext>") en el servidor
  // Node. Las facturas nuevas ya traen la URL directo en la factura.
  buscar(idFactura: number): Observable<string | null> {
    return this.http.get<ComprobanteUrlResp>(`/api/uploads/comprobante/${idFactura}`).pipe(
      map((resp) => resp.datos?.url ?? null),
      catchError(() => [null]),
    );
  }

  // Una factura nueva no tiene id todavía cuando se sube el comprobante, así
  // que queda con un nombre al azar; una vez el backend crea la factura y
  // devuelve su id real, esto renombra el archivo a "factura-<id>.<ext>".
  confirmar(nombreTemporal: string, idFactura: number): Observable<string> {
    return this.http
      .post<ComprobanteUrlResp>('/api/uploads/comprobante/confirmar', { nombreTemporal, idFactura })
      .pipe(
        map((resp) => {
          if (!resp.exito || !resp.datos?.url) {
            throw new Error(resp.mensaje || 'No se pudo confirmar el comprobante.');
          }
          return resp.datos.url;
        }),
        catchError((err: HttpErrorResponse) => {
          const mensaje = err.error?.mensaje || 'No se pudo confirmar el comprobante.';
          return throwError(() => new Error(mensaje));
        }),
      );
  }

  // Borra el archivo físico del servidor (no solo el valor en la base de
  // datos). Se usa al quitar un comprobante ya guardado, para que no quede
  // huérfano y lo siga mostrando la búsqueda de respaldo de buscar().
  eliminar(idFactura: number): Observable<void> {
    return this.http.delete<ComprobanteUrlResp>(`/api/uploads/comprobante/${idFactura}`).pipe(
      map(() => undefined),
      catchError((err: HttpErrorResponse) => {
        const mensaje = err.error?.mensaje || 'No se pudo borrar el comprobante.';
        return throwError(() => new Error(mensaje));
      }),
    );
  }

  // El nombre del archivo subido viaja dentro de la URL que devuelve
  // `subir()` ("/uploads/comprobantes/<archivo>?v=..."); `confirmar()` lo
  // necesita suelto, sin la ruta ni el "?v=" de caché.
  nombreDesdeUrl(url: string): string {
    return url.split('/').pop()!.split('?')[0];
  }
}
