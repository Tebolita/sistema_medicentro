import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { VacunaAplicada, VacunaAplicadaRequest } from '../models/vacuna-aplicada.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class VacunaAplicadaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/vacunas-aplicadas`;

  RetornarPorCita(idCita: number): Observable<VacunaAplicada[]> {
    return this.http.get<ApiResponse<VacunaAplicada[]>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? []),
      catchError(this.errorService.handleError),
    );
  }

  crear(vacuna: VacunaAplicadaRequest): Observable<VacunaAplicada> {
    return this.http.post<ApiResponse<VacunaAplicada>>(this.apiUrl, vacuna).pipe(
      map((resp) => resp.datos as VacunaAplicada),
      catchError(this.errorService.handleError),
    );
  }

  eliminar(idVacunaAplicada: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${idVacunaAplicada}`).pipe(
      catchError(this.errorService.handleError),
    );
  }
}
