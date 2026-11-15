import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import {
  FichaConsultaExternaPediatrica,
  FichaConsultaExternaPediatricaRequest,
} from '../models/ficha-consulta-externa-pediatrica.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class FichaConsultaExternaPediatricaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/fichas-consulta-externa-pediatrica`;

  // GET .../por-cita/{idCita} — null si esta cita todavía no tiene ficha.
  RetornarPorCita(idCita: number): Observable<FichaConsultaExternaPediatrica | null> {
    return this.http.get<ApiResponse<FichaConsultaExternaPediatrica | null>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? null),
      catchError(this.errorService.handleError),
    );
  }

  crear(ficha: FichaConsultaExternaPediatricaRequest): Observable<FichaConsultaExternaPediatrica> {
    return this.http.post<ApiResponse<FichaConsultaExternaPediatrica>>(this.apiUrl, ficha).pipe(
      map((resp) => resp.datos as FichaConsultaExternaPediatrica),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(idFicha: number, ficha: FichaConsultaExternaPediatricaRequest): Observable<FichaConsultaExternaPediatrica> {
    return this.http.put<ApiResponse<FichaConsultaExternaPediatrica>>(`${this.apiUrl}/${idFicha}`, ficha).pipe(
      map((resp) => resp.datos as FichaConsultaExternaPediatrica),
      catchError(this.errorService.handleError),
    );
  }
}
