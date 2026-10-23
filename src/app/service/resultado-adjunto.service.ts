import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

interface SubidaResp {
  exito: boolean;
  mensaje: string;
  datos: { url: string } | null;
}

// Sube el archivo adjunto (PDF/imagen) de un resultado de examen al
// servidor propio de esta app (src/server.ts), igual que comprobantes de
// pago — no al backend .NET. Ver ResultadoDialog.
@Injectable({ providedIn: 'root' })
export class ResultadoAdjuntoService {
  private http = inject(HttpClient);

  subir(archivo: File): Observable<string> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<SubidaResp>('/api/uploads/resultado-laboratorio', formData).pipe(
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
}
