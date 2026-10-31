import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { NotaEvolucionConsulta, NotaEvolucionConsultaRequest } from '../models/nota-evolucion-consulta.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class NotaEvolucionConsultaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/notas-evolucion-consulta`;

  RetornarPorCita(idCita: number): Observable<NotaEvolucionConsulta[]> {
    return this.http.get<ApiResponse<NotaEvolucionConsulta[]>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? []),
      catchError(this.errorService.handleError),
    );
  }

  crear(nota: NotaEvolucionConsultaRequest): Observable<NotaEvolucionConsulta> {
    return this.http.post<ApiResponse<NotaEvolucionConsulta>>(this.apiUrl, nota).pipe(
      map((resp) => resp.datos as NotaEvolucionConsulta),
      catchError(this.errorService.handleError),
    );
  }

  eliminar(idNotaEvolucionConsulta: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${idNotaEvolucionConsulta}`).pipe(
      catchError(this.errorService.handleError),
    );
  }
}
