import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { OrdenMedicaConsulta, OrdenMedicaConsultaRequest } from '../models/orden-medica-consulta.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class OrdenMedicaConsultaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/ordenes-medicas-consulta`;

  RetornarPorCita(idCita: number): Observable<OrdenMedicaConsulta[]> {
    return this.http.get<ApiResponse<OrdenMedicaConsulta[]>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? []),
      catchError(this.errorService.handleError),
    );
  }

  crear(orden: OrdenMedicaConsultaRequest): Observable<OrdenMedicaConsulta> {
    return this.http.post<ApiResponse<OrdenMedicaConsulta>>(this.apiUrl, orden).pipe(
      map((resp) => resp.datos as OrdenMedicaConsulta),
      catchError(this.errorService.handleError),
    );
  }

  eliminar(idOrdenMedicaConsulta: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${idOrdenMedicaConsulta}`).pipe(
      catchError(this.errorService.handleError),
    );
  }
}
