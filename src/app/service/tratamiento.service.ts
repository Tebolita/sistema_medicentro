import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import {
    TratamientoCompleto,
    TratamientoRequest,
    TratamientoSeguimiento,
    SeguimientoRequest,
} from "../models/tratamiento.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class TratamientoService {
    private apiUrl = 'https://localhost:7086/api/Tratamientos';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // ==================== TRATAMIENTOS ====================

    // GET /api/Tratamientos
    // Solo tratamientos activos, cada uno con sus seguimientos.
    RetornarTratamientos(): Observable<ApiResponse<TratamientoCompleto[]>> {
        return this.http.get<ApiResponse<TratamientoCompleto[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/Tratamientos/{id}
    // Devuelve { tratamiento, seguimientos }.
    RetornarTratamiento(idTratamiento: number): Observable<ApiResponse<TratamientoCompleto>> {
        return this.http.get<ApiResponse<TratamientoCompleto>>(`${this.apiUrl}/${idTratamiento}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/Tratamientos
    CrearTratamiento(tratamiento: TratamientoRequest): Observable<ApiResponse<TratamientoCompleto>> {
        return this.http.post<ApiResponse<TratamientoCompleto>>(this.apiUrl, tratamiento).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Tratamientos/{id}
    // Solo actualiza los datos del tratamiento; los seguimientos no se tocan.
    ActualizarTratamiento(idTratamiento: number, tratamiento: TratamientoRequest): Observable<ApiResponse<TratamientoCompleto>> {
        return this.http.put<ApiResponse<TratamientoCompleto>>(`${this.apiUrl}/${idTratamiento}`, tratamiento).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Tratamientos/{id}
    // Borrado lógico.
    EliminarTratamiento(idTratamiento: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idTratamiento}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // ==================== SEGUIMIENTOS ====================

    // POST /api/Tratamientos/{id}/seguimientos
    CrearSeguimiento(idTratamiento: number, seguimiento: SeguimientoRequest): Observable<ApiResponse<TratamientoSeguimiento>> {
        return this.http.post<ApiResponse<TratamientoSeguimiento>>(`${this.apiUrl}/${idTratamiento}/seguimientos`, seguimiento).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Tratamientos/{id}/seguimientos/{idSeguimiento}
    ActualizarSeguimiento(idTratamiento: number, idSeguimiento: number, seguimiento: SeguimientoRequest): Observable<ApiResponse<TratamientoSeguimiento>> {
        return this.http.put<ApiResponse<TratamientoSeguimiento>>(`${this.apiUrl}/${idTratamiento}/seguimientos/${idSeguimiento}`, seguimiento).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Tratamientos/{id}/seguimientos/{idSeguimiento}
    // Borrado lógico.
    EliminarSeguimiento(idTratamiento: number, idSeguimiento: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idTratamiento}/seguimientos/${idSeguimiento}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}