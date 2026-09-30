import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { Sala, SalaRequest } from "../models/cita.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class SalaService {
    private apiUrl = 'https://localhost:7086/api/Salas';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/Salas
    RetornarSalas(): Observable<ApiResponse<Sala[]>> {
        return this.http.get<ApiResponse<Sala[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/Salas/{id}
    RetornarSala(idSala: number): Observable<ApiResponse<Sala>> {
        return this.http.get<ApiResponse<Sala>>(`${this.apiUrl}/${idSala}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/Salas
    // La capacidad mínima es 1.
    CrearSala(sala: SalaRequest): Observable<ApiResponse<Sala>> {
        return this.http.post<ApiResponse<Sala>>(this.apiUrl, sala).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Salas/{id}
    ActualizarSala(idSala: number, sala: SalaRequest): Observable<ApiResponse<Sala>> {
        return this.http.put<ApiResponse<Sala>>(`${this.apiUrl}/${idSala}`, sala).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Salas/{id}
    // Borrado lógico: el backend marca el registro con activo = false.
    EliminarSala(idSala: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idSala}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}