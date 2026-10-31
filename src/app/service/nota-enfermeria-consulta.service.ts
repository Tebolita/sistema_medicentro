import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { NotaEnfermeriaConsulta, NotaEnfermeriaConsultaRequest } from '../models/nota-enfermeria-consulta.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class NotaEnfermeriaConsultaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/notas-enfermeria-consulta`;

  RetornarPorCita(idCita: number): Observable<NotaEnfermeriaConsulta[]> {
    return this.http.get<ApiResponse<NotaEnfermeriaConsulta[]>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? []),
      catchError(this.errorService.handleError),
    );
  }

  crear(nota: NotaEnfermeriaConsultaRequest): Observable<NotaEnfermeriaConsulta> {
    return this.http.post<ApiResponse<NotaEnfermeriaConsulta>>(this.apiUrl, nota).pipe(
      map((resp) => resp.datos as NotaEnfermeriaConsulta),
      catchError(this.errorService.handleError),
    );
  }

  eliminar(idNotaEnfermeriaConsulta: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${idNotaEnfermeriaConsulta}`).pipe(
      catchError(this.errorService.handleError),
    );
  }
}
