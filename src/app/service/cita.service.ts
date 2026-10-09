import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import {
    CitaCompleta,
    CitaHistorial,
    CitaRequest,
    Recordatorio,
    RecordatorioRequest,
} from "../models/cita.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class CitaService {
    private apiUrl = 'https://localhost:7086/api/Citas';
    private apiUrlRecordatorios = 'https://localhost:7086/api/Recordatorios';

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

}