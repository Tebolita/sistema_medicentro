import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable } from "rxjs";

import { EspecialidadMedica, EspecialidadRequest } from "../models/medico.model";

import { ApiResponse } from "../models/api-response.model";
import { ErrorService } from "./error.service";

@Injectable({
    providedIn: 'root'
})
export class EspecialidadService {
    private apiUrl = 'https://localhost:7086/api/especialidades';

    constructor(
        private http: HttpClient,
        private errorService: ErrorService
    ) {}

    // GET /api/especialidades
    RetornarEspecialidades(): Observable<ApiResponse<EspecialidadMedica[]>> {
        return this.http.get<ApiResponse<EspecialidadMedica[]>>(this.apiUrl).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // GET /api/especialidades/{id}
    RetornarEspecialidad(idEspecialidad: number): Observable<ApiResponse<EspecialidadMedica>> {
        return this.http.get<ApiResponse<EspecialidadMedica>>(`${this.apiUrl}/${idEspecialidad}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // POST /api/especialidades
    CrearEspecialidad(especialidad: EspecialidadRequest): Observable<ApiResponse<EspecialidadMedica>> {
        return this.http.post<ApiResponse<EspecialidadMedica>>(this.apiUrl, especialidad).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // PUT /api/especialidades/{id}
    ActualizarEspecialidad(idEspecialidad: number, especialidad: EspecialidadRequest): Observable<ApiResponse<EspecialidadMedica>> {
        return this.http.put<ApiResponse<EspecialidadMedica>>(`${this.apiUrl}/${idEspecialidad}`, especialidad).pipe(
            catchError(this.errorService.handleError)
        )
    }

    // DELETE /api/especialidades/{id}
    // Borrado lógico.
    EliminarEspecialidad(idEspecialidad: number): Observable<ApiResponse<object>> {
        return this.http.delete<ApiResponse<object>>(`${this.apiUrl}/${idEspecialidad}`).pipe(
            catchError(this.errorService.handleError)
        )
    }

}