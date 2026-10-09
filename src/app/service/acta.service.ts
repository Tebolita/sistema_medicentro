import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { Acta, ActaRequest } from "../models/acta.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class ActaService {
    private apiUrl = 'https://localhost:7086/api/Actas';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/Actas
    // Solo actas activas, de la más reciente a la más antigua.
    RetornarActas(): Observable<ApiResponse<Acta[]>> {
        return this.http.get<ApiResponse<Acta[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/Actas/{id}
    RetornarActa(idActa: number): Observable<ApiResponse<Acta>> {
        return this.http.get<ApiResponse<Acta>>(`${this.apiUrl}/${idActa}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/Actas
    // El paciente y el empleado (idAtendidoPor) deben existir, o el backend responde 404.
    CrearActa(acta: ActaRequest): Observable<ApiResponse<Acta>> {
        return this.http.post<ApiResponse<Acta>>(this.apiUrl, acta).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/Actas/{id}
    // Si no se manda fechaHora, el backend conserva la que ya tenía.
    ActualizarActa(idActa: number, acta: ActaRequest): Observable<ApiResponse<Acta>> {
        return this.http.put<ApiResponse<Acta>>(`${this.apiUrl}/${idActa}`, acta).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/Actas/{id}
    // Borrado lógico: el backend marca el registro con activo = false
    // (la tabla además bloquea el borrado físico con un trigger).
    EliminarActa(idActa: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idActa}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}