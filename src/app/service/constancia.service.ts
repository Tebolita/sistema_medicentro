import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { ConstanciaMedica, ConstanciaMedicaRequest } from '../models/constancia.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class ConstanciaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/constancias-medicas`;

  // GET /api/constancias-medicas/por-cita/{idCita} — null si esta cita todavía no tiene una.
  RetornarPorCita(idCita: number): Observable<ConstanciaMedica | null> {
    return this.http.get<ApiResponse<ConstanciaMedica | null>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? null),
      catchError(this.errorService.handleError),
    );
  }

  crear(constancia: ConstanciaMedicaRequest): Observable<ConstanciaMedica> {
    return this.http.post<ApiResponse<ConstanciaMedica>>(this.apiUrl, constancia).pipe(
      map((resp) => resp.datos as ConstanciaMedica),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(idConstancia: number, constancia: ConstanciaMedicaRequest): Observable<ConstanciaMedica> {
    return this.http.put<ApiResponse<ConstanciaMedica>>(`${this.apiUrl}/${idConstancia}`, constancia).pipe(
      map((resp) => resp.datos as ConstanciaMedica),
      catchError(this.errorService.handleError),
    );
  }
}
