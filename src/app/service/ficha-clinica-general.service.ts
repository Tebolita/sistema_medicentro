import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { FichaClinicaGeneral, FichaClinicaGeneralRequest } from '../models/ficha-clinica-general.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class FichaClinicaGeneralService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/fichas-clinica-general`;

  // GET .../por-cita/{idCita} — null si esta cita todavía no tiene ficha.
  RetornarPorCita(idCita: number): Observable<FichaClinicaGeneral | null> {
    return this.http.get<ApiResponse<FichaClinicaGeneral | null>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? null),
      catchError(this.errorService.handleError),
    );
  }

  crear(ficha: FichaClinicaGeneralRequest): Observable<FichaClinicaGeneral> {
    return this.http.post<ApiResponse<FichaClinicaGeneral>>(this.apiUrl, ficha).pipe(
      map((resp) => resp.datos as FichaClinicaGeneral),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(idFicha: number, ficha: FichaClinicaGeneralRequest): Observable<FichaClinicaGeneral> {
    return this.http.put<ApiResponse<FichaClinicaGeneral>>(`${this.apiUrl}/${idFicha}`, ficha).pipe(
      map((resp) => resp.datos as FichaClinicaGeneral),
      catchError(this.errorService.handleError),
    );
  }
}
