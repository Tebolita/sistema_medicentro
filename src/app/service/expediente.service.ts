import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { HistorialClinico, HistorialClinicoRequest } from "../models/tratamiento.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class ExpedienteService {
    private apiUrl = 'https://localhost:7086/api/expedientes';

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

}