import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { PolizaSeguro, PolizaRequest } from "../models/seguro.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class PolizaService {
    private apiUrl = 'https://localhost:7086/api/Polizas';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/Polizas
    // Solo pólizas activas, de la más reciente a la más antigua.
    RetornarPolizas(): Observable<ApiResponse<PolizaSeguro[]>> {
        return this.http.get<ApiResponse<PolizaSeguro[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/Polizas/{id}
    RetornarPoliza(idPoliza: number): Observable<ApiResponse<PolizaSeguro>> {
        return this.http.get<ApiResponse<PolizaSeguro>>(`${this.apiUrl}/${idPoliza}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/Polizas
    // El paciente y la aseguradora deben existir, o el backend responde 404.
    CrearPoliza(poliza: PolizaRequest): Observable<ApiResponse<PolizaSeguro>> {
        return this.http.post<ApiResponse<PolizaSeguro>>(this.apiUrl, poliza).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Polizas/{id}
    ActualizarPoliza(idPoliza: number, poliza: PolizaRequest): Observable<ApiResponse<PolizaSeguro>> {
        return this.http.put<ApiResponse<PolizaSeguro>>(`${this.apiUrl}/${idPoliza}`, poliza).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Polizas/{id}
    // Borrado lógico: el backend marca el registro con activo = false.
    EliminarPoliza(idPoliza: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idPoliza}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}