import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { IndicadorClinico, IndicadorFinanciero } from '../models/reporte.model';

// GET /api/reportes/indicadores-clinicos y .../indicadores-financieros
// todavía NO existen en el backend — las vistas SQL que los respaldan
// (vw_indicadores_clinicos / vw_indicadores_financieros) ya están creadas
// en la base, solo falta que el backend las exponga. Ver
// SOLICITUD_REPORTERIA_Y_MODULO_CATALOGOS.md. El componente que usa este
// servicio distingue "el backend respondió 404/sin ruta" de "sí respondió,
// pero no hay datos en el rango" para no confundir los dos casos.
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/reportes`;

  indicadoresClinicos(desde: string | null, hasta: string | null): Observable<IndicadorClinico[]> {
    return this.http
      .get<ApiResponse<IndicadorClinico[]>>(`${this.apiUrl}/indicadores-clinicos`, {
        params: this.rangoParams(desde, hasta),
      })
      .pipe(map((resp) => resp.datos ?? []));
  }

  indicadoresFinancieros(desde: string | null, hasta: string | null): Observable<IndicadorFinanciero[]> {
    return this.http
      .get<ApiResponse<IndicadorFinanciero[]>>(`${this.apiUrl}/indicadores-financieros`, {
        params: this.rangoParams(desde, hasta),
      })
      .pipe(map((resp) => resp.datos ?? []));
  }

  private rangoParams(desde: string | null, hasta: string | null): HttpParams {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return params;
  }
}
