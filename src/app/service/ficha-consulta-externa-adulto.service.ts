import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { FichaConsultaExternaAdulto, FichaConsultaExternaAdultoRequest } from '../models/ficha-consulta-externa-adulto.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class FichaConsultaExternaAdultoService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/fichas-consulta-externa`;

  // GET .../por-cita/{idCita} — null si esta cita todavía no tiene ficha.
  RetornarPorCita(idCita: number): Observable<FichaConsultaExternaAdulto | null> {
    return this.http.get<ApiResponse<FichaConsultaExternaAdulto | null>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? null),
      catchError(this.errorService.handleError),
    );
  }

  crear(ficha: FichaConsultaExternaAdultoRequest): Observable<FichaConsultaExternaAdulto> {
    return this.http.post<ApiResponse<FichaConsultaExternaAdulto>>(this.apiUrl, ficha).pipe(
      map((resp) => resp.datos as FichaConsultaExternaAdulto),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(idFicha: number, ficha: FichaConsultaExternaAdultoRequest): Observable<FichaConsultaExternaAdulto> {
    return this.http.put<ApiResponse<FichaConsultaExternaAdulto>>(`${this.apiUrl}/${idFicha}`, ficha).pipe(
      map((resp) => resp.datos as FichaConsultaExternaAdulto),
      catchError(this.errorService.handleError),
    );
  }
}
