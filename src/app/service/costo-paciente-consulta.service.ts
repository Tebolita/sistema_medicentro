import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { CostoPacienteConsulta, CostoPacienteConsultaRequest } from '../models/costo-paciente-consulta.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class CostoPacienteConsultaService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/costos-paciente-consulta`;

  RetornarPorCita(idCita: number): Observable<CostoPacienteConsulta[]> {
    return this.http.get<ApiResponse<CostoPacienteConsulta[]>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? []),
      catchError(this.errorService.handleError),
    );
  }

  crear(costo: CostoPacienteConsultaRequest): Observable<CostoPacienteConsulta> {
    return this.http.post<ApiResponse<CostoPacienteConsulta>>(this.apiUrl, costo).pipe(
      map((resp) => resp.datos as CostoPacienteConsulta),
      catchError(this.errorService.handleError),
    );
  }

  eliminar(idCostoPacienteConsulta: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${idCostoPacienteConsulta}`).pipe(
      catchError(this.errorService.handleError),
    );
  }
}
