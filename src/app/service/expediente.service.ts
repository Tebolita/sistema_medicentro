import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable } from "rxjs";

import { HistorialClinico, HistorialClinicoRequest } from "../models/tratamiento.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

// BitacoraDto real (BitacoraAuditoriaController), igual que en los demás
// servicios que ya muestran historial de auditoría (compromisos de pago,
// hospitalizaciones, laboratorio).
export interface BitacoraItem {
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

@Injectable({
    providedIn: 'root'
})
export class ExpedienteService {
    private apiUrl = 'https://localhost:7086/api/expedientes';
    private apiUrlBitacora = 'https://localhost:7086/api/bitacora-auditoria';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/expedientes
    // Solo registros activos, del más reciente al más antiguo.
    RetornarExpedientes(): Observable<ApiResponse<HistorialClinico[]>> {
        return this.http.get<ApiResponse<HistorialClinico[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/expedientes/{id}
    RetornarExpediente(idHistorial: number): Observable<ApiResponse<HistorialClinico>> {
        return this.http.get<ApiResponse<HistorialClinico>>(`${this.apiUrl}/${idHistorial}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/expedientes
    // El paciente y el médico deben existir, o el backend responde 404.
    CrearExpediente(expediente: HistorialClinicoRequest): Observable<ApiResponse<HistorialClinico>> {
        return this.http.post<ApiResponse<HistorialClinico>>(this.apiUrl, expediente).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/expedientes/{id}
    ActualizarExpediente(idHistorial: number, expediente: HistorialClinicoRequest): Observable<ApiResponse<HistorialClinico>> {
        return this.http.put<ApiResponse<HistorialClinico>>(`${this.apiUrl}/${idHistorial}`, expediente).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/expedientes/{id}
    // Borrado lógico: el backend marca el registro con activo = false.
    EliminarExpediente(idHistorial: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idHistorial}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/expedientes/eliminados
    // Registros dados de baja (activo = false), misma forma que el listado normal.
    RetornarExpedientesEliminados(): Observable<ApiResponse<HistorialClinico[]>> {
        return this.http.get<ApiResponse<HistorialClinico[]>>(`${this.apiUrl}/eliminados`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/expedientes/{id}/reactivar
    // Deshace la baja lógica (activo = true).
    ReactivarExpediente(idHistorial: number): Observable<ApiResponse<object>> {
        return this.http.put<ApiResponse<object>>(`${this.apiUrl}/${idHistorial}/reactivar`, {}).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // =============================================================
    // BITÁCORA DE AUDITORÍA (tabla real: historial_clinico)
    // =============================================================

    // GET /api/bitacora-auditoria?tablaAfectada=historial_clinico
    // Todos los cambios (crear/modificar/eliminar) registrados para la tabla.
    RetornarBitacoraGeneral(tablaAfectada: string): Observable<BitacoraItem[]> {
        return this.http.get<ApiResponse<BitacoraItem[]>>(
            `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`,
        ).pipe(
            map((resp) => (resp.datos ?? []).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))),
            catchError(this.errorService.handleError),
        )
    }

    // Solo los cambios registrados para un registro específico.
    RetornarBitacoraPorRegistro(tablaAfectada: string, idRegistro: number): Observable<BitacoraItem[]> {
        return this.http.get<ApiResponse<BitacoraItem[]>>(
            `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`,
        ).pipe(
            map((resp) =>
                (resp.datos ?? [])
                    .filter((b) => b.idRegistroAfectado === idRegistro)
                    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
            ),
            catchError(this.errorService.handleError),
        )
    }

}