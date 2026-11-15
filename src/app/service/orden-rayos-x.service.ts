import { environment } from '../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { OrdenRayosX, OrdenRayosXRequest } from '../models/orden-rayos-x.model';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

@Injectable({ providedIn: 'root' })
export class OrdenRayosXService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/ordenes-rayos-x`;

  // GET .../por-cita/{idCita} — null si esta cita todavía no tiene orden.
  RetornarPorCita(idCita: number): Observable<OrdenRayosX | null> {
    return this.http.get<ApiResponse<OrdenRayosX | null>>(`${this.apiUrl}/por-cita/${idCita}`).pipe(
      map((resp) => resp.datos ?? null),
      catchError(this.errorService.handleError),
    );
  }

  crear(orden: OrdenRayosXRequest): Observable<OrdenRayosX> {
    return this.http.post<ApiResponse<OrdenRayosX>>(this.apiUrl, orden).pipe(
      map((resp) => resp.datos as OrdenRayosX),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(idOrdenRayosX: number, orden: OrdenRayosXRequest): Observable<OrdenRayosX> {
    return this.http.put<ApiResponse<OrdenRayosX>>(`${this.apiUrl}/${idOrdenRayosX}`, orden).pipe(
      map((resp) => resp.datos as OrdenRayosX),
      catchError(this.errorService.handleError),
    );
  }
}
