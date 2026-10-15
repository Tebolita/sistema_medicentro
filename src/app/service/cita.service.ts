import { environment } from '../../environments/environment';
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable } from "rxjs";

import {
    CitaCompleta,
    CitaHistorial,
    CitaRequest,
    Recordatorio,
    RecordatorioRequest,
} from "../models/cita.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

// BitacoraDto real (BitacoraAuditoriaController), igual que en los demás
// servicios que ya muestran historial de auditoría (compromisos de pago,
// usuarios, etc.).
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
export class CitaService {
    private apiUrl = `${environment.apiUrl}/api/Citas`;
    private apiUrlRecordatorios = `${environment.apiUrl}/api/Recordatorios`;
    private apiUrlBitacora = `${environment.apiUrl}/api/bitacora-auditoria`;

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // ==================== CITAS ====================

    // GET /api/Citas
    // Solo citas activas, de la más reciente a la más antigua, cada una con su historial.
    RetornarCitas(): Observable<ApiResponse<CitaCompleta[]>> {
        return this.http.get<ApiResponse<CitaCompleta[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/Citas/{id}
    // Devuelve { cita, historial }.
    RetornarCita(idCita: number): Observable<ApiResponse<CitaCompleta>> {
        return this.http.get<ApiResponse<CitaCompleta>>(`${this.apiUrl}/${idCita}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/Citas
    CrearCita(cita: CitaRequest): Observable<ApiResponse<CitaCompleta>> {
        return this.http.post<ApiResponse<CitaCompleta>>(this.apiUrl, cita).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Citas/{id}
    // Si cambia el estado o el horario, el backend lo registra en el historial
    // usando `motivoCambio` como explicación.
    ActualizarCita(idCita: number, cita: CitaRequest): Observable<ApiResponse<CitaCompleta>> {
        return this.http.put<ApiResponse<CitaCompleta>>(`${this.apiUrl}/${idCita}`, cita).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Citas/{id}
    // Borrado lógico: el backend marca el registro con activo = false.
    EliminarCita(idCita: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idCita}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

        // GET /api/Citas/eliminadas
    // Citas dadas de baja (activo = false), misma forma { cita, historial } que el listado normal.
    RetornarCitasEliminadas(): Observable<ApiResponse<CitaCompleta[]>> {
        return this.http.get<ApiResponse<CitaCompleta[]>>(`${this.apiUrl}/eliminadas`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Citas/{id}/reactivar
    // Deshace la baja lógica (activo = true).
    ReactivarCita(idCita: number): Observable<ApiResponse<object>> {
        return this.http.put<ApiResponse<object>>(`${this.apiUrl}/${idCita}/reactivar`, {}).pipe(
            catchError(this.errorService.handleError)
        )
    }
    // GET /api/Citas/{id}/historial
    // Cambios de estado y reprogramaciones, del más reciente al más antiguo.
    RetornarHistorialCita(idCita: number): Observable<ApiResponse<CitaHistorial[]>> {
        return this.http.get<ApiResponse<CitaHistorial[]>>(`${this.apiUrl}/${idCita}/historial`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ==================== RECORDATORIOS ====================

    // GET /api/Citas/{id}/recordatorios
    // Recordatorios activos de una cita, ordenados por fecha programada.
    RetornarRecordatorios(idCita: number): Observable<ApiResponse<Recordatorio[]>> {
        return this.http.get<ApiResponse<Recordatorio[]>>(`${this.apiUrl}/${idCita}/recordatorios`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/Citas/{id}/recordatorios
    CrearRecordatorio(idCita: number, recordatorio: RecordatorioRequest): Observable<ApiResponse<Recordatorio>> {
        return this.http.post<ApiResponse<Recordatorio>>(`${this.apiUrl}/${idCita}/recordatorios`, recordatorio).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Citas/{id}/recordatorios/{idRecordatorio}
    ActualizarRecordatorio(idCita: number, idRecordatorio: number, recordatorio: RecordatorioRequest): Observable<ApiResponse<Recordatorio>> {
        return this.http.put<ApiResponse<Recordatorio>>(`${this.apiUrl}/${idCita}/recordatorios/${idRecordatorio}`, recordatorio).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Citas/{id}/recordatorios/{idRecordatorio}
    // Borrado lógico.
    EliminarRecordatorio(idCita: number, idRecordatorio: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idCita}/recordatorios/${idRecordatorio}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/Recordatorios/pendientes?horasAnticipacion=24
    // Recordatorios de todas las citas que vencen dentro de las próximas N horas.
    RetornarRecordatoriosPendientes(horasAnticipacion: number = 24): Observable<ApiResponse<Recordatorio[]>> {
        return this.http.get<ApiResponse<Recordatorio[]>>(`${this.apiUrlRecordatorios}/pendientes?horasAnticipacion=${horasAnticipacion}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // =============================================================
    // BITÁCORA DE AUDITORÍA
    // =============================================================

    // GET /api/bitacora-auditoria?tablaAfectada=citas
    // Todos los cambios (crear/modificar/eliminar) de la tabla `citas`.
    RetornarBitacoraGeneral(tablaAfectada: string): Observable<BitacoraItem[]> {
        return this.http
            .get<ApiResponse<BitacoraItem[]>>(
                `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`,
            )
            .pipe(
                map((resp) => (resp.datos ?? []).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))),
                catchError(this.errorService.handleError),
            );
    }

    // Igual que RetornarBitacoraGeneral, filtrado a un solo registro (una sola cita).
    RetornarBitacoraPorRegistro(tablaAfectada: string, idRegistro: number): Observable<BitacoraItem[]> {
        return this.http
            .get<ApiResponse<BitacoraItem[]>>(
                `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`,
            )
            .pipe(
                map((resp) =>
                    (resp.datos ?? [])
                        .filter((b) => b.idRegistroAfectado === idRegistro)
                        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
                ),
                catchError(this.errorService.handleError),
            );
    }

}