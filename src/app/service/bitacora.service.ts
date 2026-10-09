import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// BitacoraDto real (BitacoraAuditoriaController: solo lectura, como debe
// ser un log de auditoría). El backend ya trae máximo 500 filas por
// consulta (BitacoraAuditoriaService.ListarAsync) y las más recientes
// primero, así que no hace falta paginar del lado del frontend.
export interface RegistroBitacora {
  idBitacora: number;
  idUsuario: number | null;
  idTipoAccion: number;
  tablaAfectada: string;
  idRegistroAfectado: number | null;
  valoresAnteriores: string | null;
  valoresNuevos: string | null;
  ipOrigen: string | null;
  fechaHora: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = 'https://localhost:7086/api/bitacora-auditoria';

  listar(filtros: { tablaAfectada?: string; idUsuario?: number }): Observable<RegistroBitacora[]> {
    let params = new HttpParams();
    if (filtros.tablaAfectada) {
      params = params.set('tablaAfectada', filtros.tablaAfectada);
    }
    if (filtros.idUsuario != null) {
      params = params.set('idUsuario', filtros.idUsuario);
    }
    return this.http.get<ApiResponse<RegistroBitacora[]>>(this.apiUrl, { params }).pipe(
      map((resp) => resp.datos ?? []),
      catchError(this.errorService.handleError),
    );
  }
}
