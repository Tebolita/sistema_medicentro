import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { ControlSignosConsulta, ControlSignosConsultaRequest } from '../models/control-signos-consulta.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class ControlSignosConsultaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/control-signos-consulta`;

  RetornarPorCita(idCita: number): Observable<ControlSignosConsulta[]> {
    return this.http.get<ApiResponse<ControlSignosConsulta[]>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? []),
      catchError(this.errorService.handleError),
    );
  }

  crear(control: ControlSignosConsultaRequest): Observable<ControlSignosConsulta> {
    return this.http.post<ApiResponse<ControlSignosConsulta>>(this.apiUrl, control).pipe(
      map((resp) => resp.datos as ControlSignosConsulta),
      catchError(this.errorService.handleError),
    );
  }

  eliminar(idControlSignosConsulta: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${idControlSignosConsulta}`).pipe(
      catchError(this.errorService.handleError),
    );
  }
}
